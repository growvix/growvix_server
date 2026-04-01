import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getIvrConfigModel } from '../models/ivrConfig.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { getLeadModel } from '../models/lead.model.js';

const MCUBE_API_URL = 'https://api.mcube.com/Restmcube-api/outbound-calls';

export class IvrService {
    /**
     * Initiate an IVR outbound call via MCube
     * 
     * Flow:
     *   1. Connect to the user's organization DB (multi-tenant)
     *   2. Look up ivr_config by user_id → get http_auth token
     *   3. Look up user by user_id in users collection → get exenumber (caller phone)
     *   4. Look up lead by lead_id in leads collection → get custnumber (lead phone)
     *   5. POST to MCube vendor API
     *   6. Return vendor response to the caller (frontend gets status)
     *
     * @param {string} organization - org name for multi-tenant DB lookup
     * @param {string} userId       - calling user's UUID
     * @param {string} leadId       - lead UUID to fetch their phone number
     * @returns {object} MCube vendor response (status returned to frontend)
     */
    async initiateCall(organization, userId, leadId) {
        // 1. Get org DB connection
        const orgConnection = await getOrganizationConnection(organization);

        // 2. Fetch IVR auth token from ivr_config collection by user_id
        const IvrConfig = getIvrConfigModel(orgConnection);
        const config = await IvrConfig.findOne({ user_id: userId }).lean();
        if (!config || !config.http_auth) {
            throw new Error('IVR configuration not found for this user');
        }

        // 3. Look up the calling user's phone number (exenumber)
        const ClientUser = getClientUserModel(orgConnection);
        const callingUser = await ClientUser.findById(userId).lean();
        if (!callingUser || !callingUser.profile?.phone) {
            throw new Error('Calling user not found or phone number not set');
        }
        const exeNumber = callingUser.profile.phone;

        // 4. Look up the lead's phone number (custnumber)
        const Lead = getLeadModel(orgConnection);
        const lead = await Lead.findById(leadId).lean();
        if (!lead || !lead.profile?.phone) {
            throw new Error('Lead not found or phone number not set');
        }
        const custNumber = lead.profile.phone;

        // 5. Build payload and POST to MCube vendor API
        const payload = {
            HTTP_AUTHORIZATION: config.http_auth,
            exenumber: exeNumber,
            custnumber: custNumber,
            refurl: 1,
        };

        console.log('=== MCube IVR Outbound Call ===');
        console.log('Organization:', organization);
        console.log('User ID:', userId);
        console.log('Lead ID:', leadId);
        console.log('Exe Number (caller):', "+91" + exeNumber);
        console.log('Customer Number (lead):', "+91" + custNumber);
        console.log('==============================');

        const response = await fetch(MCUBE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('MCube Response:', data);

        // 6. Return full vendor response so frontend can show the call status
        return {
            vendorResponse: data,
            callDetails: {
                exeNumber,
                custNumber,
                leadId,
                userId,
            },
        };
    }
}

export const ivrService = new IvrService();
