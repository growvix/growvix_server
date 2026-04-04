import { leadService } from '../services/lead.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';
import xlsx from 'xlsx';

export class LeadController {
    addLead = asyncHandler(async (req, res) => {
        const lead = await leadService.addLead(req.body);
        res.status(201).json(ApiResponse.success('Lead added successfully', lead));
    });

    bulkUploadLeads = asyncHandler(async (req, res) => {
        const file = req.file;
        const { organization } = req.body;

        if (!file) {
            return res.status(400).json(ApiResponse.error('Excel file is required'));
        }
        if (!organization) {
            return res.status(400).json(ApiResponse.error('Organization is required'));
        }

        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel', // xls
            'text/csv' // csv
        ];

        if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
             return res.status(400).json(ApiResponse.error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'));
        }

        try {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });

            if (data.length === 0) {
                 return res.status(400).json(ApiResponse.error('File is empty or invalid'));
            }

            // Parse mapping and header options from frontend
            const hasHeader = req.body.hasHeader === 'true';
            const mappings = req.body.mappings ? JSON.parse(req.body.mappings) : null;

            const result = await leadService.bulkAddLeads(
                data, 
                organization, 
                req.user._id,
                { 
                    hasHeader, 
                    mappings,
                    fileName: file.originalname || 'Unknown',
                    initiatedByName: `${req.user.profile?.firstName || ''} ${req.user.profile?.lastName || ''}`.trim(),
                    initiatedByEmail: req.user.profile?.email || '',
                }
            );
            res.status(200).json(ApiResponse.success('Bulk upload completed', result));
        } catch (error) {
            console.error('Error in bulk upload:', error);
            res.status(500).json(ApiResponse.error(error.message || 'Failed to process the uploaded file'));
        }
    });

    getLeadByProfileId = asyncHandler(async (req, res) => {
        const { organization, profileId } = req.params;
        const lead = await leadService.getLeadById(organization, profileId);
        if (!lead) {
            return res.status(404).json(ApiResponse.error('Lead not found'));
        }
        res.status(200).json(ApiResponse.success('Lead fetched', { _id: lead._id, profile_id: lead.profile_id, name: lead.profile?.name || '', exe_user: lead.exe_user || '' }));
    });

    getBulkUploads = asyncHandler(async (req, res) => {
        const { organization } = req.params;
        if (!organization) {
            return res.status(400).json(ApiResponse.error('Organization is required'));
        }
        const uploads = await leadService.getBulkUploads(organization);
        res.status(200).json(ApiResponse.success('Bulk uploads fetched', { uploads }));
    });

    deleteLeadByProfileId = asyncHandler(async (req, res) => {
        const { organization, profileId } = req.params;
        const result = await leadService.deleteLeadByProfileId(organization, profileId);
        res.status(200).json(ApiResponse.success('Lead deleted successfully', result));
    });
}

export const leadController = new LeadController();

