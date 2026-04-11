// services/locationService.js
import { UserLocation } from '../models/userLocation.js';
import { User } from '../models/user.model.js';

/**
 * Store a new location point for a user.
 * @param {Object} data - Location payload.
 * @param {string} data.userId - UUID of the user.
 * @param {number|string} data.latitude - Latitude.
 * @param {number|string} data.longitude - Longitude.
 * @param {number} [data.accuracy] - Accuracy in meters.
 * @param {string} [data.provider] - GPS provider (gps, network, etc.).
 * @param {Date|string} [data.timestamp] - Timestamp of the reading.
 * @returns {Promise<Object>} The saved document.
 */
export async function storeLocation({ userId, latitude, longitude, accuracy, provider, timestamp }) {
  const ts = timestamp ? new Date(timestamp) : new Date();
  const location = new UserLocation({
    userId,
    latitude,
    longitude,
    accuracy,
    provider,
    timestamp: ts,
  });
  
  const savedLocation = await location.save();

  // Update last known location in user model for quick access (dashboard/live view)
  await User.findByIdAndUpdate(userId, {
    $set: {
      lastKnownLocation: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        updatedAt: ts
      }
    }
  });

  return savedLocation;
}

/**
 * Retrieve location history for a user.
 * @param {string} userId - UUID of the user.
 * @param {Object} options - Pagination options.
 * @param {number} [options.limit=100] - Max number of records.
 * @param {number} [options.offset=0] - Number of records to skip.
 * @returns {Promise<Array>} Array of location documents sorted by timestamp descending.
 */
export async function getLocationHistory(userId, { limit = 100, offset = 0 } = {}) {
  return await UserLocation.find({ userId })
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

// Future: add real‑time subscription (WebSocket/SSE) support.
