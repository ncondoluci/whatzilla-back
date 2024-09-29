// Authentication
import { authController, registrationController } from './authController'

// Campaigns
import { getCampaignList } from './campaignController';

// Files
import { uploadCampaignFile } from './fileUploadController';

import {
    getUser
} from './userController';

export {
    // Authentication
    authController,
    registrationController,

    // Campaigns
    getCampaignList,

    // Files
    uploadCampaignFile,

    // User
    getUser
};