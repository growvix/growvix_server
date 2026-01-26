import mongoose, { Schema } from 'mongoose';

const LeadSchema = new Schema(
    {
        profile_id: { type: Number, required: true, unique: true },
        organization: { type: String, required: true },
        profile: {
            name: { type: String, required: true },
            email: { type: String },
            phone: { type: String },
            location: { type: String },
        },
        prefered: {
            location: { type: String },
            budget: { type: String },
        },
        pretype: {
            type: { type: [String], default: [] },
        },
        bathroom: { type: Number },
        parking: { type: Number },
        project: [{ type: String }],
        floor: { type: String },
        facing: { type: String },
        engaged: { type: Object },
        merge_id: [{ type: String }],
        acquired: [{
            campaign: { type: String },
            source: { type: String },
            sub_source: { type: String },
            received: { type: Date },
            created_at: { type: Date },
            medium: { type: String },
        }],
        created_at: { type: Date },
        updated_at: { type: Date },
    },
    {
        timestamps: true,
        collection: 'leads',
    }
);

export const getLeadModel = (connection) => {
    if (connection.models.Lead) {
        return connection.models.Lead;
    }
    return connection.model('Lead', LeadSchema);
};
