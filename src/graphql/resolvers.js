// GraphQL Resolvers
import { leadService } from '../services/lead.service.js';

export const resolvers = {
    Query: {
        getAllLeads: async (_, { organization }) => {
            return await leadService.getAllLeads(organization);
        },
        getLeadById: async (_, { organization, id }) => {
            return await leadService.getLeadById(organization, id);
        },
    },
};
