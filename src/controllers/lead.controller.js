import { leadService } from '../services/lead.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class LeadController {
    addLead = asyncHandler(async (req, res) => {
        const lead = await leadService.addLead(req.body);
        res.status(201).json(ApiResponse.success('Lead added successfully', lead));
    });
}

export const leadController = new LeadController();
