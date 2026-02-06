import { leadStageService } from '../services/leadStage.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class LeadStageController {
    getStages = asyncHandler(async (req, res) => {
        const { organization } = req.params;
        const stages = await leadStageService.getStages(organization);
        res.status(200).json(ApiResponse.success('Stages fetched successfully', stages));
    });
}

export const leadStageController = new LeadStageController();
