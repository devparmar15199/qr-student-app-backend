import mongoose from 'mongoose';
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
  timeSlotValidation,
  availableTimeSlotValidation,
  initializeTimeSlotValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// Public route
router.get('/', getTimeSlots);

// Protected routes
router.use(authMiddleware);

// Validate ObjectId for routes with :id
const validateObjectId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid time slot ID' });
  }
  next();
};

router.get('/available', validate(availableTimeSlotValidation), getAvailableTimeSlots);

// Admin routes
router.use(roleMiddleware(['admin']));
router.post('/', validate(timeSlotValidation), createTimeSlot);
router.post('/initialize', validate(initializeTimeSlotValidation), initializeDefaultTimeSlots);
router.put('/:id', validateObjectId, validate(timeSlotValidation), updateTimeSlot);
router.delete('/:id', validateObjectId, deleteTimeSlot);

export default router;