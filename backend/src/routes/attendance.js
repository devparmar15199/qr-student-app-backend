import mongoose from 'mongoose';
import express from 'express';
import { 
  submitAttendance,
  syncAttendance,
  getAllAttendance,
  manualAttendance,
  getAttendanceByStudent,
  getAttendanceByClass,
} from '../controllers/attendanceController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';
import { 
  validate,
  attendanceValidation,
  syncAttendanceValidation,
  manualAttendanceValidation,
  dateQueryValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// Middleware to validate ObjectId
const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[paramName])) {
    return res.status(400).json({ error: `Invalid ${paramName}` });
  }
  next();
};

// Student routes
router.post('/', authMiddleware, roleMiddleware(['student']), validate(attendanceValidation), submitAttendance);
router.post('/sync', authMiddleware, roleMiddleware(['student']), validate(syncAttendanceValidation), syncAttendance);

// Teacher and Admin routes
router.use(authMiddleware, roleMiddleware(['teacher', 'admin']));
router.post('/manual', validate(manualAttendanceValidation), manualAttendance);
router.get('/records', validate(dateQueryValidation), getAllAttendance);
router.get('/records/student/:studentId', validateObjectId('studentId'), validate(dateQueryValidation), getAttendanceByStudent);

// Teacher, Admin, and enrolled Student access
router.get(
  '/records/class/:classId',
  authMiddleware,
  async (req, res, next) => {
    if (req.user.role === 'student') {
      const enrollment = await mongoose.model('ClassEnrollment').findOne({
        classId: req.params.classId,
        studentId: req.user._id,
        isActive: true,
      });
      if (!enrollment) {
        return res.status(403).json({ error: 'Not enrolled in this class' });
      }
    }
    next();
  },
  validateObjectId('classId'),
  validate(dateQueryValidation),
  getAttendanceByClass
);

export default router;
