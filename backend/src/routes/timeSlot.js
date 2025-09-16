import express from 'express';
import {  
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  getAvailableTimeSlots,
  initializeDefaultTimeSlots,
} from '../controllers/timeSlotController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';
import {  
  validate,
  createTimeSlotValidation,
  updateTimeSlotValidation,
  availableTimeSlotValidation,
  initializeTimeSlotValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// Public route
router.get('/', getTimeSlots);

// Protected routes
router.use(authMiddleware);

router.get('/available', validate(availableTimeSlotValidation), getAvailableTimeSlots);

// Admin routes
router.use(roleMiddleware(['admin']));

router.post('/', validate(createTimeSlotValidation), createTimeSlot);
router.post('/initialize', validate(initializeTimeSlotValidation), initializeDefaultTimeSlots);
router.put('/:id', validate(updateTimeSlotValidation), updateTimeSlot);
router.delete('/:id', deleteTimeSlot);

export default router;