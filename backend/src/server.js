import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import classRoutes from './routes/classes.js';
import scheduleRoutes from './routes/schedule.js';
import qrRoutes from './routes/qr.js';
import attendanceRoutes from './routes/attendance.js';
import timeSlotRoutes from './routes/timeSlot.js';
import roomRoutes from './routes/rooms.js';
import auditRoutes from './routes/audit.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Security middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again later.',
  })
);

// Custom rate limiter for QR sessions
const qrRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Higher limit for QR-related endpoints
  message: 'Too many QR requests from this IP, please try again later.',
});

// Custom rate limiter for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Lower limit for auth endpoints
  message: 'Too many authentication attempts from this IP, please try again later.',
});

// CORS configuration for cross-platform support
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Connect to MongoDB
connectDB();

// API Home Route
app.get('/', (req, res) => {
  res.send('Attendance API is up and running...🚀');
});

// Routes
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/qr', qrRateLimit, qrRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/timeslots', timeSlotRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/audit-logs', auditRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port: http://localhost:${PORT}`);
});