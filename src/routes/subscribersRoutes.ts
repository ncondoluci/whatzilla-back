import { Router } from "express";
import { body, param } from "express-validator";
import { JWTValidator, validationMiddleware } from "@/middlewares";
import { 
    deleteSubscriber, 
    getSubscriber, 
    patchSubscriber, 
    postSubscriber 
} from "@/controllers";

const router = Router();

router.post('/', [
    JWTValidator,
    body('first_name')
        .not().isEmpty().withMessage('Subscriber´s first name must not be empty.')
        .isString().withMessage('Subscriber´s first name must be a string.'),
    body('last_name')
        .not().isEmpty().withMessage('Subscriber´s last name must not be empty.')
        .isString().withMessage('Subscriber´s last name must be a string.'),
    body('email')
        .not().isEmpty().withMessage('Subscriber´s email must not be empty.')
        .isEmail().withMessage('Subscriber´s email wrong format.'),
    body('status')
        .optional().not().isEmpty().withMessage('Subscriber´s status must not be empty.')
        .isIn(['unsuscribed', 'confirmed', 'blacklisted']).withMessage('Subscriber´s status must be one of "unsuscribed", "confirmed", "blacklisted".'),
    body('list_id')
        .not().isEmpty().withMessage('Subscriber´s subscription list UID must not be empty.')
        .isString().withMessage('Invalid format for subscription list UID'),
    validationMiddleware
], postSubscriber);

router.get('/:uid', [
    JWTValidator,
    param('uid')
        .not().isEmpty().withMessage('Subscriber UID must not be empty')
        .isString().withMessage('Invalid format for subscribir UID'),
    validationMiddleware
], getSubscriber);

router.patch('/:uid', [
    JWTValidator,
    param('uid')
        .not().isEmpty().withMessage('Subscriber UID must not be empty')
        .isString().withMessage('Invalid format for campaign_uid'),
    body('first_name')
        .optional().not().isEmpty().withMessage('Subscriber´s first name must not be empty.')
        .isString().withMessage('Subscriber´s first name must be a string.'),
    body('last_name')
        .optional().not().isEmpty().withMessage('Subscriber´s last name must not be empty.')
        .isString().withMessage('Subscriber´s last name must be a string.'),
    body('email')
        .optional().not().isEmpty().withMessage('Subscriber´s email must not be empty.')
        .isEmail().withMessage('Subscriber´s email wrong format.'),
    body('status')
        .optional().not().isEmpty().withMessage('Subscriber´s status must not be empty.')
        .isBoolean().withMessage('Subscriber´s status must be a string.'),
    body('list_id')
        .optional().not().isEmpty().withMessage('Subscriber´s subscription list UID must not be empty.')
        .isString().withMessage('Invalid formar for subscription list UID'),
    validationMiddleware
], patchSubscriber);

router.delete('/:uid', [
    JWTValidator,
    param('uid')
        .not().isEmpty().withMessage('Subscriber UID must not be empty')
        .isString().withMessage('Invalid format for Subscriber UID'),
    validationMiddleware
], deleteSubscriber);

export default router;