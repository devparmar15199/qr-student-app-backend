import express from 'express';
import { loginUser, registerUser, forgotPassword, resetPassword, verifyToken } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { validate, loginValidation, registerValidation, forgotPasswordValidation, resetPasswordValidation } from '../middlewares/validate.js';

const router = express.Router();

router.post('/login', validate(loginValidation), loginUser);
router.post('/register', validate(registerValidation), registerUser);
router.post('/forgot-password', validate(forgotPasswordValidation), forgotPassword);
router.post('/reset-password', validate(resetPasswordValidation), resetPassword);
router.get('/verify-token', authMiddleware, verifyToken);

export default router;