import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { UploadedFile } from 'express-fileupload';
import { addNewCampaign } from '../providers/campaignService';

export const uploadCampaignFile = (req: Request, res: Response) => {
    if (!req.files || !req.files.campaignFile) {
        return res.status(400).send({ message: 'No se subió ningún archivo' });
    }

    const file = req.files.campaignFile as UploadedFile;
    const userId = req.body.userId || 'user_1234'; // Aquí obtienes el id del usuario (puede venir de la sesión o token)

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
    const userDir = path.resolve(process.cwd(), 'src', 'uploads', `${year}`, `${month}`, `${day}`, userId);

    // Verifica si la carpeta existe, si no, la crea
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    // Crea el nombre único del archivo
    const fileName = `${uniqueFileId}${fileExtension}`;
    const filePath = path.join(userDir, fileName);

    // Mueve el archivo a la ruta con el nombre único
    file.mv(filePath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ message: 'Error al mover el archivo' });
        }

        // Guardar la campaña en el archivo JSON usando el servicio
        const newCampaign = {
            id: uniqueFileId, // ID generado para el archivo
            user_id: userId,
            nombre: file.name, // Nombre original del archivo
            created_at: now.toISOString() // Fecha actual en formato ISO
        };

        addNewCampaign(newCampaign);

        // Respuesta exitosa con la información del archivo
        res.send({
            message: 'Archivo subido y campaña guardada exitosamente',
            fileId: uniqueFileId, // ID único generado
            fileName: fileName, // Nombre del archivo guardado en el servidor
            originalName: file.name, // Nombre original del archivo
            filePath: filePath,
        });
    });
};
