import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getMailConfigModel } from '../models/mailConfig.model.js';
import { AppError } from '../utils/apiResponse.util.js';

class MailConfigService {
    async create(organization, data) {
        const orgConn = await getOrganizationConnection(organization);
        const MailConfig = getMailConfigModel(orgConn);
        return await MailConfig.create({ ...data, organization });
    }

    async getAll(organization) {
        const orgConn = await getOrganizationConnection(organization);
        const MailConfig = getMailConfigModel(orgConn);
        return await MailConfig.find({ organization }).sort({ createdAt: -1 });
    }

    async getById(organization, id) {
        const orgConn = await getOrganizationConnection(organization);
        const MailConfig = getMailConfigModel(orgConn);
        const config = await MailConfig.findById(id);
        if (!config) throw new AppError('Mail config not found', 404);
        return config;
    }

    async update(organization, id, updateData) {
        const orgConn = await getOrganizationConnection(organization);
        const MailConfig = getMailConfigModel(orgConn);
        const config = await MailConfig.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        if (!config) throw new AppError('Mail config not found', 404);
        return config;
    }

    async delete(organization, id) {
        const orgConn = await getOrganizationConnection(organization);
        const MailConfig = getMailConfigModel(orgConn);
        const config = await MailConfig.findByIdAndDelete(id);
        if (!config) throw new AppError('Mail config not found', 404);
        return config;
    }
}

export const mailConfigService = new MailConfigService();
