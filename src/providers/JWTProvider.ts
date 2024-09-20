import jwt from 'jsonwebtoken';

const JWTProvider = (uid: string = '', role: string = ''): Promise<string | undefined> => {
  return new Promise((resolve, reject) => {
    const payload = { uid, role };

    jwt.sign(
      payload,
      process.env.JWT_SECRET_PRIVATE_KEY!, 
      {
        expiresIn: '2h',
      },
      (err, token) => {
        if (err) {
          console.error('An error ocurred while JWT was generated', err);
          reject(err);
        } else {
          resolve(token);
        }
      },
    );
  });
};

export default JWTProvider;
