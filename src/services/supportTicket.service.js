import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getSupportTicketModel } from '../models/supportTicket.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class SupportTicketService {

    async _getModel(organization) {
        if (!organization) throw new AppError('Organization is required', 400);
        const orgConn = await getOrganizationConnection(organization);
        return getSupportTicketModel(orgConn);
    }

    async createTicket(organization, data) {
        if (!data.subject || !data.subject.trim()) {
            throw new AppError('Subject is required', 400);
        }
        if (!data.description || !data.description.trim()) {
            throw new AppError('Description is required', 400);
        }

        try {
            const SupportTicket = await this._getModel(organization);

            const ticketData = {
                organization,
                subject: data.subject.trim(),
                description: data.description.trim(),
                screenshots: data.screenshots || [],
                createdBy: {
                    userId: data.userId,
                    userName: data.userName || ''
                },
                taggedUsers: Array.isArray(data.taggedUsers) ? data.taggedUsers : []
            };

            const ticket = await SupportTicket.create(ticketData);
            return ticket;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to create support ticket: ' + err.message, 500);
        }
    }

    async getTickets(organization, userId) {
        try {
            const SupportTicket = await this._getModel(organization);

            const filter = { organization };
            if (userId) {
                filter.$or = [
                    { 'createdBy.userId': userId },
                    { 'taggedUsers.userId': userId }
                ];
            }

            const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 });
            return tickets;
        } catch (err) {
            throw new AppError('Failed to fetch support tickets: ' + err.message, 500);
        }
    }

    async getTicketById(organization, ticketId) {
        try {
            const SupportTicket = await this._getModel(organization);
            const ticket = await SupportTicket.findOne({ _id: ticketId, organization });
            if (!ticket) throw new AppError('Support ticket not found', 404);
            return ticket;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch support ticket: ' + err.message, 500);
        }
    }
}

export const supportTicketService = new SupportTicketService();
