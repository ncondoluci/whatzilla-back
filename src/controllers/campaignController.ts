import { Request, Response } from "express"
import fs from 'fs';
import path from "path";

export const getCampaignList = ( req: Request, res: Response ) => {
    // const { userId } = req.params; // Obtiene el userId de los parámetros de la ruta
    const userId = 'user_1234';
    // Ruta base donde se almacenan los archivos de los usuarios
    const baseDir = path.resolve('src', 'uploads');
  
    // Se define la ruta del directorio del usuario
    const userDir = path.join(baseDir, '**', '**', '**', userId); // Puedes ajustar los niveles si la estructura es más compleja
  
    try {
      // Verifica si el directorio existe
      if (!fs.existsSync(baseDir)) {
        return res.status(404).json({ message: 'No se encontró la carpeta base' });
      }
  
      // Encuentra todos los archivos en las carpetas del usuario
      const files = findFilesForUser(userId, baseDir);
      
      if (files.length === 0) {
        return res.status(404).json({ message: 'No se encontraron archivos para este usuario' });
      }
  
      // Devuelve la lista de archivos
      return res.status(200).json({
        message: 'Archivos encontrados',
        files: files
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error al obtener los archivos' });
    }
};

export const sendCampaign = (req: Request, res: Response) => {
  const campaignId = req.params.id;

  // Buscar la campaña por ID
  const campaign = getCampaignById(campaignId);

  if (!campaign) {
    return res.status(404).send({ message: 'Campaña no encontrada' });
  }

  // Iniciar el envío de la campaña
  startCampaign(io, campaign);

  res.send({ message: 'Campaña iniciada', campaignId: campaignId });
}

// Función para buscar archivos dentro de las carpetas de usuario
const findFilesForUser = (userId: string, baseDir: string): string[] => {
    let filesList: string[] = [];
  
    // Recursivamente buscar archivos dentro de las carpetas del usuario
    const readDirRecursively = (dir: string) => {
      const files = fs.readdirSync(dir);
  
      files.forEach((file) => {
        const filePath = path.join(dir, file);
  
        if (fs.lstatSync(filePath).isDirectory()) {
          // Si es una carpeta, llama recursivamente
          readDirRecursively(filePath);
        } else {
          // Si es un archivo, agrega a la lista
          if (filePath.includes(userId)) {
            filesList.push(filePath);
          }
        }
      });
    };
  
    // Inicia la búsqueda en la base del directorio
    readDirRecursively(baseDir);
  
    return filesList;
}