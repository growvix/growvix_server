import mongoose from 'mongoose';
import { env } from './index.js';

/**
 * Multi-Tenant Database Connection Manager
 * Manages connections to organization-specific databases
 * 
 * Optimized for performance with:
 * - Cached base URI computation
 * - Connection pooling
 * - Timeout and retry options
 * - Efficient connection reuse
 */

const connectionCache = new Map();

// Cache base URI and query params once (avoid recomputation)
let cachedBaseUri = null;
let cachedQueryParams = null;

const getBaseUri = () => {
    if (cachedBaseUri !== null) {
        return cachedBaseUri;
    }

    const uri = env.MONGO_URI;
    const lastSlashIndex = uri.lastIndexOf('/');
    const queryIndex = uri.indexOf('?');

    cachedBaseUri = uri.substring(0, lastSlashIndex + 1);
    cachedQueryParams = queryIndex !== -1 ? uri.substring(queryIndex) : '';

    return cachedBaseUri;
};

const getQueryParams = () => {
    if (cachedQueryParams === null) {
        getBaseUri(); // This will populate cachedQueryParams
    }
    return cachedQueryParams;
};

// Connection options for optimal performance
const connectionOptions = {
    maxPoolSize: 50,          // Maximum connections in pool
    minPoolSize: 5,           // Keep minimum connections ready
    serverSelectionTimeoutMS: 5000,  // Timeout for server selection
    socketTimeoutMS: 45000,   // Socket timeout
    maxIdleTimeMS: 30000,     // Close idle connections after 30s
};

export const getOrganizationConnection = async (organizationName) => {
    if (!organizationName) {
        throw new Error('Organization name is required');
    }

    const dbName = organizationName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Fast path: return cached connection if ready
    const cachedConnection = connectionCache.get(dbName);
    if (cachedConnection) {
        if (cachedConnection.readyState === 1) {
            return cachedConnection;
        }
        // Connection is stale, remove it
        connectionCache.delete(dbName);
    }

    // Build connection URI
    const fullUri = `${getBaseUri()}${dbName}${getQueryParams()}`;

    try {
        const connection = await mongoose.createConnection(fullUri, connectionOptions).asPromise();

        // Only log in development to reduce I/O overhead
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Connected to organization database: ${dbName}`);
        }

        connectionCache.set(dbName, connection);
        return connection;
    } catch (error) {
        console.error(`Failed to connect to organization database ${dbName}:`, error.message);
        throw error;
    }
};

export const closeOrganizationConnection = async (organizationName) => {
    const dbName = organizationName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (connectionCache.has(dbName)) {
        const connection = connectionCache.get(dbName);
        await connection.close();
        connectionCache.delete(dbName);
        console.log(`Closed connection to organization database: ${dbName}`);
    }
};

export const closeAllOrganizationConnections = async () => {
    for (const [dbName, connection] of connectionCache) {
        await connection.close();
        console.log(`Closed connection to organization database: ${dbName}`);
    }
    connectionCache.clear();
};

/**
 * Get the count of active connections
 */
export const getActiveConnectionCount = () => {
    return connectionCache.size;
};
