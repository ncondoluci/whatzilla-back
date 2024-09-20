import { Server } from 'socket.io';

export const setupWebSocket = (server: any) => {
  const io = new Server(server);

  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('start-campaign', (campaignId: string) => {
      console.log(`Iniciando envío de la campaña con ID: ${campaignId}`);
      // Lógica de envío aquí...
    });

    socket.on('pause-campaign', () => {
      console.log('Campaña pausada');
    });

    socket.on('resume-campaign', () => {
      console.log('Campaña reanudada');
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
};
