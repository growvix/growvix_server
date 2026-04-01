import mongoose, { Schema } from 'mongoose';

/**
 * IVR Config Schema — stores IVR vendor auth per user in an organization
 * Collection: ivr_config (multi-tenant, accessed via getOrganizationConnection)
 * 
 * Fields (as per DB screenshot):
 *   _id       : ObjectId (auto)
 *   http_auth : String   — the MCube JWT token
 *   user_id   : UUID     — the user this config belongs to
 */
const IvrConfigSchemaDefinition = {
    http_auth: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.UUID, required: true, index: true },
};

const schemaOptions = {
    timestamps: true,
    collection: 'ivr_config',
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
