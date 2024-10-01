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
        console.log(this.user_id)
        try {
            // Obtiene la fecha actual
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');

            // Genera un ID único para el archivo (este será el id de la campaña también)
            const uniqueFileId = uuidv4();
            
            // Obtén la extensión del archivo para mantener su tipo
            const fileExtension = path.extname(file.name);
            
            // Construye la ruta dinámica desde la raíz del proyecto usando process.cwd()
            const userDir = path.resolve(process.cwd(), 'src', 'uploads', `${year}`, `${month}`, `${day}`, this.user_id);
            
            // Verifica si la carpeta existe, si no, la crea
            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
            }

            // Crea el nombre único del archivo
            const fileName = `${uniqueFileId}${fileExtension}`;
            const filePath = path.join(userDir, fileName);

            // Mueve el archivo a la ruta con el nombre único
            await this.moveFile(file, filePath);


            // Guarda la campaña en la base de datos
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
