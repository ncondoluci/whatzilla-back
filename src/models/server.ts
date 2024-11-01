// libs
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Sockets
import { initializeSockets } from '@/sockets/Sockets';

// Routes
import { 
    authRoutes,
    usersRoutes, 
    campaignsRoutes, 
    campaignReportsRoutes,
    listsRoutes,
    subscribersRoutes,
    whatsappSessions,
    testsRoutes 
} from '@/routes';

// Middlewares
import fileUpload from 'express-fileupload';
import { globalErrorHandler } from '@/middlewares/globalErrorHandler';

// Models
import { dbConnection, closeDBConnection } from '@/models/dbConnection';
import '@/models/associations';

// Providers
import { AppError } from '@/providers/ErrorProvider';

// Utils
import { logger } from '@/config/logger';
import { initializeJobQueue } from '@/queues/campaignQueues';

class Server {
    public app: express.Application;
    public port: string | undefined;
    private server: http.Server;
    private io: SocketIOServer;
    private paths: {
        auth: string;
        campaigns: string;
        lists: string;
        users: string;
        subscribers: string;
        whatsappSessions: string;
        campaignReports: string;
        tests: string;
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
                if (err instanceof Error) {
                    logger.error('Error during shutdown', { message: err.message });
                } else {
                    logger.error('Unknown error during shutdown', { message: String(err) });
                }
                process.exit(1);  // Exit the process with a failure status
            }
        });
    
        // If the server takes too long to close, force shutdown after a timeout
        setTimeout(() => {
            console.error('Forced shutdown due to timeout.');
            process.exit(1);  // Force shutdown after 10 seconds if not done
        }, 10000);
    };
    
    constructor() {
        this.app = express();
        this.port = process.env.PORT || '3000';

        this.paths = {
            auth: '/api/auth',
            users: '/api/users',
            campaigns: '/api/campaigns',
            campaignReports: '/api/campaignReports',
            lists: '/api/lists',
            subscribers: '/api/subscribers',
            whatsappSessions: '/api/whatsappSessions',
            tests: '/api/tests',
        };

        this.server = http.createServer(this.app);
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                allowedHeaders: ['Content-Type'],
            }
        });
        this.app.set('io', this.io);
        
        this.systemListeners();
        this.connectDB();
        this.middlewares();
        this.routes();
        this.sockets();
        this.initializeQueues();
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
        initializeSockets(this.io);
    }

    private initializeQueues() {
        initializeJobQueue(this.io);
    }

    private routes() {
        // Register routes
        this.app.use(this.paths.auth, authRoutes);
        this.app.use(this.paths.campaigns, campaignsRoutes);
        this.app.use(this.paths.campaignReports, campaignReportsRoutes);
        this.app.use(this.paths.lists, listsRoutes);
        this.app.use(this.paths.users, usersRoutes);
        this.app.use(this.paths.subscribers, subscribersRoutes);
        this.app.use(this.paths.whatsappSessions, whatsappSessions);
        this.app.use(this.paths.tests, testsRoutes);

        // Catch undefined routes
        this.app.use('*', (req: Request, res: Response, next: NextFunction) => {
            next(new AppError({ message: 'Route not found', statusCode: 404 }));
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
        this.server.listen(this.port, () => {
            console.log('Server running on port:', this.port);
        });
    }
}

export default Server;
