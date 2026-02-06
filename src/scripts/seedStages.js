import mongoose from 'mongoose';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadStageModel } from '../models/leadStage.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const stagesData = {
    "_id": { "$oid": "697b58a889885f63af2f9f84" },
    "stages": [
        { "id": 1, "name": "new lead", "color": "#3498db", "nextStages": [2, 3, 4, 5] },
        { "id": 2, "name": "prospect", "color": "#2ecc71", "nextStages": [5, 4] },
        { "id": 3, "name": "not qualified", "color": "#e74c3c", "nextStages": [2] },
        { "id": 4, "name": "lost", "color": "#7f8c8d", "nextStages": [2, 5] },
        { "id": 5, "name": "site visit schedule", "color": "#f1c40f", "nextStages": [4, 6] },
        { "id": 6, "name": "site visit done", "color": "#9b59b6", "nextStages": [4, 7, 5] },
        { "id": 7, "name": "booking done", "color": "#1abc9c", "nextStages": [8] },
        { "id": 8, "name": "booking cancelled", "color": "#c0392b", "nextStages": [2, 5] }
    ]
};

// You can pass the organization ID as a command line argument
const organizationId = process.argv[2];

if (!organizationId) {
    console.error('Please provide an organization ID as an argument.');
    process.exit(1);
}

const seedStages = async () => {
    try {
        console.log(`Connecting to organization: ${organizationId}`);
        const connection = await getOrganizationConnection(organizationId);
        const LeadStage = getLeadStageModel(connection);

        console.log('Seeding stages...');

        // Check if stages already exist
        const existingStages = await LeadStage.findOne({ organization: organizationId });

        if (existingStages) {
            console.log('Stages configuration already exists. Updating...');
            existingStages.stages = stagesData.stages;
            await existingStages.save();
        } else {
            console.log('Creating new stages configuration...');
            await LeadStage.create({
                organization: organizationId,
                stages: stagesData.stages
            });
        }

        console.log('Stages seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding stages:', error);
        process.exit(1);
    }
};

seedStages();
