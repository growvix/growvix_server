import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/index.js';

const startServer = async () => {
    await connectDB();

    app.listen(env.PORT, () => {
        console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
};

startServer();
