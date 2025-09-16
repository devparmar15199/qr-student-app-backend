import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
    const { 
      enrollmentNo, 
      email, 
      password, 
      fullName, 
      role,
      phoneNumber,
      department,
      division,
      semester,
      year,
      profilePictureUrl,
      faceEmbedding
    } = req.body;

    // Check if email or enrollmentNo already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        ...(role === 'student' && enrollmentNo ? [{ enrollmentNo }] : []),
      ],
    });
    if (existingUser) {
      return res.status(409).json({ error: existingUser.email === email ? 'Email already in use' : 'Enrollment number already in use' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user payload based on role
    const userPayload = {
      email,
      passwordHash,
      fullName,
      role,
      faceEmbedding: faceEmbedding || [],
    };

    if (role === 'student') {
      // Add student-specific fields
      Object.assign(userPayload, {
        enrollmentNo,
        phoneNumber,
        department,
        division,
        semester,
        year,
        profilePictureUrl,
      });
    }

    // Create user
    const user = new User(userPayload);
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Log registration in AuditLog
    await new AuditLog({
      userId: user._id,
      action: 'CREATE_USER',
      details: { enrollmentNo: user.enrollmentNo, email, role }
    }).save();

    // Prepare user data for response (exclude password hash)
    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      enrollmentNo: user.enrollmentNo,
      phoneNumber: user.phoneNumber,
      department: user.department,
      division: user.division,
      semester: user.semester,
      year: user.year,
      role: user.role,
      profilePictureUrl: user.profilePictureUrl,
      isActive: user.isActive
    };

    res.status(201).json({ 
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: userResponse
      }
    });
  } catch (err) {
    logger.error('Registration error:', err);
    // Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
};

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
export const loginUser = async (req, res) => {
  try {
    const { enrollmentNo, email, password } = req.body;

    // Find user by enrollmentNo or email
    const user = await User.findOne({
      $or: [
        ...(enrollmentNo ? [{ enrollmentNo }] : []),
        ...(email ? [{ email: email.toLowerCase() }] : []),
      ],
    });

    if (!user) {
      logger.warn(`Failed login attempt for identifier: ${enrollmentNo || email} - user not found`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      logger.warn(`Failed login attempt for identifier: ${enrollmentNo || email} - user not found`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

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

    // Prepare user data for response (exclude password hash)
    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      enrollmentNo: user.enrollmentNo,
      role: user.role,
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userResponse
      }
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * @route POST /api/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // This response is a security best practice to prevent email enumeration
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save hashed token and expiry to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Log password reset request
    await new AuditLog({
      userId: user._id,
      action: 'FORGOT_PASSWORD',
      details: { email: user.email }
    }).save();

    // TODO: Implement email sending logic
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      // In development, you might want to return the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Hash the token to match stored version
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log successful password reset
    await new AuditLog({
      userId: user._id,
      action: 'RESET_PASSWORD',
      details: { email: user.email },
      status: 'success'
    }).save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    logger.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * @route GET /api/auth/verify-token
 * @desc Verify JWT token and return user data
 * @access Private
 */
export const verifyToken = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    // Select relevant fields for a clean response
    const user = await User.findById(req.user._id)
      .select('fullName email role enrollmentNo phoneNumber department division semester year profilePictureUrl isActive');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    logger.error('Verify token error:', err);
    res.status(500).json({ error: err.message });
  }
};