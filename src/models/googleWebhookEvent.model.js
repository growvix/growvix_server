import mongoose from 'mongoose';

export const getGoogleWebhookEventModel = (connection) => {
    if (connection.models.GoogleWebhookEvent) {
        return connection.models.GoogleWebhookEvent;
    }

    const googleWebhookEventSchema = new mongoose.Schema({
        organization: { type: String, required: true },
        eventType: { type: String, required: true, default: 'lead_form_submission' },
        payload: { type: mongoose.Schema.Types.Mixed }, // Raw Google payload stored as-is
        processedAt: { type: Date, default: Date.now },
    }, {
        timestamps: true,
        collection: 'google_webhook_events',
    });

    googleWebhookEventSchema.index({ organization: 1, createdAt: -1 });

    return connection.model('GoogleWebhookEvent', googleWebhookEventSchema);
};
