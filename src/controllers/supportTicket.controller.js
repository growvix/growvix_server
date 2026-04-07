import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';
import { supportTicketService } from '../services/supportTicket.service.js';

export class SupportTicketController {
    createTicket = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        const ticketData = req.body;

        const ticket = await supportTicketService.createTicket(
            organization || req.user?.organization,
            ticketData
        );

        res.status(201).json(ApiResponse.success('Support ticket created successfully', ticket));
    });

    getTickets = asyncHandler(async (req, res) => {
        const { organization, userId } = req.query;

        const tickets = await supportTicketService.getTickets(
            organization || req.user?.organization,
            userId
        );

        res.status(200).json(ApiResponse.success('Support tickets fetched successfully', tickets));
    });

    getTicketById = asyncHandler(async (req, res) => {
        const { organization } = req.query;
        const { id } = req.params;

        const ticket = await supportTicketService.getTicketById(
            organization || req.user?.organization,
            id
        );

        res.status(200).json(ApiResponse.success('Support ticket fetched successfully', ticket));
    });
}

export const supportTicketController = new SupportTicketController();
