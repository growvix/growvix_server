// GraphQL Type Definitions

export const typeDefs = `#graphql
    type Lead {
        _id: String!
        profile_id: Int!
        name: String
        campaign: String
        source: String
        sub_source: String
        received: String
        exe_user: String
        exe_user_name: String
    }

    type LeadProfile {
        name: String
        email: String
        phone: String
        location: String
    }

    type LeadPrefered {
        location: String
        budget: String 
    }

    type LeadPretype {
        type: [String]
    }

    type LeadAcquired {
        campaign: String
        source: String
        sub_source: String
        received: String
        created_at: String
        medium: String
        _id: String
    }

    type LeadDetail {
        _id: String!
        profile_id: Int!
        organization: String
        profile: LeadProfile
        prefered: LeadPrefered
        pretype: LeadPretype
        bathroom: Int
        parking: Int
        
        project: [String]
        floor: String
        facing: String
        merge_id: [String]
        acquired: [LeadAcquired]
        stage: String
        status: String
        exe_user: String
        exe_user_name: String
        createdAt: String
        updatedAt: String
        site_visits_completed: Int
        activities: [LeadActivity!]!
    }

    type LeadActivity {
        id: String!
        profile_id: Int!
        lead_id: String!
        user_id: String!
        user_name: String
        updates: String
        stage: String
        site_visit_date: String
        site_visit_completed: Boolean
        site_visit_completed_at: String
        site_visit_completed_by: String
        site_visit_completed_by_name: String
        status: String
        notes: String
        reason: String
        follow_up_date: String
        createdAt: String
        updatedAt: String
    }

    input CreateLeadActivityInput {
        profile_id: Int!
        lead_id: String!
        updates: String!
        user_id: String!
        reason: String
        stage: String
        site_visit_date: String
        status: String
        notes: String
        follow_up_date: String
    }

    type Query {
        getAllLeads(organization: String!): [Lead!]!
        getLeadById(organization: String!, id: String!): LeadDetail
        getLeadActivities(organization: String!, leadId: String!): [LeadActivity!]!
        getLeadActivitiesByProfileId(organization: String!, profileId: Int!): [LeadActivity!]!
    }

    input UpdateLeadInput {
        stage: String
        status: String
        exe_user: String
    }
 
    type Mutation {
        createLeadActivity(organization: String!, input: CreateLeadActivityInput!): LeadActivity!
        updateLead(organization: String!, id: String!, input: UpdateLeadInput!): LeadDetail
        markSiteVisitCompleted(organization: String!, activityId: String!, userId: String!): LeadActivity!
    }
`;
