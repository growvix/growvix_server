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

    type LeadPropertyRequirement {
        sqft: Int
        bhk: [String]
        floor: [String]
        balcony: Boolean
        bathroom_count: Int
        parking_needed: Boolean
        parking_count: Int
        price_min: Float
        price_max: Float
        furniture: [String]
        facing: [String]
        plot_type: String
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

    type LeadRequirement {
        _id: String!
        key: String!
        value: String!
    }

    type InterestedProject {
        project_id: Int!
        project_name: String!
    }

    type ProjectSummary {
        product_id: Int!
        name: String!
        location: String
        property: String
    }

    type LeadDetail {
        _id: String!
        profile_id: Int!
        organization: String
        profile: LeadProfile
        prefered: LeadPrefered
        pretype: LeadPretype
        propertyRequirement: LeadPropertyRequirement
        
        project: [String]
        interested_projects: [InterestedProject]
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
        requirements: [LeadRequirement!]!
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
        site_visit_project_id: Int
        site_visit_project_name: String
        status: String
        notes: String
        reason: String
        follow_up_date: String
        createdAt: String
        updatedAt: String
    }

    type SiteVisitCalendarEntry {
        id: String!
        lead_id: String!
        lead_name: String
        profile_id: Int!
        user_id: String!
        user_name: String
        site_visit_date: String!
        site_visit_completed: Boolean!
        site_visit_completed_at: String
        site_visit_completed_by: String
        site_visit_completed_by_name: String
        site_visit_project_id: Int
        site_visit_project_name: String
        createdAt: String
    }

    input CreateLeadActivityInput {
        profile_id: Int!
        lead_id: String!
        updates: String!
        user_id: String!
        reason: String
        stage: String
        site_visit_date: String
        site_visit_project_id: Int
        site_visit_project_name: String
        status: String
        notes: String
        follow_up_date: String
    }

    type Query {
        getAllLeads(organization: String!): [Lead!]!
        getLeadById(organization: String!, id: String!): LeadDetail
        getLeadActivities(organization: String!, leadId: String!): [LeadActivity!]!
        getLeadActivitiesByProfileId(organization: String!, profileId: Int!): [LeadActivity!]!
        getSiteVisitActivities(organization: String!, startDate: String, endDate: String, userId: String, teamId: String, projectId: Int): [SiteVisitCalendarEntry!]!
        getAllProjects(organization: String!): [ProjectSummary!]!
    }

    input UpdateLeadInput {
        stage: String
        status: String
        exe_user: String
    }

    input UpdatePropertyRequirementInput {
        sqft: Int
        bhk: [String]
        floor: [String]
        balcony: Boolean
        bathroom_count: Int
        parking_needed: Boolean
        parking_count: Int
        price_min: Float
        price_max: Float
        furniture: [String]
        facing: [String]
        plot_type: String
    }
 
    type Mutation {
        createLeadActivity(organization: String!, input: CreateLeadActivityInput!): LeadActivity!
        updateLead(organization: String!, id: String!, input: UpdateLeadInput!): LeadDetail
        markSiteVisitCompleted(organization: String!, activityId: String!, userId: String!): LeadActivity!
        addRequirement(organization: String!, leadId: String!, key: String!, value: String!): LeadDetail
        removeRequirement(organization: String!, leadId: String!, requirementId: String!): LeadDetail
        updatePropertyRequirement(organization: String!, leadId: String!, input: UpdatePropertyRequirementInput!): LeadDetail
        addInterestedProject(organization: String!, leadId: String!, projectId: Int!, projectName: String!): LeadDetail
        removeInterestedProject(organization: String!, leadId: String!, projectId: Int!): LeadDetail
    }
`;
