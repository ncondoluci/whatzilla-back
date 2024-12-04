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

// Queues and jobs
import { initializeQueueSocket } from '@/queues/campaignQueues';
import { safeJobTerminator } from '@/queues/safeJobsTerminator';
// Utils
import { logger } from '@/config/logger';
import { createSmtpTransport } from '@/config/nodeMailer';
import { Transport } from 'nodemailer';
import EmailService from '@/services/EmailService';
import { errorTemplate } from '@/templates/errorTemplate';


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

    private async shutdown(reason: string, error?: string) {
        console.log(`Shutting down due to ${reason}`);

        try {
            // Notifies admin via email
            const transporter: Transport = createSmtpTransport();
            const mailer = new EmailService(transporter);
            const template = errorTemplate(`Shutting down due to: ${reason}`, error ?? reason);
            const emailData ={
                to: 'nicolas@cantalupe.com.ar',
                from: process.env.NODE_MAILER_USER,
                subject: `Whatzilla shutting down due to:  ${reason}`,
                html: template
            }
            await mailer.sendMail(emailData);
            
            console.log('ENotification email sent.');
        } catch (err) {
            logger.error('Error during email sending', { message: err instanceof Error ? err.message : String(err) });
        }

        try {
            // Closes all jobs
            await safeJobTerminator();
            console.log('All jobs terminated safely.');
        } catch (err) {
            logger.error('Error during job termination', { message: err instanceof Error ? err.message : String(err) });
        }
    
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
        }, 30000);
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
        this.initializeQueueSocket();
    }

    async systemListeners() {
        // Compatibilidad con Windows para capturar SIGINT de manera confiable
        if (process.platform === "win32") {
            const rl = require("readline").createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.on("SIGINT", async () => {
                await this.shutdown('Uncaught Exception');
                process.emit("SIGINT");
            });
        } else {
            process.on('SIGINT', async () => {
                console.log('SIGINT received (Ctrl+C). Shutting down gracefully...');
                process.exit(0); // Cerrar el proceso después del cierre ordenado
            });
        }

        // Manejar excepciones no capturadas
        process.on('uncaughtException', async (err) => {
            logger.error('Uncaught Exception!', { message: err.message, stack: err.stack });
            await this.shutdown('Uncaught Exception', err.message);
        });

        // Manejar promesas rechazadas sin manejar
        process.on('unhandledRejection', async (reason: Error) => {
            logger.error('Unhandled Rejection!', { message: reason.message, stack: reason.stack });
            await this.shutdown('Unhandled Rejection', reason.message);
        });

        // Manejar señal SIGTERM (cierre por el sistema)
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received. Shutting down gracefully...');
            await this.shutdown('SIGTERM');
            process.exit(0); // Cerrar el proceso después del cierre ordenado
        });

    }

    async connectDB() {
        await dbConnection();
    }

    private sockets() {
        initializeSockets(this.io);
    }

    private initializeQueueSocket() {
        initializeQueueSocket(this.io);
    }

    private routes() {
        // Register routes
        this.app.use(this.paths.auth, authRoutes);
        this.app.use(this.paths.campaigns, campaignsRoutes);
        this.app.use(this.paths.campaignReports, campaignReportsRoutes);
        this.app.use(this.paths.lists, listsRoutes);
        this.app.use(this.paths.users, usersRoutes);
        this.app.use(this.paths.subscribers, subscribersRoutes);
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
