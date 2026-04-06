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
        is_secondary: { type: Boolean, default: false },
        merged_into: {
            UUID: { type: String },
            id: { type: String },
            name: { type: String }
        },
        merge_id: [{
            UUID: { type: String, required: true },
            id: { type: String, required: true },
            name: { type: String, required: true }
        }],
        acquired: [{
            campaign: { type: String },
            source: { type: String },
            sub_source: { type: String },
            received: { type: Date },
            created_at: { type: Date },
            medium: { type: String },
        }],
        number_of_re_engagement: { type: Number, default: 0 },
        stage: { type: String },
        status: { type: String },
        created_at: { type: Date },
        updated_at: { type: Date },
        exe_user: { type: Schema.Types.UUID },
        cp_user: { type: Schema.Types.UUID },
        important_activities: [{
            activity_id: { type: String, required: true },
            marked_at: { type: Date, default: Date.now },
            marked_by: { type: Schema.Types.UUID }
        }]
    },
    {
        timestamps: true,
        collection: 'leads',
    }
);

// Performance Indexes
LeadSchema.index({ organization: 1, exe_user: 1, status: 1 });
LeadSchema.index({ organization: 1, profile_id: -1 });
LeadSchema.index({ organization: 1, 'profile.name': 1 });
LeadSchema.index({ organization: 1, 'profile.phone': 1 });
LeadSchema.index({ organization: 1, 'profile.email': 1 });
LeadSchema.index({ organization: 1, 'acquired.source': 1 });

export const getLeadModel = (connection) => {
    if (connection.models.Lead) {
        return connection.models.Lead;
    }
    return connection.model('Lead', LeadSchema);
};
