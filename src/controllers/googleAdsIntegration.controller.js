import { googleAdsIntegrationService } from '../services/googleAdsIntegration.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class GoogleAdsIntegrationController {
    createIntegration = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.body.organization || req.get('organization');
        const userId = req.user?._id;

        const data = { ...req.body, organization };
        const integration = await googleAdsIntegrationService.createIntegration(data, userId);

        res.status(201).json(ApiResponse.success('Integration created successfully', integration));
    });

    getIntegrations = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.get('organization');
        const integrations = await googleAdsIntegrationService.getIntegrations(organization);

        res.status(200).json(ApiResponse.success('Integrations fetched successfully', integrations));
    });

    getIntegrationById = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.get('organization');
        const { id } = req.params;
        const integration = await googleAdsIntegrationService.getIntegrationById(organization, id);

        res.status(200).json(ApiResponse.success('Integration fetched successfully', integration));
    });

    updateIntegration = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.body.organization || req.get('organization');
        const { id } = req.params;
        const integration = await googleAdsIntegrationService.updateIntegration(organization, id, req.body);

        res.status(200).json(ApiResponse.success('Integration updated successfully', integration));
    });

    deleteIntegration = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.get('organization');
        const { id } = req.params;
        const result = await googleAdsIntegrationService.deleteIntegration(organization, id);

        res.status(200).json(ApiResponse.success('Integration deleted successfully', result));
    });

    // ── Test Data & Mapping Endpoints ──

    getTestData = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.get('organization');
        const { id } = req.params;
        const data = await googleAdsIntegrationService.getTestData(organization, id);

        res.status(200).json(ApiResponse.success('Test data fetched', data));
    });

    saveMapping = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.body.organization || req.get('organization');
        const { id } = req.params;
        const { field_mapping } = req.body;
        const result = await googleAdsIntegrationService.saveMapping(organization, id, field_mapping);

        res.status(200).json(ApiResponse.success('Mapping saved and integration activated', result));
    });
}

export const googleAdsIntegrationController = new GoogleAdsIntegrationController();
