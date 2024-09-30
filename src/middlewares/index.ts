
import {
    authMiddleware
} from '@/middlewares/authMiddleware';

// import {

// } from '@/middlewares/campaignsMiddleware';

import {
    globalErrorHandler
} from '@/middlewares/GlobalErrorHandler';

import {
    JWTValidator
} from '@/middlewares/JWTValidator';

// import {    

// } from '@/middlewares/listsMiddleware';

import {
    validationMiddleware
} from '@/middlewares/resultsValidatorMiddleware';

// import {

// } from '@/middlewares/usersMiddleware';

export {
    authMiddleware,
    globalErrorHandler,
    JWTValidator,
    validationMiddleware
}