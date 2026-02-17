import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import routes from './routes/index.js';
import grpcRoutes from './routes/grpc.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { ApiResponse } from './utils/apiResponse.util.js';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Desk CRM API Docs',
}));
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Create Apollo Server
const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
});

// Start Apollo Server and apply middleware
await apolloServer.start();
app.use('/graphql', expressMiddleware(apolloServer));

// gRPC/Connect routes
app.use('/grpc', grpcRoutes);

// Routes
app.use('/api', routes);

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json(ApiResponse.error(`Route ${req.originalUrl} not found`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
