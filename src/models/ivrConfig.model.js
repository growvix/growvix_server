import mongoose, { Schema } from 'mongoose';

/**
 * IVR Config Schema — stores IVR vendor auth per organization
 * Multi-tenant: accessed via getOrganizationConnection()
 */
const IvrConfigSchemaDefinition = {
    http_authorization: { type: String, required: true },
    provider: { type: String, default: 'mcube' },
    isActive: { type: Boolean, default: true },
};

const schemaOptions = {
    timestamps: true,
    collection: 'ivr',
};

/**
 * Get the IvrConfig model for a specific organization connection
 * @param {mongoose.Connection} connection
 * @returns {mongoose.Model}
 */
export const getIvrConfigModel = (connection) => {
    if (connection.models.IvrConfig) {
        return connection.models.IvrConfig;
    }
    const schema = new Schema(IvrConfigSchemaDefinition, schemaOptions);
    return connection.model('IvrConfig', schema);
};
