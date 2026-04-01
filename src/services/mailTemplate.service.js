import { getMailTemplateModel } from '../models/mailTemplate.model.js';
import { getProjectModel } from '../models/project.model.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { AppError } from '../utils/apiResponse.util.js';

export class MailTemplateService {
    async getModel(organization) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        const connection = await getOrganizationConnection(organization);
        return getMailTemplateModel(connection);
    }

    async create(organization, data) {
        const orgConn = await getOrganizationConnection(organization);
        const MailTemplate = getMailTemplateModel(orgConn);
        return await MailTemplate.create({ ...data, organization });
    }

    async getAll(organization) {
        const orgConn = await getOrganizationConnection(organization);
        const MailTemplate = getMailTemplateModel(orgConn);
        // Ensure Project model is registered for population
        getProjectModel(orgConn);
        return await MailTemplate.find().populate('projectId', 'name').sort({ createdAt: -1 });
    }

    async getById(organization, id) {
        const orgConn = await getOrganizationConnection(organization);
        const MailTemplate = getMailTemplateModel(orgConn);
        // Ensure Project model is registered for population
        getProjectModel(orgConn);
        const template = await MailTemplate.findById(id).populate('projectId', 'name');
        if (!template) throw new AppError('Template not found', 404);
        return template;
    }

    async update(organization, id, data) {
        const MailTemplate = await this.getModel(organization);
        const template = await MailTemplate.findByIdAndUpdate(id, { ...data, organization }, {
            new: true,
            runValidators: true,
        });
        if (!template) {
            throw new AppError('Template not found', 404);
        }
        return template;
    }

    async delete(organization, id) {
        const MailTemplate = await this.getModel(organization);
        const template = await MailTemplate.findByIdAndDelete(id);
        if (!template) {
            throw new AppError('Template not found', 404);
        }
        return template;
    }
}

export const mailTemplateService = new MailTemplateService();
