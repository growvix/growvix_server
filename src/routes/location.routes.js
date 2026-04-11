// routes/location.routes.js
import { Router } from 'express';
import { storeLocation, getLocationHistory } from '../services/locationService.js';
import { protect } from '../middleware/auth.middleware.js'; 

const router = Router();

// POST /api/location - receive location data from mobile app
router.post('/', protect, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, provider, timestamp } = req.body;
    const userId = req.user.id; // auth middleware should attach user
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    const location = await storeLocation({
      userId,
      latitude,
      longitude,
      accuracy,
      provider,
      timestamp,
    });
    return res.status(201).json({ message: 'Location stored', location });
  } catch (err) {
    console.error('Error storing location', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/location/:userId - fetch location history (paginated)
router.get('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const history = await getLocationHistory(userId, { limit, offset });
    return res.json({ history });
  } catch (err) {
    console.error('Error fetching location history', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
