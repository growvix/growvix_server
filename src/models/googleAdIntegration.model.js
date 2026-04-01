import { Schema } from 'mongoose';

const GoogleAdIntegrationSchema = new Schema(
    {
        campaign_id: { 
            type: Schema.Types.ObjectId, 
            ref: 'Campaign', 
            required: true 
        },
        source: { 
            type: String, 
            default: 'google_ads', 
            required: true 
        },
        sub_source: { 
            type: String, 
            required: true 
        }, // form name
        project_id: { 
            type: Schema.Types.ObjectId, 
            ref: 'Project', 
            required: true 
        },
        form_id: { 
            type: String, 
            required: true 
        },
        secret_key: {
            type: String,
            required: true,
            unique: true,
        },
        status: { 
            type: Boolean, 
            default: false 
        },
        organization: { 
            type: String, 
            required: true 
        },
        created_by: { 
            type: String
        },
    },
    {
        timestamps: true,
        collection: 'google_ad_integrations',
    }
);

// Ensure form_id is unique per campaign and organization
GoogleAdIntegrationSchema.index({ campaign_id: 1, form_id: 1, organization: 1 }, { unique: true });

export const getGoogleAdIntegrationModel = (connection) => {
    if (connection.models.GoogleAdIntegration) {
        return connection.models.GoogleAdIntegration;
    }
    return connection.model('GoogleAdIntegration', GoogleAdIntegrationSchema);
};
