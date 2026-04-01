import { Schema } from 'mongoose';

const SourceSchema = new Schema(
    {
        name: { type: String, required: true },
        organization: { type: String, required: true, index: true }
    },
    { 
        timestamps: true,
        collection: 'sources'
    }
);

SourceSchema.index({ organization: 1 });

export const getSourceModel = (connection) => {
    if (connection.models.Source) {
        return connection.models.Source;
    }
    return connection.model('Source', SourceSchema);
};
