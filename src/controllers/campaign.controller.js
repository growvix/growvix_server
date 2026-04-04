import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';
import { campaignService } from '../services/campaign.service.js';

export class CampaignController {
    createCampaign = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        const campaignData = req.body;

        const campaign = await campaignService.createCampaign(organization || req.user?.organization, campaignData);

        res.status(201).json(ApiResponse.success('Campaign created successfully', campaign));
    });

    getAllCampaigns = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        
        const campaigns = await campaignService.getCampaigns(organization || req.user?.organization);

        res.status(200).json(ApiResponse.success('Campaigns fetched successfully', campaigns));
    });

    getCampaignById = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        const { id } = req.params;

        const campaign = await campaignService.getCampaignById(organization || req.user?.organization, id);

        res.status(200).json(ApiResponse.success('Campaign fetched successfully', campaign));
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

    // ─── Granular Operations ───────────────────────────────────

    addSource = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        const { id } = req.params;

        const campaign = await campaignService.addSource(organization || req.user?.organization, id, req.body);

        res.status(200).json(ApiResponse.success('Source added successfully', campaign));
    });

    addSubSource = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        const { id, sourceId } = req.params;

        const campaign = await campaignService.addSubSource(organization || req.user?.organization, id, sourceId, req.body);

        res.status(200).json(ApiResponse.success('Sub-source added successfully', campaign));
    });

    updateSubSourceProject = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        const { id, sourceId, subSourceId } = req.params;

        const campaign = await campaignService.updateSubSourceProject(
            organization || req.user?.organization, id, sourceId, subSourceId, req.body
        );

        res.status(200).json(ApiResponse.success('Sub-source project updated successfully', campaign));
    });

    // ─── Stages ────────────────────────────────────────────────

    getStages = asyncHandler(async (req, res) => {
        const { organization } = req.query;

        const stages = await campaignService.getStages(organization || req.user?.organization);

        res.status(200).json(ApiResponse.success('Stages fetched successfully', stages));
    });
}

export const campaignController = new CampaignController();
