import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getCampaignModel } from '../models/campaign.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class CampaignService {
    async createCampaign(organization, data) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        if (!data.campaignName || !data.campaignName.trim()) {
            throw new AppError('Campaign name is required', 400);
        }

        if (!data.projectId || !data.projectName) {
            throw new AppError('Project information (projectId, projectName) is required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const Campaign = getCampaignModel(orgConn);

            const campaign = await Campaign.create({
                organization,
                campaignName: data.campaignName.trim(),
                project: {
                    projectId: data.projectId,
                    projectName: data.projectName
                },
                inputChannels: data.inputChannels || []
            });

            return campaign;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to create campaign: ' + err.message, 500);
        }
    }

    async getCampaigns(organization) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Campaign = getCampaignModel(orgConn);

            return await Campaign.find({ organization }).sort({ createdAt: -1 });
        } catch (err) {
            throw new AppError('Failed to fetch campaigns: ' + err.message, 500);
        }
    }
}

export const campaignService = new CampaignService();
