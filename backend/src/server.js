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
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
  })
);

// Custom rate limiter for QR sessions
const qrRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Higher limit for QR-related endpoints
});

// CORS configuration for cross-platform support
// app.use(cors({
//   origin: ['http://10.194.102.227:3000', 'http://10.0.2.2:3000', 'http://localhost:3000'],
//   credentials: true,
// }));
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
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/timeslots', timeSlotRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/audit-logs', auditRoutes);

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port: http://localhost:${PORT}`);
  console.log(`Network accessible at: http://192.168.1.5:${PORT}`);
});