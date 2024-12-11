import { Request } from 'express';
import { UploadedFile } from 'express-fileupload'; 

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
      } | undefined;
      files?: {
        file?: UploadedFile;
      };
      fileData?: string[][];
    }
  }
}
