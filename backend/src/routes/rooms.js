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
  createRoomValidation,
  updateRoomValidation,
  initializeRoomValidation,
  typeValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// Protected routes (require authentication and teacher/admin role)
router.use(authMiddleware, roleMiddleware(['teacher', 'admin']));

// Routes
router.get('/', getRooms);
router.get('/type/:type', validate(typeValidation), getRoomsByType);
router.post('/', validate(createRoomValidation), createRoom);
router.post('/initialize', validate(initializeRoomValidation), initializeDefaultRooms);
router.put('/:id', validate(updateRoomValidation), updateRoom);
router.delete('/:id', updateRoomValidation, deleteRoom);

export default router;