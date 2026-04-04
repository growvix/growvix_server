import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getOrganizationConnection } from './src/config/multiTenantDb.js';
import { getSourceModel } from './src/models/source.model.js';

dotenv.config();

// Connect to main DB to get org connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB.');
    
    // Default organization name used in local development setup (or change this if needed)
    const organization = 'Growvix'; 
    const orgConn = await getOrganizationConnection(organization);
    const Source = getSourceModel(orgConn);

    const defaultSources = [
      { name: 'Google Ads', organization },
      { name: 'Facebook Ads', organization },
      { name: 'Instagram', organization },
      { name: 'JustDial', organization },
      { name: '99Acres', organization },
      { name: 'MagicBricks', organization },
      { name: 'Offline Walk-in', organization },
      { name: 'Channel Partner', organization },
      { name: 'Referral', organization }
    ];

    try {
      const inserted = await Source.insertMany(defaultSources);
      console.log(`Successfully seeded ${inserted.length} sources into DB for organization: ${organization}.`);
    } catch (err) {
      if (err.code === 11000) {
        console.log('Some sources already exist or duplicate key error.');
      } else {
        console.error('Error inserting sources:', err);
      }
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
