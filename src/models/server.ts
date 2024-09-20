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

// Services
import dbConnection from './dbConnection';
import './associations';
// Logger
// import logger from '../../config/logger'; 
// Registra listeners
// import '../jobs/listeners';

class Server {
    public  app: express.Application;
    public  port: string | undefined;
    private server: http.Server;
    private io: SocketIOServer;
    private paths: {
        auth:  string;
        campaigns: string;
        files: string;
        lists: string;
        users: string;
    };

    constructor() {
        this.app  = express();
        this.port = process.env.PORT;

        this.paths = {
            auth:      '/api/auth',
            files:     '/api/files',
            users:     '/api/users',
            campaigns: '/api/campaigns',
            lists:     '/api/lists'
        };

        this.server = http.createServer(this.app);

        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                allowedHeaders: ['Content-Type'],
            }
        });

        this.sockets();

        this.connectDB();

        // Middlewares
        this.middlewares();

        // Rutas
        this.routes();
    }

    async connectDB() {
        await dbConnection();
    }

    private middlewares() {
        // CORS
        this.app.use(cors());

        // Lectura y parseo del body
        this.app.use(express.json());

        // Directorio público
        this.app.use(express.static('public'));

        // FileUpload - carga de archivos
        this.app.use(
            fileUpload({
                useTempFiles: true,
                tempFileDir: '/tmp/',
                createParentPath: true,
            }),
        );
    }

    private routes() {
        this.app.use( this.paths.auth, authRoutes );
        this.app.use( this.paths.files, filesRoutes );
        this.app.use( this.paths.campaigns, campaignsRoutes );
        this.app.use( this.paths.lists, listsRoutes );
        this.app.use( this.paths.users, usersRoutes );

        // Manejo global de errores
        this.app.use(( err: any, req: Request, res: Response, next: NextFunction ) => {
            // Loguea el error en la consola del servidor para depuración
            console.error(err);
            // Envía una respuesta de error al cliente
            res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Internal server error',
                campoAñadido: "Global"
            });
        });
    }

    private sockets() {
        // Listeners de socket.io
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('start-campaign', (campaignId: string) => {
                console.log(`Starting send campaign ID: ${campaignId}`);
                // Lógica para iniciar la campaña (ejemplo: startCampaign(socket, campaignId))
            });

            socket.on('pause-campaign', () => {
                console.log('Campaign stoped');
            });

            socket.on('resume-campaign', () => {
                console.log('Campaign resumed');
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected: ', socket.id);
            });
        });
    }

    public listen() {
        // Cambiar de this.app.listen a this.server.listen
        this.server.listen(this.port, () => {
            console.log('Server running in port: ', this.port);
        });
    }
}

export default Server;
