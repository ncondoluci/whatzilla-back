import { Router } from "express";
import { check } from "express-validator";
import { resultsValidator } from "@/middlewares/resultsValidator";
import { getUser } from "@/controllers";

const router = Router();

// Aquí defines las rutas de campaña
router.get('/:uid', getUser);

export default router;