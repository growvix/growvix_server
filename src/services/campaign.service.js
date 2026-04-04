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


        try {
            const orgConn = await getOrganizationConnection(organization);
            const Campaign = getCampaignModel(orgConn);

            const campaignData = {
                organization,
                campaignName: data.campaignName.trim(),
                inputChannels: data.inputChannels || []
            };

            if (data.projectId && data.projectName) {
                campaignData.project = {
                    projectId: data.projectId,
                    projectName: data.projectName
                };
            }

            const campaign = await Campaign.create(campaignData);

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

    async updateCampaign(organization, campaignId, data) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const Campaign = getCampaignModel(orgConn);

            const updateData = {};
            if (data.campaignName !== undefined) updateData.campaignName = data.campaignName.trim();
            if (data.projectId !== undefined && data.projectName !== undefined) {
                updateData.project = {
                    projectId: data.projectId,
                    projectName: data.projectName
                };
            }
            if (data.inputChannels !== undefined) updateData.inputChannels = data.inputChannels;
            if (data.status !== undefined) updateData.status = data.status;

            const campaign = await Campaign.findOneAndUpdate(
                { _id: campaignId, organization },
                { $set: updateData },
                { new: true }
            );

            if (!campaign) {
                throw new AppError('Campaign not found', 404);
            }

            return campaign;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to update campaign: ' + err.message, 500);
        }
    }

    async deleteCampaign(organization, campaignId) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const Campaign = getCampaignModel(orgConn);

            const result = await Campaign.findOneAndDelete({ _id: campaignId, organization });

            if (!result) {
                throw new AppError('Campaign not found', 404);
            }

            return result;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to delete campaign: ' + err.message, 500);
        }
    }
}

export const campaignService = new CampaignService();
