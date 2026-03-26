import mongoose, { Schema } from 'mongoose';

// Map schema to connection based on organization
export const getMailConfigModel = (connection) => {
    // Return existing model if compiled
    if (connection.models.MailConfig) {
        return connection.models.MailConfig;
    }

    // Define schema
    const mailConfigSchema = new mongoose.Schema({
        email: { type: String, required: true },
        smtpCode: { type: String, required: true },
        mailServer: { type: String, required: true },
        organization: { type: String, required: true },
    }, {
        timestamps: true,
        collection: 'mail_config'
    });

    // Indexes for efficient querying by org
    mailConfigSchema.index({ organization: 1 });

    return connection.model('MailConfig', mailConfigSchema);
};
