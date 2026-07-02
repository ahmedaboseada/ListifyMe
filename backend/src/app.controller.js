import express from 'express';
import connectDB from './config/DB.js';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';

import userRouter from './modules/userModel/user.controller.js';
import taskRouter from './modules/taskModel/task.controller.js';
import projectRouter from './modules/projectModel/project.controller.js';
import rewardRouter from './modules/rewardModel/reward.controller.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { startSubscriptionCron } from './cron/subscription.cron.js';
import { startWeeklyPointsReset, startDailyDeadlineReminders } from './utils/index.js';

const app = express();

export const bootstrap = async () => {
    // Connect to database
    await connectDB();

    // Start background cron schedulers
    startWeeklyPointsReset();
    startDailyDeadlineReminders();

    // Body parsing middlewares
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: true, limit: '100kb' }));

    // Security & Logging
    app.use(cors());
    app.use(morgan('dev'));
    app.use(
        helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
        }),
    );

    // Rate Limiting
    const limiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        limit: 60,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: (req, res, next) => next(Object.assign(new Error('Too many requests'), { status: 429 })),
    });
    app.use(limiter);

    // Health Endpoint
    app.get(['/health', '/api/v1/health'], (req, res) => {
        const state = mongoose.connection.readyState; // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        const dbStatus = state === 1 ? 'connected' : state === 2 ? 'connecting' : state === 3 ? 'disconnecting' : 'disconnected';
        res.status(200).json({
            ok: true,
            service: 'ListifyMe Backend',
            env: process.env.NODE_ENV,
            db: dbStatus,
            timestamp: new Date().toISOString(),
        });
    });

    // Main Routes
    app.use('/users', userRouter);
    app.use('/tasks', taskRouter);
    app.use('/projects', projectRouter);
    app.use('/rewards', rewardRouter);



    // Static upload folder (if needed later)
    app.use('/uploads', express.static('uploads'));

    // Error Handlers
    app.use(notFound);
    app.use(errorHandler);

    // Start background jobs
    startSubscriptionCron();

    // Start Serverless / Local port listener
    if (!process.env.VERCEL) {
        const PORT = process.env.PORT || 8000;
        app.listen(PORT, '0.0.0.0', () => console.log(`Server is running on port ${PORT} and accessible locally`));
    }

    return app;
};
