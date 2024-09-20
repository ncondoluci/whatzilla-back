import { Response } from 'express';

/**
 * Sends a JSON response to the client using the Express response object.
 * 
 * @param {Response} res - The Express response object.
 * @param {number} statusCode - The HTTP status code to send.
 * @param {object} data - The response body that will be sent in JSON format.
 * @returns {Response} The Express response object configured with the status code and specified data.
 */
const sendResponse = (res: Response, statusCode: number, data: object): Response => {
    return res.status(statusCode).json(data);
};

export { sendResponse };
