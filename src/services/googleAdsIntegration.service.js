import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getGoogleAdIntegrationModel } from '../models/googleAdIntegration.model.js';
import { getGoogleMappingModel } from '../models/googleMapping.model.js';
import { getCampaignModel } from '../models/campaign.model.js';
import { getProjectModel } from '../models/project.model.js';
import { GoogleForm } from '../models/googleForm.model.js';
import { AppError } from '../utils/apiResponse.util.js';
import crypto from 'crypto';

/**
 * Generate a unique secret key for webhook authentication
 */
const generateSecretKey = () => {
    return 'gf_' + crypto.randomBytes(16).toString('hex');
};

export class GoogleAdsIntegrationService {
    async createIntegration(data, userId) {
        const { organization, campaign_id, source, sub_source, project_id, form_id } = data;

        if (!organization) throw new AppError('Organization is required', 400);
        if (!campaign_id) throw new AppError('Campaign ID is required', 400);
        if (!source) throw new AppError('Source is required', 400);
        if (!sub_source) throw new AppError('Sub-source (Form Name) is required', 400);
        if (!project_id) throw new AppError('Project ID is required', 400);
        if (!form_id) throw new AppError('Form ID is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const GoogleAdIntegration = getGoogleAdIntegrationModel(orgConn);

            // Check if form_id already exists for this campaign
            const existing = await GoogleAdIntegration.findOne({ campaign_id, form_id, organization });
            if (existing) {
                throw new AppError('This Form ID is already integrated with the selected campaign', 400);
            }

            // Auto-generate secret key
            const secret_key = data.secret_key || generateSecretKey();

            const integration = await GoogleAdIntegration.create({
                ...data,
                secret_key,
                created_by: userId
            });

            // Save to global google_form collection for webhook lookup
            await GoogleForm.create({
                secret_key,
                form_id,
                organization,
                integration_id: String(integration._id),
                label: sub_source,
            });

            // Create empty mapping document in tenant DB
            const GoogleMapping = getGoogleMappingModel(orgConn);
            await GoogleMapping.create({
                integration_id: integration._id,
                form_id,
                organization,
                field_mapping: [],
                test_data: null,
            });

            return integration;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to create integration: ' + err.message, 500);
        }
    }

    async getIntegrations(organization) {
        if (!organization) throw new AppError('Organization is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const GoogleAdIntegration = getGoogleAdIntegrationModel(orgConn);
            
            // To populate properly, we need the models registered
            getCampaignModel(orgConn);
            getProjectModel(orgConn);

            const integrations = await GoogleAdIntegration.find({ organization })
                .populate('campaign_id', 'campaignName')
                .populate('project_id', 'name product_id')
                .sort({ createdAt: -1 });

            return integrations;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch integrations: ' + err.message, 500);
        }
    }

    async getIntegrationById(organization, id) {
        if (!organization) throw new AppError('Organization is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const GoogleAdIntegration = getGoogleAdIntegrationModel(orgConn);

            getCampaignModel(orgConn);
            getProjectModel(orgConn);

            const integration = await GoogleAdIntegration.findOne({ _id: id, organization })
                .populate('campaign_id', 'campaignName')
                .populate('project_id', 'name product_id');

            if (!integration) throw new AppError('Integration not found', 404);

            return integration;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch integration: ' + err.message, 500);
        }
    }

    async updateIntegration(organization, id, updateData) {
        if (!organization) throw new AppError('Organization is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const GoogleAdIntegration = getGoogleAdIntegrationModel(orgConn);

            const integration = await GoogleAdIntegration.findOneAndUpdate(
                { _id: id, organization },
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!integration) throw new AppError('Integration not found', 404);

            return integration;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to update integration: ' + err.message, 500);
        }
    }

    async deleteIntegration(organization, id) {
        if (!organization) throw new AppError('Organization is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const GoogleAdIntegration = getGoogleAdIntegrationModel(orgConn);

            const integration = await GoogleAdIntegration.findOne({ _id: id, organization });
            if (!integration) throw new AppError('Integration not found', 404);

            // Clean up global google_form record
            await GoogleForm.deleteOne({ integration_id: String(id) });

            // Clean up tenant google_mapping record
            const GoogleMapping = getGoogleMappingModel(orgConn);
            await GoogleMapping.deleteOne({ integration_id: id });

            await GoogleAdIntegration.findOneAndDelete({ _id: id, organization });

            return { message: 'Integration deleted successfully' };
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to delete integration: ' + err.message, 500);
        }
    }

    // ── Test Data & Mapping Methods ──

    async getTestData(organization, id) {
        if (!organization) throw new AppError('Organization is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const GoogleMapping = getGoogleMappingModel(orgConn);

            const mapping = await GoogleMapping.findOne({ integration_id: id, organization });
            if (!mapping) throw new AppError('Mapping record not found', 404);

            return {
                test_data: mapping.test_data,
                test_received_at: mapping.test_received_at,
                field_mapping: mapping.field_mapping,
            };
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch test data: ' + err.message, 500);
        }
    }

    async saveMapping(organization, id, fieldMapping) {
        if (!organization) throw new AppError('Organization is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const GoogleMapping = getGoogleMappingModel(orgConn);
            const GoogleAdIntegration = getGoogleAdIntegrationModel(orgConn);

            const mapping = await GoogleMapping.findOneAndUpdate(
                { integration_id: id, organization },
                { $set: { field_mapping: fieldMapping } },
                { new: true }
            );

            if (!mapping) throw new AppError('Mapping record not found', 404);

            // Activate the integration
            await GoogleAdIntegration.findOneAndUpdate(
                { _id: id, organization },
                { $set: { status: true } }
            );

            return mapping;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to save mapping: ' + err.message, 500);
        }
    }
}

export const googleAdsIntegrationService = new GoogleAdsIntegrationService();
