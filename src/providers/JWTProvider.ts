import jwt from 'jsonwebtoken';
import { AppError } from '@/providers/ErrorProvider';

const JWTProvider = (uid: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const payload = { uid };

    jwt.sign(
      payload,
      process.env.JWT_SECRET_PRIVATE_KEY!,
      {
        expiresIn: '2h',
      },
      (err, token) => {
        if (err) {
          reject(new AppError({
            message: 'Error generating JWT token.',
            statusCode: 500,
            isOperational: false,
            data: err
          }));
        } else {
          resolve(token!);
        }
      },
    );
  });
};

export default JWTProvider;
