import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getIvrConfigModel } from '../models/ivrConfig.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';

const MCUBE_API_URL = 'https://api.mcube.com/Restmcube-api/outbound-calls';

export class IvrService {
    /**
     * Initiate an IVR outbound call via MCube
     * @param {string} organization - org name for multi-tenant DB lookup
     * @param {string} userId       - calling user's ID (to look up their phone)
     * @param {string} custNumber   - lead/client phone number
     */
    async initiateCall(organization, userId, custNumber) {
        // 1. Get org DB connection
        const orgConnection = await getOrganizationConnection(organization);

        // 2. Fetch IVR auth token from the org's ivr collection
        const IvrConfig = getIvrConfigModel(orgConnection);
        const config = await IvrConfig.findOne({ isActive: true }).lean();
        if (!config || !config.http_authorization) {
            throw new Error('IVR configuration not found for this organization');
        }

        // 3. Look up the calling user's phone number
        const ClientUser = getClientUserModel(orgConnection);
        const callingUser = await ClientUser.findById(userId).lean();
        if (!callingUser || !callingUser.profile?.phone) {
            throw new Error('Calling user not found or phone number not set');
        }

        const exeNumber = callingUser.profile.phone;

        const payload = {
            HTTP_AUTHORIZATION: config.http_authorization,
            exenumber: exeNumber,
            custnumber: custNumber,
            refurl: 1,
        };

        console.log('=== MCube IVR Outbound Call ===');
        console.log('Organization:', organization);
        console.log('Exe Number (caller):', exeNumber);
        console.log('Customer Number (lead):', custNumber);
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('==============================');

        // 4. POST to MCube vendor API using native fetch
        const response = await fetch(MCUBE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('MCube Response:', data);
        return data;
    }
}

export const ivrService = new IvrService();
