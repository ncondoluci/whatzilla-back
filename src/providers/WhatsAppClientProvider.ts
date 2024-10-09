import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { Server as SocketIOServer } from 'socket.io';

class WhatsAppClient {
    private client: Client;
    private io: SocketIOServer;

    constructor(io: SocketIOServer) {
        this.io = io;
        this.client = new Client({
            authStrategy: new LocalAuth(),
        });

        this.initializeClient();
    }

    private initializeClient(): void {
        this.client.on('qr', (qr: string) => {
            qrcode.toDataURL(qr, (err: Error | null, url: string) => {
                if (err) {
                    console.error('Error generating QR:', err);
                    return;
                }
                this.io.emit('qrCode', url);
            });
        });

        this.client.on('ready', () => {
            this.io.emit('message', 'WhatsApp is ready');
        });

        this.client.on('disconnected', () => {
            this.io.emit('message', 'WhatsApp disconnected');
        });

        this.client.initialize();
    }

    // Expose the client events to the external code
    public on(event: string, callback: (...args: any[]) => void): void {
        this.client.on(event, callback);
    }

    public sendMessage(number: string, message: string): Promise<any> {
        const chatId = `${number}@c.us`;
        return this.client.sendMessage(chatId, message);
    }
}

export const createWhatsAppClient = (io: SocketIOServer): WhatsAppClient => {
    return new WhatsAppClient(io);
};
