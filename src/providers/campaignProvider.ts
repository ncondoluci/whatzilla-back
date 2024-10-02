import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';
import { AppError } from '@/providers/ErrorProvider';
import Campaign from '@/models/Campaign';

class CampaignProvider {
    private user_id: string;

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
            
            const userDir = path.resolve(process.cwd(), 'src', 'uploads', `${year}`, `${month}`, `${day}`, this.user_id);
            
            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
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
                throw new AppError({ message: 'Failed to save campaign to the database', statusCode: 500 });
            }
        } catch (err) {
            throw new AppError({ message: 'Error uploading campaign file', statusCode: 500 });
        }
    }

    private async moveFile(file: UploadedFile, filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            file.mv(filePath, (err: any) => {
                if (err) {
                    reject(new AppError({ message: 'Error moving file', statusCode: 500 }));
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
            throw new AppError({ message: 'Database error while saving campaign', statusCode: 500 });
        }
    }
}

export default CampaignProvider;
