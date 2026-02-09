// GraphQL Resolvers
import { leadService } from '../services/lead.service.js';
import { leadActivityService } from '../services/leadActivity.service.js';

export const resolvers = {
    Query: {
        getAllLeads: async (_, { organization }) => {
            return await leadService.getAllLeads(organization);
        },
        getLeadById: async (_, { organization, id }) => {
            return await leadService.getLeadById(organization, id);
        },
        getLeadActivities: async (_, { organization, leadId }) => {
            return await leadActivityService.getActivitiesByLeadId(organization, leadId);
        },
    },
    Mutation: {
        createLeadActivity: async (_, { organization, input }) => {
            return await leadActivityService.createActivity(organization, input);
        },
    },
};
