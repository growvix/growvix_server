import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const UserLocationSchema = new Schema(
  {
    _id: { type: mongoose.Schema.Types.UUID, default: uuidv4 },
    userId: { type: mongoose.Schema.Types.UUID, required: true, index: true },
    latitude: { type: mongoose.Schema.Types.Decimal128, required: true },
    longitude: { type: mongoose.Schema.Types.Decimal128, required: true },
    accuracy: { type: Number },
    provider: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { collection: 'user_locations', timestamps: false }
);

export const UserLocation = mongoose.model('UserLocation', UserLocationSchema);
