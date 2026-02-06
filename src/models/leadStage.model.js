import mongoose, { Schema } from 'mongoose';

const LeadStageSchema = new Schema(
    {
        organization: { type: String, required: true },
        stages: [{
            id: { type: Number, required: true },
            name: { type: String, required: true },
            color: { type: String, required: true },
            nextStages: [{ type: Number }]
        }],
        product_id: { type: Number, default: 0 }
    },
    {
        timestamps: true,
        collection: 'stages',
    }
);

export const getLeadStageModel = (connection) => {
    if (connection.models.LeadStage) {
        return connection.models.LeadStage;
    }
    return connection.model('LeadStage', LeadStageSchema);
};
