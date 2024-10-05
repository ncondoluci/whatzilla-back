// Authentication
import { authController, registrationController } from '@/controllers/authController'

// Campaigns
import { 
    postCampaign,
    getCampaign,
    patchCampaign,
    getCampaignsList,
    deleteCampaign,
    uploadCampaign,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign
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

import {
    startMockCampaignFromFile
} from '@/controllers/mockController';

import { readCampaignFile } from './testsController';

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
    pauseCampaign,
    resumeCampaign,
    cancelCampaign,

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
    getUser,

    // Mock
    startMockCampaignFromFile,

    // Test Controllers
    readCampaignFile
};