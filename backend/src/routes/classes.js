import express from 'express';
import {
  createClass,
  enrollStudent,
  getClasses,
  getClassById,
  getClassStudents,
  getClassSchedule,
  getClassmates,
  updateClass,
  deleteClass,
} from '../controllers/classController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';
import { validate, classValidation, enrollValidation } from '../middlewares/validate.js';

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

// Publicly accessible for authenticated users
router.get('/', getClasses);
router.get('/:id', getClassById);
router.get('/:id/students', roleMiddleware(['teacher', 'admin']), getClassStudents);
router.get('/:id/schedule', getClassSchedule);
router.get('/:id/classmates', getClassmates);

// Teacher and admin roles
router.post('/', validate(classValidation), roleMiddleware(['teacher', 'admin']), createClass);
router.post('/enroll', validate(enrollValidation), roleMiddleware(['teacher', 'admin']), enrollStudent);
router.put('/:id', validate(classValidation), roleMiddleware(['teacher', 'admin']), updateClass);
router.delete('/:id', roleMiddleware(['teacher', 'admin']), deleteClass);

export default router;
