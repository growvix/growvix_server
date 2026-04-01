import { googleWebhookService } from '../services/googleWebhook.service.js';
import { GoogleForm } from '../models/googleForm.model.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getGoogleMappingModel } from '../models/googleMapping.model.js';
import { getGoogleAdIntegrationModel } from '../models/googleAdIntegration.model.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export const googleWebhookController = {
    /**
     * POST /api/webhooks/google
     *
     * Flow:
     * 1. Extract google_key (secret) from req.body
     * 2. Look up the key in global_admin.google_form
     * 3. Get organization + form_id from matched document
     * 4. If integration is in test mode (status=false): store payload in google_mapping.test_data
     * 5. If integration is active (status=true): use field_mapping to create a lead
     * 6. Always respond 200 (Google requires this to stop retries)
     */
    receive: async (req, res) => {
        // Always acknowledge immediately — Google will retry on non-200
        res.status(200).send('EVENT_RECEIVED');

        try {
            const { google_key, ...payload } = req.body;
            console.log("[Google Webhook] Received payload:", JSON.stringify(req.body).substring(0, 300));

            if (!google_key) {
                console.warn('[Google Webhook] No google_key provided in payload');
                return;
            }

            // ── Step 1: Look up secret in global google_form collection ──
            const formConfig = await GoogleForm.findOne({ secret_key: google_key }).lean();
            if (!formConfig) {
                console.warn(`[Google Webhook] Invalid or unknown google_key: ${google_key}`);
                return;
            }

            const { organization, form_id, integration_id } = formConfig;
            console.log(`[Google Webhook] Matched org: ${organization} | form_id: ${form_id} | integration: ${integration_id}`);

            // ── Step 2: Get the integration and mapping from tenant DB ──
            const orgConn = await getOrganizationConnection(organization);
            const GoogleAdIntegration = getGoogleAdIntegrationModel(orgConn);
            const GoogleMapping = getGoogleMappingModel(orgConn);

            const integration = await GoogleAdIntegration.findById(integration_id);
            if (!integration) {
                console.warn(`[Google Webhook] Integration ${integration_id} not found in org ${organization}`);
                return;
            }

            if (!integration.status) {
                // ── TEST MODE: Store payload in google_mapping.test_data ──
                console.log(`[Google Webhook] Test mode — storing payload for integration ${integration_id}`);
                await GoogleMapping.findOneAndUpdate(
                    { integration_id: integration._id, organization },
                    {
                        $set: {
                            test_data: payload,
                            test_received_at: new Date(),
                        }
                    }
                );
                console.log('[Google Webhook] Test data stored successfully');
            } else {
                // ── ACTIVE MODE: Create lead using saved field_mapping ──
                console.log(`[Google Webhook] Active mode — creating lead for integration ${integration_id}`);

                // Save raw event for audit
                googleWebhookService.saveRawEvent(organization, 'lead_form_submission', payload);

                // Process lead using the field mapping
                const mapping = await GoogleMapping.findOne({ integration_id: integration._id, organization });
                await googleWebhookService.processLeadWithMapping(organization, payload, integration, mapping);
            }

        } catch (error) {
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
