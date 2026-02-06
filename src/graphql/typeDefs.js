// GraphQL Type Definitions

export const typeDefs = `#graphql
    type Lead {
        profile_id: Int!
        name: String
        campaign: String
        source: String
        sub_source: String
        received: String
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
        stage: Int
        createdAt: String
        updatedAt: String
    }

    type Query {
        getAllLeads(organization: String!): [Lead!]!
        getLeadById(organization: String!, id: String!): LeadDetail
    }
`;
