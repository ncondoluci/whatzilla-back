import { Client, LocalAuth } from 'whatsapp-web.js';
import { EventEmitter } from 'events';
import WhatsAppSession from '@/models/WhatsAppSession';
import path from 'path';

class WhatsAppSessionManager extends EventEmitter {
  private sessions: Map<string, Client>;

  constructor() {
    super();
    this.sessions = new Map();
  }

  async startSession(userId: string, io: any): Promise<Client> {
    let client = this.sessions.get(userId);
  
    if (!client) {
      client = new Client({
        authStrategy: new LocalAuth({
          clientId: userId,
          dataPath: path.join(process.cwd(), '/src', '/sessions')
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          devtools: false
        }
      });

      let qrAttempts = 0;
      const maxAttempts = 3;

      client.on('qr', (qr: string) => {
        qrAttempts += 1;
        console.log(`Sending QR for user ${userId} - Attempt ${qrAttempts}`);
        
        // Enviar QR solo si no hemos alcanzado el límite
        if (qrAttempts <= maxAttempts) {
          io.to(`user_${userId}`).emit("qr", {
            success: true,
            message: `QR generated. Please scan to authenticate. Attempt ${qrAttempts} of ${maxAttempts}.`,
            qr
          });
        }

        // Si se alcanzó el límite de intentos, desconectar la sesión
        if (qrAttempts >= maxAttempts) {
          console.log(`Max QR attempts reached for user ${userId}. Cancelling session.`);
          client.destroy();  // Destruir la sesión si se alcanzan los intentos máximos
          io.to(`user_${userId}`).emit("sessionStatus", {
            success: false,
            message: "Max QR attempts reached. Session has been cancelled."
          });
        }
      });
  
      client.on('ready', async () => {
        console.log(`WhatsApp session ready for user ${userId}`);
        
        const existingSession = await WhatsAppSession.findOne({ where: { user_id: userId } });
  
        if (!existingSession) {
          await WhatsAppSession.create({
            user_id: userId,
            session_data: null,
            is_active: true
          });
        } else {
          await WhatsAppSession.update({ is_active: true }, { where: { user_id: userId } });
        }
  
        io.to(`user_${userId}`).emit("sessionStatus", {
          success: true,
          message: "WhatsApp session ready. You can start sending messages."
        });
      });
  
      client.on('disconnected', async () => {
        console.log(`WhatsApp session disconnected for user ${userId}`);
        await WhatsAppSession.update({ is_active: false }, { where: { user_id: userId } });
        this.sessions.delete(userId);
  
        io.to(`user_${userId}`).emit("sessionStatus", {
          success: true,
          message: "WhatsApp session disconnected."
        });
      });
  
      client.initialize();
      this.sessions.set(userId, client);
    }
  
    return client;
  }

  async restoreSession(userId: string, io: any): Promise<Client | null> {
    const existingSession = await WhatsAppSession.findOne({ where: { user_id: userId, is_active: true } });
  
    if (existingSession) {
      console.log(`Restoring session for user ${userId}`);
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: userId,
          dataPath: path.join(process.cwd(), '/src', '/sessions')
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          devtools: false
        }
        });

        client.initialize();
      this.sessions.set(userId, client);
  
      io.to(`user_${userId}`).emit("sessionStatus", {
        success: true,
        message: "WhatsApp session restored. You can start sending messages."
      });
  
      return client;
    }
  
    return null;
  }
}

export const whatsappSessionManager = new WhatsAppSessionManager();
