import { Router } from "express";
import { check } from "express-validator";
import { resultsValidator } from "../middlewares/resultsValidator";

const router = Router();

// Aquí defines las rutas de campaña
router.get('/', (req, res) => {
    res.send('List of lists');
});

export default router;