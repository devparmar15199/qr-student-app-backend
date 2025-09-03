import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { User } from '../models/userModel.js';
import { AuditLog } from '../models/auditLogModel.js';

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
export const registerUser = async (req, res) => {
  try {
    const { enrollmentNo, email, password, fullName, role } = req.body;

    // Check if email or enrollmentNo already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        ...(role === 'student' && enrollmentNo ? [{ enrollmentNo }] : []),
      ],
    });
    if (existingUser) {
      throw new Error(existingUser.email === email ? 'Email already in use' : 'Enrollment number already in use');
    }

    // Validate enrollmentNo for students
    if (role === 'student' && !enrollmentNo) {
      throw new Error('Enrollment number is required for students');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      enrollmentNo: role === 'student' ? enrollmentNo : undefined,
      email,
      passwordHash,
      fullName,
      role,
      faceEmbedding: [],
    });
    await user.save();

    // Log registration in AuditLog
    await new AuditLog({
      userId: user._id,
      action: 'CREATE_USER',
      details: { enrollmentNo: user.enrollmentNo, email, role }
    }).save();

    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    logger.error('Registration error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
export const loginUser = async (req, res) => {
  try {
    console.log('Login request received:', { enrollmentNo: req.body.enrollmentNo, email: req.body.email, hasPassword: !!req.body.password });
    const { enrollmentNo, email, password } = req.body;

    // Ensure at least one of enrollmentNo or email is provided
    if (!enrollmentNo && !email) {
      console.log('Login failed: No identifier provided');
      throw new Error('Enrollment number or email is required');
    }

    // Find user by enrollmentNo or email
    const user = await User.findOne({
      $or: [
        ...(enrollmentNo ? [{ enrollmentNo }] : []),
        ...(email ? [{ email: email.toLowerCase() }] : []),
      ],
    });
    
    console.log('User lookup result:', user ? 'Found user' : 'User not found');

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Log login in AuditLog
    await new AuditLog({
      userId: user._id,
      action: 'LOGIN',
      details: { enrollmentNo: user.enrollmentNo, email: user.email }
    }).save();

    res.json({
      token,
      user: { id: user._id, fullName: user.fullName, role: user.role }
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(401).json({ error: err.message });
  }
};