// Lead service schema for Connect RPC
// This defines the schema in code instead of using proto files
import { create, toBinary, fromBinary } from '@bufbuild/protobuf';

// Define Lead schema manually for Connect protocol
export const LeadSchema = {
    profileId: 0,
    name: '',
    campaign: '',
    source: '',
    subSource: '',
    received: ''
};

// Service methods implementation
export const leadServiceMethods = {
    getAllLeads: {
        name: 'GetAllLeads',
        kind: 'unary',
        path: '/lead.LeadService/GetAllLeads'
    }
};
