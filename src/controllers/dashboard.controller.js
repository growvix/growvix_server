import { dashboardService } from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class DashboardController {

    getAdminStats = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.user?.organization;
        const data = await dashboardService.getAdminStats(organization, req.user);
        res.status(200).json(ApiResponse.success('Admin stats retrieved', data));
    });

    getSalesSummary = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.user?.organization;
        const { startDate, endDate, executiveId } = req.query;
        const data = await dashboardService.getSalesSummary(organization, startDate, endDate, executiveId, req.user);
        res.status(200).json(ApiResponse.success('Sales summary retrieved', data));
    });

    getPreSalesSummary = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.user?.organization;
        const { startDate, endDate, executiveId } = req.query;
        const data = await dashboardService.getPreSalesSummary(organization, startDate, endDate, executiveId, req.user);
        res.status(200).json(ApiResponse.success('Pre-sales summary retrieved', data));
    });

    getMarketingSummary = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.user?.organization;
        const { startDate, endDate, campaignCategory } = req.query;
        const data = await dashboardService.getMarketingSummary(organization, startDate, endDate, campaignCategory, req.user);
        res.status(200).json(ApiResponse.success('Marketing summary retrieved', data));
    });

    getExecutives = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.user?.organization;
        const data = await dashboardService.getExecutives(organization, req.user);
        res.status(200).json(ApiResponse.success('Executives retrieved', data));
    });
}

export const dashboardController = new DashboardController();
