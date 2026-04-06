import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const SupportTicketSchema = new Schema(
    {
        uuid: {
            type: String,
            unique: true,
            default: () => uuidv4()
        },
        subject: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        screenshots: [{ type: String }],
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending'
        },
        organization: { type: String, required: true, index: true },
        createdBy: {
            userId: { type: String, required: true },
            userName: { type: String, default: '' }
        }
    },
    {
        timestamps: true,
        collection: 'support_tickets',
    }
);

SupportTicketSchema.index({ organization: 1, 'createdBy.userId': 1 });
SupportTicketSchema.index({ organization: 1, status: 1 });

export const getSupportTicketModel = (connection) => {
    if (connection.models.SupportTicket) {
        return connection.models.SupportTicket;
    }
    return connection.model('SupportTicket', SupportTicketSchema);
};
