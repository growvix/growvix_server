import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const CampaignSchema = new Schema(
    {
        uuid: { 
            type: String, 
            unique: true,
            default: () => uuidv4()
        },
        campaignName: { type: String, required: true },
        project: {
            projectId: { type: String },
            projectName: { type: String }
        },
        inputChannels: [
            {
                uuid: { type: String, default: () => uuidv4() },
                publisher: { type: String },
                source: { type: String },
                subSource: { type: String },
                medium: { type: String },
                campaignType: { type: String },
                integrationType: { type: String },
                redirectionUrl: { type: String },
                projectId: { type: String },
                projectName: { type: String }
            }
        ],
        organization: { type: String, required: true, index: true },
        status: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: 'campaigns',
    }
);

CampaignSchema.index({ organization: 1 });

export const getCampaignModel = (connection) => {
    if (connection.models.Campaign) {
        return connection.models.Campaign;
    }
    return connection.model('Campaign', CampaignSchema);
};
