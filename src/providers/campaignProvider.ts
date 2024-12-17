import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';
import * as XLSX from 'xlsx';
import { AppError } from '@/providers/ErrorProvider';
import Campaign from '@/models/Campaign';

class CampaignProvider {
    private user_id: string;

    private static HEADINGS = [
        'NOMBRE',
        'PAIS',
        'MENSAJE',
        // 'CODIGO_PAIS',
        // 'PREFIJO_WHATSAPP',
        'CODIGO_AREA',
        'NUMERO_LOCAL',
        'NUMERO_COMPLETO'
    ];

    private async moveFile(file: UploadedFile, filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            file.mv(filePath, (err: any) => {
                if (err) {
                    reject(new AppError({ message: 'Error moving file', statusCode: 500, isOperational: false }));
                } else {
                    resolve();
                }
            });
        });
    }

    private async saveCampaignToDB(campaignData: any): Promise<any> {
        try {
            const newCampaign = await Campaign.create(campaignData);
            return newCampaign;
        } catch (error) {
            throw new AppError({ message: 'Database error while saving campaign', statusCode: 500, isOperational: false, data: error });
        }
    }

    constructor(user_id: string) {
        this.user_id = user_id;
    }

    public async uploadCampaignFile(file: UploadedFile): Promise<void> {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');

            const uniqueFileId = uuidv4();
            const fileExtension = path.extname(file.name);
            const userDir = path.resolve(process.cwd(), 'dist','src', 'uploads', `${year}`, `${month}`, `${day}`, this.user_id);

            // Verificar si el directorio existe
            try {
                await fs.access(userDir);
            } catch (error) {
                // Si no existe el directorio, crear uno
                await fs.mkdir(userDir, { recursive: true });
            }

            const fileName = `${uniqueFileId}${fileExtension}`;
            const filePath = path.join(userDir, fileName);

            await this.moveFile(file, filePath);

            const newCampaign = await this.saveCampaignToDB({
                uid: uniqueFileId,
                user_id: this.user_id,
                name: file.name,
                created_at: now.toISOString(),
            });

            if (!newCampaign) {
                throw new AppError({ message: 'Failed to save campaign to the database', statusCode: 500, isOperational: true });
            }
        } catch (error) {
            throw error instanceof AppError ? error : new AppError({ message: 'Error processing campaign file', statusCode: 500, isOperational: false, data: error });
        }
    }

    public async getCampaignData(campaignId: string): Promise<any[]> {
        try {
            const campaign = await Campaign.findOne({
                where: { uid: campaignId },
                attributes: ['createdAt', 'user_id'],
            });

            if (!campaign) {
                throw new AppError({ message: `Campaign with ID ${campaignId} not found`, statusCode: 404, isOperational: true });
            }

            const createdAt = new Date(campaign.createdAt);
            const year = createdAt.getFullYear();
            const month = (`0${createdAt.getMonth() + 1}`).slice(-2);
            const day = (`0${createdAt.getDate()}`).slice(-2);

            const userId = campaign.user_id;
            const filePath = path.join(
                process.cwd(),
                `/dist/src/uploads/${year}/${month}/${day}/${userId}/${campaignId}.xlsx`
            );

            const fileBuffer = await fs.readFile(filePath);

            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const campaignData = XLSX.utils.sheet_to_json(worksheet);

            return campaignData;
        } catch (error) {
            throw new AppError({ message: 'Failed to read campaign file', statusCode: 500, isOperational: false, data: error });
        }
    }
    
    private static checkHeadings(headings: string[]): boolean {
        return headings.every((heading, i) => heading === this.HEADINGS.at(i));
    }

    private static checkData(data: string[][]): boolean {
        return data.every(row => row.every(item => item !== ''));
    }

    public static validateData(fileData: string[][]): boolean {
        if (fileData.length <= 1) {
            throw new AppError({ message: 'File is empty', statusCode: 400 });
        }

        const headingsValid = this.checkHeadings(fileData[0] || []);
        if (!headingsValid) {
            throw new AppError({ message: 'Headings do not match expected values.', statusCode: 400 });
        }

        const dataValid = this.checkData(fileData.slice(1));
        if (!dataValid) {
            throw new AppError({ message: 'Some data rows contain empty values.', statusCode: 400 });
        }

        return true;
    }
    
}

export default CampaignProvider;

