import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { ivrService } from '../services/ivr.service.js';

const router = Router();

/**
 * @route   POST /api/ivr-call
 * @desc    Initiate an IVR outbound call via MCube vendor API
 * @access  Protected (requires auth token)
 * @body    { organization, userId, leadId }
 */
router.post('/', protect, async (req, res) => {
    const { organization, userId, leadId } = req.body;

    console.log('=== IVR Call Request Received ===');
    console.log('Organization:', organization);
    console.log('User ID (caller):', userId);
    console.log('Lead ID:', leadId);
    console.log('================================');

    if (!organization || !userId || !leadId) {
        return res.status(400).json({
            success: false,
            message: 'organization, userId, and leadId are required',
        });
    }

    try {
        const result = await ivrService.initiateCall(organization, userId, leadId);
        return res.status(200).json({
            success: true,
            message: 'IVR call initiated successfully',
            data: result,
        });
    } catch (err) {
        console.error('IVR Call Error:', err.message);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to initiate IVR call',
        });
    }
});

export default router;
