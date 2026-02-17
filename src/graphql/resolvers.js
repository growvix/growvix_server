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
        getLeadActivitiesByProfileId: async (_, { organization, profileId }) => {
            return await leadActivityService.getActivitiesByProfileId(organization, profileId);
        },
    },
    Mutation: {
        createLeadActivity: async (_, { organization, input }) => {
            return await leadActivityService.createActivity(organization, input);
        },
    },
    LeadDetail: {
        activities: async (parent, _, context) => {
            // parent contains the LeadDetail object with organization and profile_id
            return await leadActivityService.getActivitiesByProfileId(parent.organization, parent.profile_id);
        },
    },
};
