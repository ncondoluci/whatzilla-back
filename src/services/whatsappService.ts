import { Client } from 'whatsapp-web.js';

export const createWhatsAppClientForUser = (userUid: string): Client => {
  const whatsappClient = new Client();
  whatsappClient.initialize();
  return whatsappClient;
};
