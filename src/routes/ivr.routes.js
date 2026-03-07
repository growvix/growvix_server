import { Router } from 'express';
import { ivrService } from '../services/ivr.service.js';

const router = Router();

/**
 * @route   POST /api/ivr-call
 * @desc    Initiate an IVR outbound call via MCube vendor API
 */
router.post('/', async (req, res) => {
    const { organization, userId, assignedUser, clientPhone, leadId, leadName } = req.body;

    console.log('=== IVR Call Request Received ===');
    console.log('Organization:', organization);
    console.log('User ID (caller):', userId);
    console.log('Assigned User:', assignedUser);
    console.log('Client Phone (lead):', clientPhone);
    console.log('Lead ID:', leadId);
    console.log('Lead Name:', leadName);
    console.log('================================');

    if (!organization || !userId || !clientPhone) {
        return res.status(400).json({
            success: false,
            message: 'organization, userId, and clientPhone are required',
        });
    }

    try {
        const result = await ivrService.initiateCall(organization, userId, clientPhone);
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
