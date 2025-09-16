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
  createScheduleValidation,
  updateScheduleValidation,
  bulkScheduleValidationClean,
  mergeScheduleValidation,
  splitScheduleValidation,
  getScheduleQueryValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// Public route for today's schedule (e.g., for display on a public screen)
router.get('/today', getTodaySchedule);

// Protected routes for teachers and admins
router.use(authMiddleware, roleMiddleware(['teacher', 'admin']));

// Special routes
router.get('/my', validate(getScheduleQueryValidation), getTeacherWeeklySchedule);
router.get('/week', validate(getScheduleQueryValidation), getTeacherWeeklySchedule);
router.post('/bulk', validate(bulkScheduleValidationClean), createBulkSchedules);
router.post('/check-conflict', validate(createScheduleValidation), checkScheduleConflict);
router.post('/merge', validate(mergeScheduleValidation), mergeSchedules);
router.post('/split/:id', validate(splitScheduleValidation), splitSchedule);

// CRUD routes
router.post('/', validate(createScheduleValidation), createSchedule);
router.get('/', getAllSchedules);
router.get('/:id', getScheduleById);
router.put('/:id', validate(updateScheduleValidation), updateSchedule);
router.delete('/:id', deleteSchedule);

export default router;