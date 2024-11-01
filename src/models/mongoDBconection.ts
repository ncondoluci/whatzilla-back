import mongoose from 'mongoose';
import { MongoStore } from 'wwebjs-mongo';

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    console.log('MongoDB is already connected');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

export const getMongoStore = () => {
  if (!isConnected) {
    throw new Error('Database is not connected');
  }

  return new MongoStore({ mongoose });
};
