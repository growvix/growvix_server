import mongoose, { Schema } from 'mongoose';

const BulkUploadSchema = new Schema(
    {
        _id: { type: Schema.Types.UUID },
        organization: { type: String, required: true },
        fileName: { type: String },
        totalLeads: { type: Number, default: 0 },
        uploadedLeads: { type: Number, default: 0 },
        existingLeads: { type: Number, default: 0 },
        errorLeads: { type: Number, default: 0 },
        source: { type: String, default: '' },
        campaign: { type: String, default: '' },
        initiatedBy: { type: String, default: '' },     // userId who triggered the upload
        initiatedByName: { type: String, default: '' },  // display name
        initiatedByEmail: { type: String, default: '' }, // email
        assignedTo: { type: String, default: '' },
        status: { type: String, enum: ['Success', 'Error', 'Partial'], default: 'Success' },
        allowReEngage: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: 'bulk_uploads',
    }
);

export const getBulkUploadModel = (connection) => {
    if (connection.models.BulkUpload) {
        return connection.models.BulkUpload;
    }
    return connection.model('BulkUpload', BulkUploadSchema);
};
