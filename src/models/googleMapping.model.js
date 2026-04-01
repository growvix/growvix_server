import { Schema } from 'mongoose';

/**
 * GoogleMapping model — lives in the TENANT DB (per organization).
 * Stores field mappings and test data for a Google Ads integration.
 * Collection: google_mapping
 */
const GoogleMappingSchema = new Schema(
    {
        integration_id: {
            type: Schema.Types.ObjectId,
            ref: 'GoogleAdIntegration',
            required: true,
            unique: true,
        },
        form_id: {
            type: String,
            required: true,
        },
        organization: {
            type: String,
            required: true,
        },
        field_mapping: [{
            google_field: { type: String, required: true },   // e.g. "FULL_NAME"
            google_label: { type: String },                   // Human-readable, e.g. "Full Name"
            crm_field: { type: String, required: true },      // e.g. "profile.name" or "requirement"
        }],
        test_data: {
            type: Schema.Types.Mixed, // Stores the last test webhook payload
            default: null,
        },
        test_received_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'google_mapping',
    }
);

GoogleMappingSchema.index({ form_id: 1, organization: 1 });

export const getGoogleMappingModel = (connection) => {
    if (connection.models.GoogleMapping) {
        return connection.models.GoogleMapping;
    }
    return connection.model('GoogleMapping', GoogleMappingSchema);
};
