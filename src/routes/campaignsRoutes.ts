import { Router } from "express";
import { body, param } from "express-validator";
import { fileValidator, JWTValidator, validationMiddleware } from "@/middlewares";
import { 
    postCampaign, 
    getCampaign, 
    getCampaignsList, 
    patchCampaign, deleteCampaign, 
    uploadCampaign, 
    startCampaign, 
    stopCampaign,
    resumeCampaign, 
    resetCampaign,
} from "@/controllers";

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

router.post('/upload', [
    JWTValidator,
    fileValidator,
    validationMiddleware
], uploadCampaign);

router.get('/', [
    JWTValidator,
    validationMiddleware
], getCampaignsList);

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

router.post('/start/:uid', [
    JWTValidator,
    param('uid')
    .not().isEmpty().withMessage('Campaign UID must not be empty')
    .isString().withMessage('Invalid format for campaign UID'),
    validationMiddleware
], startCampaign);

router.post('/stop/:uid', [
    JWTValidator,
    param('uid')
    .not().isEmpty().withMessage('Campaign UID must not be empty')
    .isString().withMessage('Invalid format for campaign UID'),
    validationMiddleware
], stopCampaign);

router.post('/resume/:uid', [
    JWTValidator,
    param('uid')
    .not().isEmpty().withMessage('Campaign UID must not be empty')
    .isString().withMessage('Invalid format for campaign UID'),
    validationMiddleware
], resumeCampaign);

router.post('/reset/:uid', [
    JWTValidator,
    param('uid')
    .not().isEmpty().withMessage('Campaign UID must not be empty')
    .isString().withMessage('Invalid format for campaign UID'),
    validationMiddleware
], resetCampaign);

export default router;