import { Server, Socket } from 'socket.io';
import { JWTValidatorSocket } from '@/middlewares/JWTValidator';

export const initializeCampaignSockets = (io: Server): void => {
  io.use(JWTValidatorSocket); // Valida el token JWT

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    const userId = socket.user.uid;
    socket.join(`user_${userId}`);
    console.log(`User with ID ${userId} joined the room.`);

    socket.on('campaignProgress', (data) => {
      const { campaignId, progress } = data;

      io.to(`user_${userId}`).emit('campaignProgress', {
        campaignId,
        progress,
      });
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log(`Client with ID ${socket.id} disconnected.`);
    });
  });
};
