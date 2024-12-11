import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';
import { UploadedFile } from 'express-fileupload';
import * as XLSX from 'xlsx';
import { AppError } from '@/providers/ErrorProvider';
import CampaignProvider from '@/providers/campaignProvider';

export const preprocessFile = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.files || !req.files.file) {
    return next(new AppError({ message: 'No file uploaded.', statusCode: 400 }));
  }

  const file = Array.isArray(req.files.file) ? req.files.file[0] : (req.files.file as UploadedFile);

  try {
    const fileBuffer = await fs.readFile(file.tempFilePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

    req.fileData = rows; 

    next();
  } catch (error) {
    next(new AppError({ message: 'An error occurred while processing the XLSX file.', statusCode: 500 }));
  }
};

export const fileMaxRowsAllowed = (maxRows: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows: string[][] = req.fileData ?? [];
      const rowsWithoutHeader = rows.slice(1);

      if (rowsWithoutHeader.length > maxRows) {
        return next(
          new AppError({
            message: `File exceeds the maximum allowed line count of ${maxRows} (excluding the header).`,
            statusCode: 400,
          })
        );
      }

      next();
    } catch (error) {
      next(new AppError({ message: 'An error occurred during max rows validation.', statusCode: 500 }));
    }
  };
};

export const fileDataValidation = (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows: string[][] = req.fileData ?? [];
    const isValid = CampaignProvider.validateData(rows);
    if (!isValid) {
      return next(
        new AppError({
          message: 'File data contains errors or does not meet validation criteria.',
          statusCode: 400,
        })
      );
    }

    next();
  } catch (error) {
    if(error instanceof AppError) {
      return next(error);
    }
    
    next(new AppError({ message: 'An error occurred during file data validation.', statusCode: 500 }));
  }
};
