import mongoose from 'mongoose';

/**
 * GoogleConfig model — lives in the GLOBAL DB (global_admin).
 * Stores webhook secret keys mapped to an organization.
 */
const googleConfigSchema = new mongoose.Schema({
    secret_key: { type: String, required: true, unique: true },
    organization: { type: String, required: true },
    label: { type: String }, // Optional friendly label e.g. "Main Google Ads Account"
}, {
    timestamps: true,
    collection: 'google_config',
});

// Use mongoose.model (global connection, not a tenant connection)
export const GoogleConfig = mongoose.models.GoogleConfig
    || mongoose.model('GoogleConfig', googleConfigSchema);
