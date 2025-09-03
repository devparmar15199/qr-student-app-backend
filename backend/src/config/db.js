import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose
      .connect(process.env.MONGO_URI, {
        dbName: 'attendanceApp',
        tls: true,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
    });

    logger.info('MongoDB connected');
    console.log('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export default connectDB;