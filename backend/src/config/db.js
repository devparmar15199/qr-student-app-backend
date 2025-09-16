import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose
      .connect(process.env.MONGO_URI, {
        dbName: 'attendanceApp',
        tls: true,
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