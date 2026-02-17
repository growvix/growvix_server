import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './index.js';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Desk CRM API',
            version: '1.0.0',
            description: 'API documentation for Desk CRM application',
            contact: {
                name: 'Desk CRM',
            },
        },
        servers: [
            {
                url: `http://localhost:${env.PORT}`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: { type: 'object' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                    },
                },
                Lead: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', format: 'uuid' },
                        profile_id: { type: 'number' },
                        organization: { type: 'string' },
                        profile: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                email: { type: 'string' },
                                phone: { type: 'string' },
                                location: { type: 'string' },
                            },
                        },
                        requirement: {
                            type: 'object',
                            properties: {
                                location: { type: 'string' },
                                budget: { type: 'string' },
                                bathroom: { type: 'number' },
                                parking: { type: 'number' },
                                floor: { type: 'string' },
                                facing: { type: 'string' },
                            },
                        },
                        project: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                        acquired: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    campaign: { type: 'string' },
                                    source: { type: 'string' },
                                    sub_source: { type: 'string' },
                                    received: { type: 'string', format: 'date-time' },
                                    created_at: { type: 'string', format: 'date-time' },
                                    medium: { type: 'string' },
                                },
                            },
                        },
                        stage: { type: 'string' },
                        status: { type: 'string' },
                    },
                },
                LeadListItem: {
                    type: 'object',
                    properties: {
                        lead_id: { type: 'string' },
                        profile_id: { type: 'number' },
                        name: { type: 'string' },
                        campaign: { type: 'string' },
                        source: { type: 'string' },
                        sub_source: { type: 'string' },
                        received: { type: 'string' },
                    },
                },
                Project: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        organization: { type: 'string' },
                        location: { type: 'string' },
                        group: { type: 'string' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        organization: { type: 'string' },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management endpoints' },
            { name: 'Leads', description: 'Lead management endpoints' },
            { name: 'Projects', description: 'Project management endpoints' },
            { name: 'Upload', description: 'File upload endpoints' },
            { name: 'gRPC', description: 'gRPC/Connect protocol endpoints' },
        ],
    },
    apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
