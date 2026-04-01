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
            projectId: { type: String, required: true },
            projectName: { type: String, required: true }
        },
        organization: { type: String, required: true, index: true },
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
