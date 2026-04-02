import mongoose from 'mongoose';
import { env } from '../config/index.js';

/**
 * Replicate Organization Schema
 * This script copies collection names and indices from one organization database to another
 * without copying any data.
 */

const SOURCE_ORG = 'growvix';
const TARGET_ORG = 'lml';

async function replicateSchema() {
    console.log(`🚀 Starting schema replication from "${SOURCE_ORG}" to "${TARGET_ORG}"...`);

    const uri = env.MONGO_URI;
    const lastSlashIndex = uri.lastIndexOf('/');
    const basePath = uri.substring(0, lastSlashIndex + 1);
    const queryIndex = uri.indexOf('?');
    const queryParams = queryIndex !== -1 ? uri.substring(queryIndex) : '';

    const sourceUri = `${basePath}${SOURCE_ORG}${queryParams}`;
    const targetUri = `${basePath}${TARGET_ORG}${queryParams}`;

    let sourceConn, targetConn;

    try {
        // Connect to Source
        console.log(`📡 Connecting to source database: ${SOURCE_ORG}`);
        sourceConn = await mongoose.createConnection(sourceUri).asPromise();
        
        // Connect to Target
        console.log(`📡 Connecting to target database: ${TARGET_ORG}`);
        targetConn = await mongoose.createConnection(targetUri).asPromise();

        // Get all collections from source
        const collections = await sourceConn.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name).filter(name => !name.startsWith('system.'));

        console.log(`📋 Found ${collectionNames.length} collections to replicate.`);

        for (const name of collectionNames) {
            console.log(`🔹 Replicating collection: ${name}`);
            
            // Create collection in target
            await targetConn.db.createCollection(name);
            
            // Get indices from source
            const sourceColl = sourceConn.db.collection(name);
            const indices = await sourceColl.indexes();
            
            // Create indices in target (skipping the default _id index)
            const targetColl = targetConn.db.collection(name);
            for (const index of indices) {
                if (index.name === '_id_') continue;
                
                console.log(`  🔸 Creating index: ${index.name}`);
                const { key, ...options } = index;
                await targetColl.createIndex(key, options);
            }
        }

        console.log(`✅ Successfully replicated schema to "${TARGET_ORG}"!`);
    } catch (error) {
        console.error('❌ Error during replication:', error.message);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
        process.exit(0);
    }
}

replicateSchema();
