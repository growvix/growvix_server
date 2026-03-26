import { mailTemplateService } from '../services/mailTemplate.service.js';
import { ApiResponse, AppError } from '../utils/apiResponse.util.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

export const mailTemplateController = {
    // POST /api/mail/templates
    create: async (req, res) => {
        try {
            const { templateName, projectId, description, subject, editorType, body } = req.body;
            const organization = req.query.organization || req.body.organization || req.user?.organization;

            if (!templateName || !subject || !organization) {
                return res.status(400).json(
                    ApiResponse.error('templateName, subject, and organization are required', 400)
                );
            }

            // Handle file uploads
            const attachments = req.files ? req.files.map(file => ({
                filename: file.originalname,
                url: `/uploads/mail-templates/${file.filename}`,
                type: file.mimetype
            })) : [];

            const template = await mailTemplateService.create(organization, {
                templateName,
                projectId: projectId || null,
                description,
                subject,
                editorType: 'design',
                body,
                attachments,
            });

            return res.status(201).json(
                ApiResponse.success('Template created successfully', template)
            );
        } catch (error) {
            console.error('Create template error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to create template', error.statusCode || 500)
            );
        }
    },

    // GET /api/mail/templates?organization=X
    getAll: async (req, res) => {
        try {
            const { organization } = req.query;
            if (!organization) {
                return res.status(400).json(
                    ApiResponse.error('organization query parameter is required', 400)
                );
            }

            const templates = await mailTemplateService.getAll(organization);
            return res.status(200).json(
                ApiResponse.success('Templates fetched successfully', templates)
            );
        } catch (error) {
            console.error('Get templates error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to fetch templates', error.statusCode || 500)
            );
        }
    },

    // GET /api/mail/templates/:id?organization=X
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const { organization } = req.query;
            if (!organization) {
                return res.status(400).json(
                    ApiResponse.error('organization query parameter is required', 400)
                );
            }

            const template = await mailTemplateService.getById(organization, id);
            return res.status(200).json(
                ApiResponse.success('Template fetched successfully', template)
            );
        } catch (error) {
            console.error('Get template error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to fetch template', error.statusCode || 500)
            );
        }
    },

    // PUT /api/mail/templates/:id
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { templateName, projectId, description, subject, editorType, body } = req.body;
            const organization = req.query.organization || req.body.organization || req.user?.organization;

            if (!organization) {
                return res.status(400).json(
                    ApiResponse.error('organization is required', 400)
                );
            }

            let updateData = { templateName, projectId: projectId || null, description, subject, editorType: 'design', body };

            // Handle file uploads if present
            if (req.files && req.files.length > 0) {
                const newAttachments = req.files.map((file) => ({
                    filename: file.originalname,
                    url: `/uploads/mail-templates/${file.filename}`,
                    type: file.mimetype
                }));
                updateData.attachments = [
                    ...(req.body.attachments || []), // Assuming existing attachments might be sent
                    ...newAttachments,
                ];
            }

            const template = await mailTemplateService.update(organization, id, updateData);
            return res.status(200).json(
                ApiResponse.success('Template updated successfully', template)
            );
        } catch (error) {
            console.error('Update template error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to update template', error.statusCode || 500)
            );
        }
    },

    // DELETE /api/mail/templates/:id
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const { organization } = req.query;

            if (!organization) {
                return res.status(400).json(
                    ApiResponse.error('organization query parameter is required', 400)
                );
            }

            await mailTemplateService.delete(organization, id);
            return res.status(200).json(
                ApiResponse.success('Template deleted successfully', null)
            );
        } catch (error) {
            console.error('Delete template error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to delete template', error.statusCode || 500)
            );
        }
    },
};
