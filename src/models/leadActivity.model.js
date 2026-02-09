import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const LeadActivitySchema = new Schema(
    {
        id: { type: String, default: () => uuidv4(), unique: true },
        profile_id: { type: Number, required: true },
        lead_id: { type: String, required: true },
        user_id: { type: String, required: true },
        stage: { type: String, required: true },
        status: { type: String, required: false },
        notes: { type: String, required: false }
    },
    {
        timestamps: true,
        collection: 'lead_activities'
    }
);

LeadActivitySchema.index({ lead_id: 1 });
LeadActivitySchema.index({ profile_id: 1 });

export const getLeadActivityModel = (connection) => {
    if (connection.models.LeadActivity) {
        return connection.models.LeadActivity;
    }
    return connection.model('LeadActivity', LeadActivitySchema);
};
