import express from 'express';
import multer from 'multer';
import path from 'path';
import {  
  createUser,
  getAllUsers,
  getStudents,
  getUserById,
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadProfilePicture,
} from '../controllers/userController.js';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.js';
import {  
  validate,
  createUserValidation,
  updateUserValidation,
  profilePictureValidation,
} from '../middlewares/validate.js';

const router = express.Router();

// Configure multer storage
const storage = multer.memoryStorage(); // Use memory storage for buffer
const upload = multer({ storage: storage });

// User routes
router
  .route('/profile')
  .get(authMiddleware, getUserProfile)
  .put(authMiddleware, validate(updateUserValidation), updateUserProfile);

// Change password route
router.put('/change-password', authMiddleware, changePassword);

// Profile picture upload route
// We need to use multer middleware to handle the file upload first
router.post(
  '/profile-picture', 
  authMiddleware,
  upload.single('profilePicture'),
  validate(profilePictureValidation), 
  uploadProfilePicture
);

// Students route for teachers
router.get('/students', authMiddleware, roleMiddleware(['teacher', 'admin']), getStudents);

// Admin routes
router
  .route('/')
  .post(authMiddleware, roleMiddleware(['admin']), validate(createUserValidation), createUser)
  .get(authMiddleware, roleMiddleware(['admin']), getAllUsers);
  
router.get('/:id', authMiddleware, roleMiddleware(['admin']), getUserById); 

export default router;