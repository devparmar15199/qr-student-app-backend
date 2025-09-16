import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';
import { User } from '../models/userModel.js';
import { AuditLog } from '../models/auditLogModel.js';

const SALT_ROUNDS = 10;

/**
 * Get user profile
 * @route GET /api/users/profile
 * @access Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -faceEmbedding -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      enrollmentNo: user.enrollmentNo,
      phoneNumber: user.phoneNumber,
      department: user.department,
      division: user.division,
      semester: user.semester,
      year: user.year,
      profilePictureUrl: user.profilePictureUrl,
    });
  } catch (err) {
    logger.error('Get user profile error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { email, fullName } = req.body;

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if new email is already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
    }

    // Update fields
    user.email = email || user.email;
    user.fullName = fullName || user.fullName;

    const updatedUser = await user.save();

    // Log the update
    const changes = {};
    if (email && email !== user.email) {
      changes.email = { from: user.email, to: email };
    }
    if (fullName && fullName !== user.fullName) {
      changes.fullName = { from: user.fullName, to: fullName };
    }
    if (Object.keys(changes).length) {
      await new AuditLog({
        userId: user._id,
        action: 'UPDATE_PROFILE',
        details: { changes },
        status: 'success'
      }).save();
    }  

    res.json({
      id: updatedUser._id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      enrollmentNo: updatedUser.enrollmentNo,
      phoneNumber: updatedUser.phoneNumber,
      department: updatedUser.department,
      division: updatedUser.division,
      semester: updatedUser.semester,
      year: updatedUser.year,
      profilePictureUrl: updatedUser.profilePictureUrl,
    });
  } catch (err) {
    logger.error('Update user profile error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(400).json({ error: err.message });
  }
};

/**
 * Change user password
 * @route PUT /api/users/change-password
 * @access Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters with at least one uppercase letter, one lowercase letter, and one number' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    await user.save();

    // Log the password change
    await new AuditLog({
      userId: user._id,
      action: 'CHANGE_PASSWORD',
      status: 'success'
    }).save();

    logger.info('Password changed successfully', { userId: user._id });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('Change password error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Create new user (Admin only)
 * @route POST /api/users
 * @access Admin
 */
export const createUser = async (req, res) => {
  try {
    const { email, password, fullName, role, enrollmentNo, faceEmbedding } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ 
      $or: [
        { email },
        ...(enrollmentNo ? [{ enrollmentNo }] : [])
      ]
    });

    if (userExists) {
      return res.status(400).json({ 
        error: userExists.email === email ? 'Email already exists' : 'Enrollment number already exists' 
      });
    }

    // Validate password
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters with at least one uppercase letter, one lowercase letter, and one number' });
    }

    // Create user
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      passwordHash,
      fullName,
      role,
      faceEmbedding: faceEmbedding || [],
      ...(role === 'student' ? { enrollmentNo } : {})
    });

    // Log user creation
    await new AuditLog({
      userId: req.user?._id,
      action: 'CREATE_USER',
      details: {
        newUserId: user._id,
        role: user.role,
        email: user.email
      },
      status: 'success'
    }).save();

    res.status(201).json({
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      enrollmentNo: user.enrollmentNo,
      phoneNumber: user.phoneNumber,
      department: user.department,
      division: user.division,
      semester: user.semester,
      year: user.year,
      profilePictureUrl: user.profilePictureUrl,
    });
  } catch (err) {
    logger.error('Create user error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get all users (Admin only)
 * @route GET /api/users
 * @access Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, search, limit = 10, page = 1 } = req.query;
    
    let query = {};
    
    // Filter by role
    if (role) {
      query.role = role;
    }

    // Search by name, email, or enrollment number
    if (search) {
      query.$or = [
        { fullName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { enrollmentNo: new RegExp(search, 'i') }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-passwordHash -faceEmbedding -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    logger.error('Get all users error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get students for enrollment (Teacher and Admin only)
 * @route GET /api/users/students
 * @access Teacher, Admin
 */
export const getStudents = async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;
    
    let query = { role: 'student' };
    
    // Search by name, email, or enrollment number
    if (search) {
      query.$or = [
        { fullName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { enrollmentNo: new RegExp(search, 'i') }
      ];
    }
    
    const students = await User.find(query)
      .select('_id fullName email enrollmentNo')
      .sort({ fullName: 1 })
      .limit(parseInt(limit));

    res.json(students);
  } catch (err) {
    logger.error('Get students error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Upload profile picture
 * @route POST /api/users/profile-picture
 * @access Private
 */
export const uploadProfilePicture = async (req, res) => {
  try {
    // In a real implementation, you would handle file upload here
    // For now, we'll assume the file URL is provided in the request body
    const { profilePictureUrl } = req.body;

    if (!profilePictureUrl) {
      return res.status(400).json({ error: 'Profile picture URL is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.profilePictureUrl = profilePictureUrl;
    await user.save();

    // Log the upload
    await new AuditLog({
      userId: user._id,
      action: 'UPDATE_PROFILE_PICTURE',
      details: { profilePictureUrl },
      status: 'success'
    }).save();

    res.json({ profilePictureUrl });
  } catch (err) {
    logger.error('Upload profile picture error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get user by ID (Admin only)
 * @route GET /api/users/:id
 * @access Admin
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -faceEmbedding -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      enrollmentNo: user.enrollmentNo,
      phoneNumber: user.phoneNumber,
      department: user.department,
      division: user.division,
      semester: user.semester,
      year: user.year,
      profilePictureUrl: user.profilePictureUrl,
    });
  } catch (err) {
    logger.error('Get user by ID error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: err.message });
  }
};
