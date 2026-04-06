import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Sub-Source Schema — nested inside a Source
const SubSourceSchema = new Schema({
    uuid: { type: String, default: () => uuidv4() },
    subSourceName: { type: String, required: true },
    project: {
        projectId: { type: String }
    }
}, { _id: false });

// Source Schema — nested inside Campaign
const SourceSchema = new Schema({
    uuid: { type: String, default: () => uuidv4() },
    sourceName: { type: String, required: true },
    subSources: [SubSourceSchema]
}, { _id: false });

const CampaignSchema = new Schema(
    {
        uuid: { 
            type: String, 
            unique: true,
            default: () => uuidv4()
        },
        campaignName: { type: String, required: true },
        project: {
            projectId: { type: String }
        },
        sources: [SourceSchema],
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
