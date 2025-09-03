import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';
import { validate, registerValidation, loginValidation } from '../middlewares/validate.js';

const router = express.Router();

router.post('/register', validate(registerValidation), registerUser);
router.post('/login', validate(loginValidation), loginUser);

export default router;