// Authentication
import { authController, registrationController } from '@/controllers/authController'

// Campaigns
import { 
    postCampaign,
    getCampaign,
    patchCampaign,
    deleteCampaign
} from '@/controllers/campaignController';

// Lists
import {
    postList,
    getList,
    patchList,
    deleteList
} from '@/controllers/listController';

// Files
import { uploadCampaignFile } from '@/controllers/fileUploadController';

// Subscribers
import { 
    postSubscriber,
    getSubscriber,
    patchSubscriber,
    deleteSubscriber
} from '@/controllers/subscriberController';

// Users
import {
    getUser
} from '@/controllers/userController';

export {
    // Authentication
    authController,
    registrationController,

    // Campaigns
    postCampaign,
    getCampaign,
    patchCampaign,
    deleteCampaign,

    // Lists
    postList,
    getList,
    patchList,
    deleteList,

    // Files
    uploadCampaignFile,

    // Subscriber
    postSubscriber,
    getSubscriber,
    patchSubscriber,
    deleteSubscriber,

    // User
    getUser
};