import { Router } from "express";
import { check } from "express-validator";
import { resultsValidator } from "../middlewares/resultsValidator";
import { getCampaignList } from "../controllers";

const router = Router();

router.get('/', (req, res) => {
    res.send('List of campaigns');
});


export default router;