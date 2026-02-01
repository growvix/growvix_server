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

    type Query {
        getAllLeads(organization: String!): [Lead!]!
    }
`;
