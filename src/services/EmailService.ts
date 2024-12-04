import { logger } from "@/config/logger";
import { Transporter, SendMailOptions } from "nodemailer";
import { IMailData } from "@/interfaces/Emails";


class EmailService {
    private transporter: Transporter;

    constructor(smtpTransport: Transporter) {
        this.transporter = smtpTransport;
    }

    async sendMail(mailOptions: SendMailOptions): Promise<any> {
        return await this.transporter.sendMail(mailOptions);
    }
}

export default EmailService;
