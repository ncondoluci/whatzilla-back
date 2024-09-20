import fs from 'fs';
import path from 'path';

// Ruta al archivo JSON que simulará la base de datos
const campaignsFilePath = path.join(__dirname, '..', 'data', 'campaigns.json');

// Función para leer el archivo JSON
const readCampaignsFromFile = (): any[] => {
    try {
        const data = fs.readFileSync(campaignsFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo el archivo JSON:', error);
        return [];
    }
};

// Función para escribir en el archivo JSON
const writeCampaignsToFile = (campaigns: any[]): void => {
    try {
        fs.writeFileSync(campaignsFilePath, JSON.stringify(campaigns, null, 2), 'utf-8');
        console.log('Datos guardados exitosamente.');
    } catch (error) {
        console.error('Error guardando en el archivo JSON:', error);
    }
};

// Función para agregar una nueva campaña al archivo JSON
export const addNewCampaign = (newCampaign: { id: string; user_id: string; nombre: string; created_at: string }) => {
    const campaigns = readCampaignsFromFile();
    campaigns.push(newCampaign);
    writeCampaignsToFile(campaigns);
};

// Función para obtener la campaña por ID y luego buscar el archivo de campaña correspondiente en la estructura de directorios
export const getCampaignById = (campaignId: string): string | null => {
    // Leer todas las campañas del archivo JSON
    const campaigns = readCampaignsFromFile();

    // Buscar la campaña por ID
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign) {
        console.error(`No se encontró la campaña con ID: ${campaignId}`);
        return null;
    }

    const { user_id, created_at, nombre } = campaign;

    // Extraer año, mes y día del campo created_at
    const date = new Date(created_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mes en formato 2 dígitos
    const day = String(date.getDate()).padStart(2, '0'); // Día en formato 2 dígitos

    // Construir la ruta hacia el archivo de la campaña en el directorio de uploads
    const campaignFilePath = path.resolve(
        process.cwd(),
        'src',
        'uploads',
        `${year}`,
        `${month}`,
        `${day}`,
        user_id,
        nombre // Nombre original del archivo de campaña
    );

    // Verificar si el archivo de la campaña existe
    if (!fs.existsSync(campaignFilePath)) {
        console.error(`No se encontró el archivo de la campaña en: ${campaignFilePath}`);
        return null;
    }

    // Leer el contenido de la campaña (o simplemente devolver la ruta si quieres procesarlo después)
    const campaignContent = fs.readFileSync(campaignFilePath, 'utf-8');
    
    console.log(`Campaña encontrada: ${campaignFilePath}`);
    return campaignContent; // O devolver campaignFilePath si solo necesitas la ruta
};
