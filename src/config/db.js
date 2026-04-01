import mongoose from 'mongoose';
import { env } from './index.js';

export const connectDB = async () => {
    try {
        let uri = env.MONGO_URI;
        
        // Ensure connection to global_admin database
        // Find the index of the first '?' (query params start)
        const queryIndex = uri.indexOf('?');
        const basePath = queryIndex !== -1 ? uri.substring(0, queryIndex) : uri;
        const queryParams = queryIndex !== -1 ? uri.substring(queryIndex) : '';
        
        // If basePath doesn't end with a database name (ends with / or port), append global_admin
        if (basePath.endsWith('/')) {
            uri = `${basePath}global_admin${queryParams}`;
        } else if (!basePath.split('/').pop().includes(':')) {
            // Already has something after the last slash that isn't a host/port
            // But we want to enforce global_admin specifically for this connection
            const lastSlashIndex = basePath.lastIndexOf('/');
            uri = `${basePath.substring(0, lastSlashIndex + 1)}global_admin${queryParams}`;
        } else {
            uri = `${basePath}/global_admin${queryParams}`;
        }

        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected to Global Admin: ${conn.connection.name}`);
    } catch (error) {
        console.error(`Error connecting to global admin: ${error.message}`);
        process.exit(1);
    }
};
