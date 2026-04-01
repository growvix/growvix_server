import { getSourceModel } from '../models/source.model.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';

const SourceController = {
    createSource: async (req, res) => {
        try {
            const { name } = req.body;
            const organizationId = req.headers.organization || req.query.organization;

            if (!name) {
                return res.status(400).json({ success: false, message: 'Source name is required' });
            }

            if (!organizationId) {
                return res.status(400).json({ success: false, message: 'Organization is required' });
            }

            const orgConn = await getOrganizationConnection(organizationId);
            const SourceModel = getSourceModel(orgConn);

            const newSource = await SourceModel.create({
                name,
                organization: organizationId
            });

            return res.status(201).json({
                success: true,
                message: 'Source created successfully',
                data: newSource
            });
        } catch (error) {
            console.error('Error creating source:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    getSources: async (req, res) => {
        try {
            const organizationId = req.headers.organization || req.query.organization;

            if (!organizationId) {
                return res.status(400).json({ success: false, message: 'Organization is required' });
            }

            const orgConn = await getOrganizationConnection(organizationId);
            const SourceModel = getSourceModel(orgConn);

            const sources = await SourceModel.find({ organization: organizationId }).sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                data: sources
            });
        } catch (error) {
            console.error('Error fetching sources:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
};

export default SourceController;
