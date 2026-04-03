import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';
import { campaignService } from '../services/campaign.service.js';

export class CampaignController {
    createCampaign = asyncHandler(async (req, res) => {
        const { organization } = req.query; // Assuming organization comes from query for consistency with other REST routes, or we can use body/user context
        const campaignData = req.body;

        const campaign = await campaignService.createCampaign(organization || req.user?.organization, campaignData);

        res.status(201).json(ApiResponse.success('Campaign created successfully', campaign));
    });

    getAllCampaigns = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        
        const campaigns = await campaignService.getCampaigns(organization || req.user?.organization);

        res.status(200).json(ApiResponse.success('Campaigns fetched successfully', campaigns));
    });

    updateCampaign = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        const { id } = req.params;
        const campaignData = req.body;

        const campaign = await campaignService.updateCampaign(organization || req.user?.organization, id, campaignData);

        res.status(200).json(ApiResponse.success('Campaign updated successfully', campaign));
    });

    deleteCampaign = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        const { id } = req.params;

        const result = await campaignService.deleteCampaign(organization || req.user?.organization, id);

        res.status(200).json(ApiResponse.success('Campaign deleted successfully', result));
    });
}

export const campaignController = new CampaignController();
