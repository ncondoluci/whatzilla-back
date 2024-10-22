import path from 'path';
import { EventEmitter } from 'events';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { logger } from '@/config/logger';
import WhatsAppSession from '@/models/WhatsAppSession';

class WhatsAppSessionManager extends EventEmitter {
  private sessions: Map<string, Client>;
  
  private emitWhatsAppSessionEvent(io: any, userId: string, event: string, payload: any) {
    io.to(`user_${userId}`).emit("whatsAppSession", {
      event,
      ...payload
    });
  }

  constructor() {
    super();
    this.sessions = new Map();
  }

  public async startSession(userId: string, io: any): Promise<Client> {
    let client = this.sessions.get(userId);

    try {
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
          try {
            qrAttempts += 1;
            logger.info(`Sending QR for user ${userId} - Attempt ${qrAttempts}`);

            if (qrAttempts <= maxAttempts) {
              this.emitWhatsAppSessionEvent(io, userId, "qr", {
                message: `QR generated. Please scan to authenticate. Attempt ${qrAttempts} of ${maxAttempts}.`,
                qr
              });
            }

            if (qrAttempts >= maxAttempts) {
              logger.info(`Max QR attempts reached for user ${userId}. Cancelling session.`);
              client.destroy();

              this.emitWhatsAppSessionEvent(io, userId, "disconnected", {
                message: "Max QR attempts reached. Session has been cancelled."
              });
            }
          } catch (error) {
            logger.error(`Error while generating QR for user ${userId}:`, { error });
          }
        });

        client.on('ready', async () => {
          try {
            logger.info(`WhatsApp session ready for user ${userId}`);
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

            this.emitWhatsAppSessionEvent(io, userId, "ready", {
              message: "WhatsApp session ready. You can start sending messages."
            });
          } catch (error) {
            logger.error(`Error initializing session for user ${userId}:`, { error });
          }
        });

        client.on('disconnected', async () => {
          try {
            logger.log(`WhatsApp session disconnected for user ${userId}`);
            await WhatsAppSession.update({ is_active: false }, { where: { user_id: userId } });
            this.sessions.delete(userId);

            this.emitWhatsAppSessionEvent(io, userId, "disconnected", {
              message: "WhatsApp session disconnected."
            });
          } catch (error) {
            logger.error(`Error during disconnection for user ${userId}:`, { error });
          }
        });

        client.initialize();
        this.sessions.set(userId, client);
      } 

      return client;
    } catch (error) {
      logger.error(`Error starting session for user ${userId}:`, { error });
      throw error; // Lanza el error para ser gestionado en el flujo donde se esté llamando.
    }
  }

  public async restoreSession(userId: string, io: any): Promise<Client | null> {
    try {
      logger.info(`Attempting to restore session for user ${userId}`);
      const existingSession = await WhatsAppSession.findOne({ where: { user_id: userId, is_active: 1 } });

      if (existingSession) {
        logger.info(`Restoring session for user ${userId}`);
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

        this.emitWhatsAppSessionEvent(io, userId, "ready", {
          message: "WhatsApp session restored. You can start sending messages."
        });

        return client;
      }

      return null;
    } catch (error) {
      logger.error(`Error restoring session for user ${userId}:`, { error });
      throw error; // Lanza el error para que sea manejado en la capa superior.
    }
  }

  public async sendMessage(userId: string, message: string, recipient: string, io: any): Promise<void> {
    try {
      let client = this.sessions.get(userId);
      if (!client) {
        client = await this.restoreSession(userId, io);
      }

      if (!client.info?.wid) {
        logger.warn(`Restoring session for user ${userId}...`);
        await this.restoreSession(userId, io);

        const restoredClient = this.sessions.get(userId);
        if (!restoredClient?.info?.wid) {
          logger.warn(`Session restoration not ready for user ${userId}. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos antes de reintentar.
          
          const retryClient = this.sessions.get(userId);
          if (!retryClient?.info?.wid) {
            throw new Error(`Unable to restore session for user ${userId}`);
          }
        }
        
      }
      
      const recipientNumber = `${recipient}@c.us`; 
      const messageId = await client.sendMessage(recipientNumber, message);
  
      this.emitWhatsAppSessionEvent(io, userId, "messageSent", {
        message: `Message sent to ${recipient}`,
        recipient,
        messageId,
        messageContent: message
      });
  
      logger.info(`Message sent to ${recipient}: ${messageId}`);
    } catch (error) {
      logger.error(`Error sending message for user ${userId} to ${recipient}:\n`, { message: error.message, stack: error.stack });
  
      this.emitWhatsAppSessionEvent(io, userId, "error", {
        message: `Error sending message to ${recipient}`,
        recipient,
        error: error.message
      });
  
      throw error;
    }
  }
}

export const whatsappSessionManager = new WhatsAppSessionManager();
