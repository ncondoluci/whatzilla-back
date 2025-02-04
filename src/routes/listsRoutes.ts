import { Router } from "express";
import { body, param } from "express-validator";
import { deleteList, getList, getLists, patchList, postList } from "@/controllers";
import { JWTValidator, validationMiddleware } from "@/middlewares";

const router = Router();

router.post('/', [
    JWTValidator,
    body('name')
        .not().isEmpty().withMessage('List name must not be empty.')
        .isString().withMessage('List name must be a string.'),
    validationMiddleware
], postList);

router.get('/', [
    JWTValidator,
    validationMiddleware
], getLists);

router.get('/:uid', [
    JWTValidator,
    param('uid')
        .not().isEmpty().withMessage('List UID must not be empty')
        .isString().withMessage('Invalid format for list UID'),
    validationMiddleware
], getList);

router.patch('/:uid', [
    JWTValidator,
    param('uid')
        .not().isEmpty().withMessage('List UID must not be empty')
        .isString().withMessage('Invalid format for list UID'),
    body('name')
        .optional().not().isEmpty().withMessage('List name must not be empty')
        .isString().withMessage('List name must be a string'),
    body('status')
        .optional().not().isEmpty().withMessage('List status must not be empty.')
        .isBoolean().withMessage('List status must be boolean type'),
    validationMiddleware
], patchList);

router.delete('/:uid', [
    JWTValidator,
    param('uid')
        .not().isEmpty().withMessage('List UID must not be empty')
        .isString().withMessage('Invalid format for list UID'),
    validationMiddleware
], deleteList);

export default router;