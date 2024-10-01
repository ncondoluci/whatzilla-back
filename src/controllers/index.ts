// Authentication
import { authController, registrationController } from '@/controllers/authController'

// Campaigns
import { 
    postCampaign,
    getCampaign,
    patchCampaign,
    getCampaignsList,
    deleteCampaign,
    uploadCampaign
} from '@/controllers/campaignController';

// Lists
import {
    postList,
    getList,
    patchList,
    deleteList
} from '@/controllers/listController';

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
    getCampaignsList,
    patchCampaign,
    deleteCampaign,
    uploadCampaign,

    // Lists
    postList,
    getList,
    patchList,
    deleteList,

    // Subscribers
    postSubscriber,
    getSubscriber,
    patchSubscriber,
    deleteSubscriber,

    // User
    getUser
};