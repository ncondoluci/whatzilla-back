import { Server, Socket } from 'socket.io';
import { JWTValidatorSocket } from '@/middlewares/JWTValidator';
import { logger } from '@/config/logger';
import { userState } from './socketManager';

export const initializeSockets = (io: Server): void => {
  io.use(JWTValidatorSocket); // Valida el token JWT
  
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    const userId = socket.user.uid;
    userState.set(userId, { socketId: socket.id });

    socket.on('sendMessage', (msg: string) => {
      logger.info(msg);
      socket.emit('receiveMessage', msg);
    })

    socket.on('disconnect', () => {
      logger.info(`Client with ID ${socket.id} disconnected.`);
      userState.delete(userId);
    });

  })
};
