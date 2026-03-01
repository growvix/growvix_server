import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const LeadActivitySchema = new Schema(
    {
        id: { type: String, default: () => uuidv4(), unique: true },
        profile_id: { type: Number, required: true },
        lead_id: { type: String, required: true },
        user_id: { type: String, required: true },
        updates: { type: String, required: true },
        reason: { type: String, required: false },
        stage: { type: String, required: true },
        status: { type: String, required: false },
        notes: { type: String, required: false },
        follow_up_date: { type: Date, required: false },
        site_visit_date: { type: Date, required: false },
        site_visit_completed: { type: Boolean, default: false },
        site_visit_completed_at: { type: Date, default: null },
        site_visit_completed_by: { type: String, default: null },
        site_visit_project_id: { type: Number, default: null },
        site_visit_project_name: { type: String, default: null }
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
