import { googleWebhookService } from '../services/googleWebhook.service.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export const googleWebhookController = {
    /**
     * POST /api/webhooks/google
     *
     * Flow:
     * 1. Extract google_key from req.body
     * 2. Look up the key in global_admin.google_config
     * 3. Get organization from matched config document
     * 4. Store the lead in the org's multi-tenant DB
     * 5. Assign the lead to a pre-sales user via round-robin
     * 6. Always respond 200 (Google requires this to stop retries)
     */
    receive: async (req, res) => {
        // Always acknowledge immediately — Google will retry on non-200
        res.status(200).send('EVENT_RECEIVED');

        try {
            const { google_key, ...payload } = req.body;
            console.log("google response", req.body);

            // ── Step 1: Validate using global DB ──
            // const config = await googleWebhookService.validateAndGetConfig(google_key);
            // if (!config) {
            //     console.warn(`[Google Webhook] Invalid or unknown google_key: ${google_key}`);
            //     return; // Response already sent, just stop processing
            // }

            // const { organization } = config;
            // console.log(`[Google Webhook] Valid key. Organization: ${organization}`);

            // // ── Step 2: Save raw event (non-blocking) ──
            // googleWebhookService.saveRawEvent(organization, 'lead_form_submission', payload);

            // // ── Step 3: Process lead & assign via round-robin ──
            // await googleWebhookService.processLeadFormSubmission(organization, payload);

        } catch (error) {
            // Log but don't re-respond — response already sent above
            console.error('[Google Webhook] Error processing webhook:', error.message);
        }
    },

    /**
     * GET /api/webhooks/google/events?organization=X
     * Internal endpoint to view stored webhook event logs.
     */
    getEvents: async (req, res) => {
        try {
            const organization = req.query.organization || req.user?.organization;
            if (!organization) {
                return res.status(400).json(ApiResponse.error('organization is required', 400));
            }

            const { getOrganizationConnection } = await import('../config/multiTenantDb.js');
            const { getGoogleWebhookEventModel } = await import('../models/googleWebhookEvent.model.js');
            const orgConn = await getOrganizationConnection(organization);
            const GoogleWebhookEvent = getGoogleWebhookEventModel(orgConn);
            const events = await GoogleWebhookEvent.find({ organization }).sort({ createdAt: -1 }).limit(100);

            return res.status(200).json(ApiResponse.success('Events fetched successfully', events));
        } catch (error) {
            console.error('[Google Webhook] Get events error:', error);
            return res.status(error.statusCode || 500).json(
                ApiResponse.error(error.message || 'Failed to fetch events', error.statusCode || 500)
            );
        }
    },
};
