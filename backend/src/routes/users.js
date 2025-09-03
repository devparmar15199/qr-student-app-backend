import express from 'express';
import {  
  createUser,
  getAllUsers,
  getStudents,
  getUserById,
  getUserProfile,
  updateUserProfile,
  changePassword,
} from '../controllers/userController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';
import {  
  validate,
  createUserValidation,
  updateUserValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// User routes
router
  .route('/profile')
  .get(authMiddleware, getUserProfile)
  .put(authMiddleware, validate(updateUserValidation), updateUserProfile);

// Change password route
router.put('/change-password', authMiddleware, changePassword);

// Students route for teachers
router.get('/students', authMiddleware, roleMiddleware(['teacher', 'admin']), getStudents);

// Admin routes
router
  .route('/')
  .post(authMiddleware, roleMiddleware(['admin']), validate(createUserValidation), createUser)
  .get(authMiddleware, roleMiddleware(['admin']), getAllUsers);
  
router.get('/:id', authMiddleware, roleMiddleware(['admin']), getUserById); 

export default router;