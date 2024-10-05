import { Request, Response, NextFunction } from "express";
import { AppError }     from "@/providers/ErrorProvider";
import Campaign         from '@/models/Campaign';
import { sendResponse } from '@/utils/customResponse';
import CampaignProvider from '@/providers/campaignProvider';
import redisClient      from '@/config/redis';

export const postCampaign = async ( req: Request, res: Response, next: NextFunction ) => {
  const { name, user_id  } = req.body;

  try {
    const campaign = await Campaign.create({ name, user_id});

    return sendResponse(res, 201, {
      success: true,
      message: "Campaign created.",
      campaign
    });

  } catch (error) {
    next(new AppError({ message: 'Internal server error.', statusCode: 500, isOperational: false }));
  }
}

export const getCampaign = async ( req: Request, res: Response, next: NextFunction ) => {
  const { uid } = req.params;

  try {
    const campaign = await Campaign.findOne({
      where: {
        uid
    }});

    if ( !campaign ) {
      return next(new AppError({ message: `Campaign with ID ${uid} not found`, statusCode: 404 }));
    }

    return sendResponse(res, 200, {
      success: true,
      message: 'Campaign found.',
      campaign
    });

  } catch (error) {
    next(new AppError({ message: "Internal server error", statusCode: 500, isOperational: false }));
  }
}

export const getCampaignsList = async ( req: Request, res: Response, next: NextFunction ) => {
  const { uid: user_id } = req.user;

  try {
    const campaigns = await Campaign.findAll({
      where: {
        user_id
    }});

    if ( !campaigns ) {
      return next(new AppError({ message: `Campaigns not found for this user`, statusCode: 404 }));
    }

    return sendResponse(res, 200, {
      success: true,
      message: 'Campaigns found.',
      campaigns
    });

  } catch (error) {
    next(new AppError({ message: "Internal server error", statusCode: 500, isOperational: false }));
  }
}

export const patchCampaign = async ( req: Request, res: Response, next: NextFunction ) => {
  const { uid } = req.params;
  const { list_id, name, status } = req.body;

  const data: any = {};

  if ( list_id ) {
    data.list_id = list_id;
  }
  if ( name ) {
    data.name = name;
  }
  if( status ) {
    data.status = status;
  }

  try {
    const [affectedRows] = await Campaign.update(data, {
      where: { uid }
    });

    if (affectedRows < 1) {
      return next(new AppError({ message: 'Campaign not found.', statusCode: 404 }));
    }

    return sendResponse( res, 200, {
      success: true,
      message: 'Campaign updated.',
    });

  } catch (error) {
    next(new AppError({ message: 'Internal server error.', statusCode:500, isOperational: false }));
  }
} 

export const deleteCampaign = async ( req: Request, res: Response, next: NextFunction ) => {
  const { uid } = req.params;

  try {
    const affectedRows = await Campaign.destroy({
      where: { uid },
    });
    
    if (affectedRows === 0) {
      return next(new AppError({ message: 'Campaign not found.', statusCode: 404 }));
    }

    return sendResponse( res, 200, {
      success: true,
      message: 'Campaign deleted successfully.'
    });

  } catch (error) {
    next(new AppError({
      message: 'Internal server error.',
      statusCode: 500,
      isOperational: false
    }));
  }
}

export const uploadCampaign = async ( req: Request, res: Response, next: NextFunction ) => {
  const { file } = req.files; 
  const user_id = req.user.uid;
  
  try {
      const campaignProvider = new CampaignProvider(user_id);
      await campaignProvider.uploadCampaignFile(file);

      return sendResponse(res, 200, {
        success: true,
        message: 'Campaign file uploaded and saved successfully.' 
      });

  } catch (error) {
      console.error('Error details:', error);
      next(new AppError({ message: 'Failed to upload campaign', statusCode: 500 }));
  }
};

export const pauseCampaign = async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.params;

  await Campaign.update({ status: 'paused' }, { where: { uid } });

  redisClient.hset(`campaign:${uid}`, 'status', 'paused');

  res.status(200).send('Campaign paused');
};

export const resumeCampaign = async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.params;

  await Campaign.update({ status: 'active' }, { where: { uid } });

  redisClient.hset(`campaign:${uid}`, 'status', 'active');

  res.status(200).send('Campaign resumed');
};

export const cancelCampaign = async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.params;

  await Campaign.update({ status: 'cancelled' }, { where: { uid } });

  redisClient.hset(`campaign:${uid}`, 'status', 'cancelled');

  res.status(200).send('Campaign cancelled');
};