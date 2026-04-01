import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { env } from './config/index.js';
import { User } from './models/user.model.js';
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

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads/mail-templates', express.static(path.join(__dirname, '../uploads/mail_templates')));
app.use('/uploads/mail_templates', express.static(path.join(__dirname, '../uploads/mail_templates')));
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
app.use('/graphql', expressMiddleware(apolloServer, {
    context: async ({ req }) => {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('permissions role profile');
                if (user) {
                    return { user };
                }
            } catch (err) {
                console.error('[GraphQL Context] Token verification failed:', err.message);
            }
        }
        return { user: null };
    },
}));

// gRPC/Connect routes
app.use('/grpc', grpcRoutes);

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send("hii");
});
// Routes
app.use('/api', routes);

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json(ApiResponse.error(`Route ${req.originalUrl} not found`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
