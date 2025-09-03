import mongoose from 'mongoose';
import express from 'express';
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomsByType,
  initializeDefaultRooms, 
} from '../controllers/roomController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';
import {  
  validate,
  roomValidation,
  initializeRoomValidation,
  typeValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// Protected routes (require authentication and teacher/admin role)
router.use(authMiddleware, roleMiddleware(['teacher', 'admin']));

// Validate ObjectId for routes with :id
const validateObjectId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid room ID' });
  }
  next();
}

// Routes
router.get('/', getRooms);
router.get('/type/:type', validate(typeValidation), getRoomsByType);
router.post('/', validate(roomValidation), createRoom);
router.post('/initialize', validate(initializeRoomValidation), initializeDefaultRooms);
router.put('/:id', validateObjectId, validate(roomValidation), updateRoom);
router.delete('/:id', validateObjectId, deleteRoom);

export default router;