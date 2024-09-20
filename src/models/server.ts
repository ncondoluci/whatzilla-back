// libs
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Routes
import { 
    authRoutes,
    usersRoutes, 
    campaignsRoutes, 
    filesRoutes, 
    listsRoutes 
} from '../routes';

// Middlewares
import fileUpload from 'express-fileupload';
import { globalErrorHandler } from '../middlewares/GlobalErrorHandler';

// Models
import { dbConnection, closeDBConnection } from './dbConnection';
import './associations';

// Providers
import { AppError } from '../providers/ErrorProvider';

// Utils
import { logger } from '../utils/logger';

class Server {
    public app: express.Application;
    public port: string | undefined;
    private server: http.Server;
    private io: SocketIOServer;
    private paths: {
        auth: string;
        campaigns: string;
        files: string;
        lists: string;
        users: string;
    };

    private async shutdown(reason: string) {
        console.log(`Shutting down due to ${reason}`);
    
        this.server.close(async () => {
            console.log('HTTP server closed.');
    
            try {
                await closeDBConnection();
                console.log('Database connection closed.');
                process.exit(0);  // Exit the process successfully
            } catch (err) {
                logger.error('Error during shutdown', { message: err.message });
                process.exit(1);  // Exit the process with a failure status
            }
        });
    
        // If the server takes too long to close, force shutdown after a timeout
        setTimeout(() => {
            console.error('Forced shutdown due to timeout.');
            process.exit(1);  // Force shutdown after 10 seconds if not done
        }, 10000);
    }    
    
    constructor() {
        this.app = express();
        this.port = process.env.PORT || '3000';

        this.paths = {
            auth: '/api/auth',
            files: '/api/files',
            users: '/api/users',
            campaigns: '/api/campaigns',
            lists: '/api/lists'
        };

        this.server = http.createServer(this.app);
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                allowedHeaders: ['Content-Type'],
            }
        });

        this.connectDB();
        this.middlewares();
        this.routes();
        this.sockets();
        this.systemListeners();
    }

    async systemListeners() {
        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception!', { message: err.message, stack: err.stack });
            this.shutdown('Uncaught Exception');
        });

        process.on('unhandledRejection', (reason: Error) => {
            logger.error('Unhandled Rejection!', { message: reason.message, stack: reason.stack });
            this.shutdown('Unhandled Rejection');
        });

        process.on('SIGTERM', () => {
            console.log('SIGTERM received. Shutting down gracefully...');
            this.shutdown('SIGTERM');
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received (Ctrl+C). Shutting down gracefully...');
            this.shutdown('SIGINT');
        });
    }

    async connectDB() {
        await dbConnection();
    }

    private sockets() {
        // Socket.IO listeners
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('start-campaign', (campaignId: string) => {
                console.log(`Starting send campaign ID: ${campaignId}`);
            });

            socket.on('pause-campaign', () => {
                console.log('Campaign stopped');
            });

            socket.on('resume-campaign', () => {
                console.log('Campaign resumed');
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }

    private routes() {
        // Register routes
        this.app.use(this.paths.auth, authRoutes);
        this.app.use(this.paths.files, filesRoutes);
        this.app.use(this.paths.campaigns, campaignsRoutes);
        this.app.use(this.paths.lists, listsRoutes);
        this.app.use(this.paths.users, usersRoutes);

        // Catch undefined routes
        this.app.use('*', (req, res, next) => {
            next(new AppError('Route not found', 404));
        });

        // Global error handler
        this.app.use(globalErrorHandler);
    }

    private middlewares() {
        // CORS
        this.app.use(cors());

        // Body parsing
        this.app.use(express.json());

        // Public directory
        this.app.use(express.static('public'));

        // File upload
        this.app.use(
            fileUpload({
                useTempFiles: true,
                tempFileDir: '/tmp/',
                createParentPath: true,
            })
        );
    }

    public listen() {
        // Use this.server.listen instead of this.app.listen
        this.server.listen(this.port, () => {
            console.log('Server running on port:', this.port);
        });
    }
}

export default Server;
