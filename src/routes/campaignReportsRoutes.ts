import { Router } from "express";
import { param } from "express-validator";
import { JWTValidator, validationMiddleware } from "@/middlewares";
import { 
    getCampaignReport,
    getCampaignReports
} from "@/controllers";

const router = Router();

router.get('/:uid', [
    JWTValidator,
    param('uid').not().isEmpty().withMessage('Report UID must not be empty.')
    .isString().withMessage('Report UID must be an string.'),
    validationMiddleware
], getCampaignReport);

router.get('/', [
    JWTValidator,
    param('uid').not().isEmpty().withMessage('Report UID must not be empty.')
    .isString().withMessage('Report UID must be an string.'),
    validationMiddleware
], getCampaignReports);

export default router;