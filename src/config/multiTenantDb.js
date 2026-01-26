import mongoose from 'mongoose';
import { env } from './index.js';

/**
 * Multi-Tenant Database Connection Manager
 * Manages connections to organization-specific databases
 */

const connectionCache = new Map();

const getBaseUri = () => {
    const uri = env.MONGO_URI;
    const lastSlashIndex = uri.lastIndexOf('/');
    const queryIndex = uri.indexOf('?');

    if (queryIndex !== -1 && queryIndex > lastSlashIndex) {
        return uri.substring(0, lastSlashIndex + 1);
    }
    return uri.substring(0, lastSlashIndex + 1);
};

export const getOrganizationConnection = async (organizationName) => {
    if (!organizationName) {
        throw new Error('Organization name is required');
    }
    const dbName = organizationName;
    if (connectionCache.has(dbName)) {
        const cachedConnection = connectionCache.get(dbName);
        if (cachedConnection.readyState === 1) {
            return cachedConnection;
        }
        connectionCache.delete(dbName);
    }
    const baseUri = getBaseUri();
    const orgUri = `${baseUri}${dbName}`;

    const queryIndex = env.MONGO_URI.indexOf('?');
    const queryParams = queryIndex !== -1 ? env.MONGO_URI.substring(queryIndex) : '';
    const fullUri = `${orgUri}${queryParams}`;

    try {
        const connection = await mongoose.createConnection(fullUri).asPromise();
        console.log(`Connected to organization database: ${dbName}`);
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
