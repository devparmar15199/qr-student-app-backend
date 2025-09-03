import express from 'express';
import {  
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getTeacherWeeklySchedule,
  getTodaySchedule,
  createBulkSchedules,
  mergeSchedules,
  splitSchedule,
  checkScheduleConflict,
} from '../controllers/scheduleController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';
import {  
  validate,
  scheduleValidation,
  bulkScheduleValidation,
  mergeScheduleValidation,
  splitScheduleValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// Protect all routes and restrict to teachers or admins
router.use(authMiddleware, roleMiddleware(['teacher', 'admin']));

// Special routes
router.get('/weekly', getTeacherWeeklySchedule);
router.get('/today', getTodaySchedule);
router.post('/bulk', validate(bulkScheduleValidation), createBulkSchedules);
router.post('/check-conflict', validate(scheduleValidation), checkScheduleConflict);
router.post('/merge', validate(mergeScheduleValidation), mergeSchedules);
router.post('/split/:id', validate(splitScheduleValidation), splitSchedule);

// CRUD routes
router.post('/', validate(scheduleValidation), createSchedule);
router.get('/', getAllSchedules);
router.get('/:id', getScheduleById);
router.put('/:id', validate(scheduleValidation), updateSchedule);
router.delete('/:id', deleteSchedule);

export default router;