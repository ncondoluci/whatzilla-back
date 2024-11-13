import { logger } from "@/config/logger";
import { Server } from "socket.io";
let io: Server;
export const sendMessage = async (client, data) => {
    await client.sendMessage(data.chatId, data.message)
    .then( response => {
      logger.info(`Message sent to ${data.chatId}`);
    })
    .catch( error => {
      logger.error(`Error sending message to ${data.chatId}: `, error.message);
    });
}   