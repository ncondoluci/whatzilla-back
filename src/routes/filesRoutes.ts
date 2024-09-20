import { Router } from "express";
import { check } from "express-validator";
import { resultsValidator } from "../middlewares/resultsValidator";
import { uploadCampaignFile } from "../controllers/fileUploadController";

const router = Router();

// Aquí defines las rutas de campaña
router.get('/', (req, res) => {
    res.send('List of files');
});

export default router;