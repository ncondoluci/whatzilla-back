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
    startCampaign,
    stopCampaign,
    resumeCampaign,
    resetCampaign
} from '@/controllers/campaignController';

import {
    getCampaignReport,
    getCampaignReports
} from '@/controllers/campaignReportController';

// Lists
import {
    postList,
    getList,
    getLists,
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

// Tests
import { 
    readCampaignFile,
    throwUncaughtException,
    sendMail
} from './testsController';

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
    startCampaign,
    stopCampaign,
    resumeCampaign,
    resetCampaign,

    // CampaignReports
    getCampaignReport,
    getCampaignReports,

    // Lists
    postList,
    getList,
    getLists,
    patchList,
    deleteList,

    // Subscribers
    postSubscriber,
    getSubscriber,
    patchSubscriber,
    deleteSubscriber,

    // User
    getUser,

    // Test Controllers
    readCampaignFile,
    throwUncaughtException,
    sendMail
};