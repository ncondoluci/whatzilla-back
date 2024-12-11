import { Transporter, SendMailOptions } from "nodemailer";
class EmailService {
    private transporter: Transporter;

    constructor(smtpTransport: Transporter) {
        this.transporter = smtpTransport;
    }

    /**
     * Envía un correo electrónico utilizando el transporte configurado.
     * @param {SendMailOptions} mailOptions - Datos del correo (to, from, subject, html).
     * @returns {Promise<any>} - Promesa que se resuelve si el envío es exitoso.
     **/
    async sendMail(mailOptions: SendMailOptions): Promise<any> {
        return await this.transporter.sendMail(mailOptions);
    }
}

export default EmailService;
