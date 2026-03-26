import { mailConfigService } from '../services/mailConfig.service.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export const mailConfigController = {
    // POST /api/mail
    create: async (req, res) => {
        try {
            const { email, smtpCode, mailServer } = req.body;
            const organization = req.query.organization || req.body.organization || req.user?.organization;

            if (!email || !smtpCode || !mailServer || !organization) {
                return res.status(400).json(
                    ApiResponse.error('email, smtpCode, mailServer, and organization are required', 400)
                );
            }

            const config = await mailConfigService.create(organization, {
                email,
                smtpCode,
                mailServer,
            });

            return res.status(201).json(
                ApiResponse.success('Mail config created successfully', config)
            );
        } catch (error) {
            console.error('Create mail config error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to create mail config', error.statusCode || 500)
            );
        }
    },

    // GET /api/mail?organization=X
    getAll: async (req, res) => {
        try {
            const organization = req.query.organization || req.body.organization || req.user?.organization;
            if (!organization) {
                return res.status(400).json(
                    ApiResponse.error('organization is required', 400)
                );
            }

            const configs = await mailConfigService.getAll(organization);
            return res.status(200).json(
                ApiResponse.success('Mail configs fetched successfully', configs)
            );
        } catch (error) {
            console.error('Get mail configs error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to fetch mail configs', error.statusCode || 500)
            );
        }
    },

    // GET /api/mail/:id?organization=X
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const organization = req.query.organization || req.body.organization || req.user?.organization;
            if (!organization) {
                return res.status(400).json(
                    ApiResponse.error('organization is required', 400)
                );
            }

            const config = await mailConfigService.getById(organization, id);
            return res.status(200).json(
                ApiResponse.success('Mail config fetched successfully', config)
            );
        } catch (error) {
            console.error('Get mail config error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to fetch mail config', error.statusCode || 500)
            );
        }
    },

    // PUT /api/mail/:id
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { email, smtpCode, mailServer } = req.body;
            const organization = req.query.organization || req.body.organization || req.user?.organization;

            if (!organization) {
                return res.status(400).json(
                    ApiResponse.error('organization is required', 400)
                );
            }

            const updateData = { email, smtpCode, mailServer };

            const config = await mailConfigService.update(organization, id, updateData);
            return res.status(200).json(
                ApiResponse.success('Mail config updated successfully', config)
            );
        } catch (error) {
            console.error('Update mail config error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to update mail config', error.statusCode || 500)
            );
        }
    },

    // DELETE /api/mail/:id
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const organization = req.query.organization || req.body.organization || req.user?.organization;

            if (!organization) {
                return res.status(400).json(
                    ApiResponse.error('organization is required', 400)
                );
            }

            await mailConfigService.delete(organization, id);
            return res.status(200).json(
                ApiResponse.success('Mail config deleted successfully', null)
            );
        } catch (error) {
            console.error('Delete mail config error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to delete mail config', error.statusCode || 500)
            );
        }
    },
};
