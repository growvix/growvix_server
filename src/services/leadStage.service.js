import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadStageModel } from '../models/leadStage.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class LeadStageService {
    async getStages(organization) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const LeadStage = getLeadStageModel(orgConn);

            const stages = await LeadStage.findOne({}).lean();

            // If no stages found, return a default structure or null
            return stages || { stages: [], organization };
        } catch (err) {
            throw new AppError('Failed to fetch stages: ' + err.message, 500);
        }
    }
}

export const leadStageService = new LeadStageService();
