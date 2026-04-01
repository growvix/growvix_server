import mongoose from 'mongoose';

/**
 * GoogleForm model — lives in the GLOBAL DB (global_admin).
 * Maps a unique secret_key to an organization and form_id.
 * When the webhook receives a payload, it uses the secret_key
 * to determine which organization the lead belongs to.
 */
const googleFormSchema = new mongoose.Schema({
    secret_key: { type: String, required: true, unique: true },
    form_id: { type: String, required: true },
    organization: { type: String, required: true },
    integration_id: { type: String, required: true }, // references google_ad_integrations._id in tenant DB
    label: { type: String }, // Optional label, e.g. form name / sub_source
}, {
    timestamps: true,
    collection: 'google_form',
});

googleFormSchema.index({ form_id: 1, organization: 1 });

// Use mongoose.model (global connection, not a tenant connection)
export const GoogleForm = mongoose.models.GoogleForm
    || mongoose.model('GoogleForm', googleFormSchema);
