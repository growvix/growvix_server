import { leadService } from '../services/lead.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class LeadController {
    addLead = asyncHandler(async (req, res) => {
        const lead = await leadService.addLead(req.body);
        res.status(201).json(ApiResponse.success('Lead added successfully', lead));
    });

    getLeadByProfileId = asyncHandler(async (req, res) => {
        const { organization, profileId } = req.params;
        const lead = await leadService.getLeadById(organization, profileId);
        if (!lead) {
            return res.status(404).json(ApiResponse.error('Lead not found'));
        }
        res.status(200).json(ApiResponse.success('Lead fetched', { _id: lead._id, profile_id: lead.profile_id, name: lead.profile?.name || '', exe_user: lead.exe_user || '' }));
    });
}

export const leadController = new LeadController();
