// Authentication
import { authController, registrationController } from './authController'

// Campaigns
import { getCampaignList } from './campaignController';

// Files
import { uploadCampaignFile } from './fileUploadController';

export {
    // Authentication
    authController,
    registrationController,

    // Campaigns
    getCampaignList,

    // Files
    uploadCampaignFile
};