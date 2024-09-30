import { Router } from "express";
import { body, param } from "express-validator";
import { JWTValidator, validationMiddleware } from "@/middlewares";
import { postCampaign, getCampaign, patchCampaign, deleteCampaign } from "@/controllers";

const router = Router();

router.post('/', [
    JWTValidator,
    body('name')
        .not().isEmpty().withMessage('Campaign name must not be empty.')
        .isString().withMessage('Campaign name must be a string.'),
    body('user_id')
        .not().isEmpty().withMessage('User UID must not be empty.')
        .isString().withMessage('Invalid formar for user_id'),
    validationMiddleware
], postCampaign);

router.get('/:uid', [
    JWTValidator,
    param('uid')
        .not().isEmpty().withMessage('Campaign UID must not be empty')
        .isString().withMessage('Invalid format for campaign_uid'),
    validationMiddleware
], getCampaign);

router.patch('/:uid', [
    JWTValidator,
    param('uid')
        .not().isEmpty().withMessage('Campaign UID must not be empty')
        .isString().withMessage('Invalid format for campaign_uid'),
    body('name')
        .optional().isString().withMessage('Invalid format for campaign_uid')
        .not().isEmpty().withMessage('Campaign UID must not be empty'),
    validationMiddleware
], patchCampaign);

router.delete('/:uid', [
    JWTValidator,
    param('uid')
        .not().isEmpty().withMessage('Campaign UID must not be empty')
        .isString().withMessage('Invalid format for campaign UID'),
    validationMiddleware
], deleteCampaign);

export default router;