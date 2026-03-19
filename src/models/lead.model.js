import mongoose, { Schema } from 'mongoose';

const LeadSchema = new Schema(
    {
        _id: { type: Schema.Types.UUID },
        profile_id: { type: Number, required: true, unique: true },
        organization: { type: String, required: true },
        profile: {
            name: { type: String, required: true },
            email: { type: String },
            phone: { type: String, required: true },
            location: { type: String },
        },
        requirement: {
            sqft: { type: Number },
            bhk: [{ type: String }],
            floor: [{ type: String }],
            balcony: { type: Boolean, default: false },
            bathroom_count: { type: Number },
            parking_needed: { type: Boolean, default: false },
            parking_count: { type: Number },
            price_min: { type: Number },
            price_max: { type: Number },
            furniture: [{ type: String }],
            facing: [{ type: String }],
            plot_type: { type: String },
        },
        requirements: [{
            key: { type: String, required: true },
            value: { type: String, required: true },
        }],
        project: [{ type: String }],
        interested_projects: [{
            project_id: { type: Number, required: true },
            project_name: { type: String, required: true }
        }],
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
        stage: { type: String },
        status: { type: String },
        created_at: { type: Date },
        updated_at: { type: Date },
        exe_user: { type: Schema.Types.UUID },
        important_activities: [{
            activity_id: { type: String, required: true },
            marked_at: { type: Date, default: Date.now },
            marked_by: { type: Schema.Types.Mixed }
        }]
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
