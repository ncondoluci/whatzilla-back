// Authentication
import { authController, registrationController } from '@/controllers/authController'

// Campaigns
import { 
    initializeCampaign,
    postCampaign,
    getCampaign,
    patchCampaign,
    getCampaignsList,
    deleteCampaign,
    uploadCampaign,
    startCampaign,
    createWhatsAppSession,
    stopCampaign,
    resumeCampaign,
    cancelCampaign
} from '@/controllers/campaignController';

import {
    getCampaignReport,
    getCampaignReports
} from '@/controllers/campaignReportController';

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

// WhatsAppSessions
import { 
    patchSession
} from '@/controllers/whatsappSessionController';

import { readCampaignFile } from './testsController';

export {
    // Authentication
    authController,
    registrationController,

    // Campaigns
    initializeCampaign,
    postCampaign,
    getCampaign,
    getCampaignsList,
    patchCampaign,
    deleteCampaign,
    uploadCampaign,
    startCampaign,
    createWhatsAppSession,
    stopCampaign,
    resumeCampaign,
    cancelCampaign,

    // CampaignReports
    getCampaignReport,
    getCampaignReports,

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

    // WhatsAppSessions
    patchSession,

    // Test Controllers
    readCampaignFile
};