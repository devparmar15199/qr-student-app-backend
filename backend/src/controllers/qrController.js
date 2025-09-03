import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import { Class } from '../models/classModel.js';
import { ClassEnrollment } from '../models/classEnrollmentModel.js';
import { Schedule } from '../models/scheduleModel.js';
import { QRCodeSession } from '../models/qrCodeSessionModel.js';
import { AuditLog } from '../models/auditLogModel.js';

/**
 * @route POST /api/qr/generate
 * @desc Generate a new QR session for attendance
 * @access Teacher only
 */
export const generateQRSession = async (req, res) => {
  try {
    const { classId, scheduleId, coordinates, teacherId } = req.body;

    console.log('QR Generation Request:', { classId, scheduleId, coordinates, teacherId });

    // Always use authenticated user's ID for security, ignore teacherId from request
    const authenticatedTeacherId = req.user._id;

    if (!mongoose.isValidObjectId(classId)) {
      throw new Error('Invalid classId');
    }

    if (scheduleId && !mongoose.isValidObjectId(scheduleId)) {
      throw new Error('Invalid scheduleId');
    }

    if (
      !coordinates ||
      typeof coordinates.latitude !== 'number' ||
      typeof coordinates.longitude !== 'number' ||
      coordinates.latitude < -90 || 
      coordinates.latitude > 90 ||
      coordinates.longitude < -180 || 
      coordinates.longitude > 180
    ) {
      throw new Error('Invalid coordinates');
    }

    const classObj = await Class.findById(classId);
    if (!classObj) return res.status(404).json({ error: 'Class not found' });

    let schedule = null;
    if (scheduleId) {
      schedule = await Schedule.findById(scheduleId).populate('teacherId', 'fullName email');
      if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
      
      // Check if teacher is assigned to this class/schedule
      if (schedule.teacherId._id.toString() !== authenticatedTeacherId.toString()) {
        return res.status(403).json({ error: 'Not authorized for this schedule' });
      }
    }

    // Generate session data
    const timestamp = new Date();
    const expiryMinutes = parseInt(process.env.QR_SESSION_EXPIRY_MINUTES || '5', 10);
    const expiresAt = new Date(timestamp.getTime() + expiryMinutes * 60 * 1000);
    const sessionId = crypto.randomBytes(16).toString('hex');

    // Create minimal JWT payload to keep QR code size manageable
    const minimalPayload = {
      sid: sessionId, // session ID
      cid: classId,   // class ID  
      ts: Math.floor(timestamp.getTime() / 1000), // timestamp
      exp: Math.floor(expiresAt.getTime() / 1000), // expiry
    };

    const token = jwt.sign(minimalPayload, process.env.JWT_SECRET);

    // Create QR session with minimal payload for QR code but store full JWT for validation
    const fullPayload = {
      classNumber: classObj.classNumber,
      subjectCode: classObj.subjectCode,
      subjectName: classObj.subjectName,
      classYear: classObj.classYear,
      semester: classObj.semester,
      division: classObj.division,
      timestamp,
      coordinates,
      token,
      sessionId
    };

    const qrSessionData = {
      classId,
      teacherId: authenticatedTeacherId,
      sessionId,
      qrPayload: fullPayload, // Store full payload in database
      expiresAt,
      isActive: true
    };

    // Only include scheduleId if it's provided
    if (scheduleId) {
      qrSessionData.scheduleId = scheduleId;
    }

    const qrSession = new QRCodeSession(qrSessionData);

    await qrSession.save();

    const auditDetails = { classId, sessionId };
    if (scheduleId) {
      auditDetails.scheduleId = scheduleId;
    }

    await new AuditLog({
      userId: authenticatedTeacherId,
      action: 'GENERATE_QR_SESSION',
      details: auditDetails,
      status: 'success',
    }).save();

    const populatedSession = await QRCodeSession.findById(qrSession._id)
      .populate('teacherId', 'fullName email');

    // qr-student-app expects QRData format: { sessionId: string, token: string, expiredAt: string }
    const qrData = {
      sessionId,
      token,
      expiredAt: expiresAt.toISOString()
    };

    // Complete response for both qr-student-app and teacher-frontend compatibility
    const response = {
      ...qrData, // QRData format for qr-student-app
      // Additional data for teacher frontend
      qrPayload: {
        sessionId,
        token: 'QR_' + sessionId,
        timestamp: Math.floor(timestamp.getTime() / 1000)
      },
      displayData: {
        classNumber: classObj.classNumber,
        subjectCode: classObj.subjectCode,
        subjectName: classObj.subjectName,
        classYear: classObj.classYear,
        semester: classObj.semester,
        division: classObj.division,
        timestamp,
        coordinates
      },
      expiresAt,
      classDetails: {
        className: classObj.classNumber,
        subject: classObj.subjectName,
      },
      teacher: populatedSession.teacherId ? { fullName: populatedSession.teacherId.fullName, email: populatedSession.teacherId.email } : null
    };

    console.log('QR Generation Response:', response);
    res.status(201).json(response);
  } catch (err) {
    logger.error('Generate QR session error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route POST /api/qr/refresh/:sessionId
 * @desc Refresh QR token
 * @access Teacher only
 */
export const refreshQRToken = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!/^[a-f0-9]{32}$/.test(sessionId)) {
      throw new Error('Invalid sessionId');
    }

    const qrSession = await QRCodeSession.findOne({
      sessionId,
      teacherId: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).populate('teacherId', 'fullName email');

    if (!qrSession) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    // Generate new minimal token with updated expiry
    const timestamp = new Date();
    const expiryMinutes = parseInt(process.env.QR_SESSION_EXPIRY_MINUTES || '5', 10);
    const expiresAt = new Date(timestamp.getTime() + expiryMinutes * 60 * 1000);
    
    const minimalPayload = {
      sid: sessionId,
      cid: qrSession.classId,
      ts: Math.floor(timestamp.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
    
    const token = jwt.sign(minimalPayload, process.env.JWT_SECRET);

    // Update session
    qrSession.qrPayload.token = token;
    qrSession.qrPayload.timestamp = timestamp;
    qrSession.expiresAt = expiresAt;
    await qrSession.save();

    await new AuditLog({
      userId: req.user._id,
      action: 'REFRESH_QR_TOKEN',
      details: { sessionId },
      status: 'success',
    }).save();

    // Construct the QR payload for refresh with minimal data
    const qrPayload = {
      sessionId,
      token: 'QR_' + sessionId, // Simple token reference
      timestamp: Math.floor(timestamp.getTime() / 1000)
    };

    // qr-student-app expects { token: string, expiredAt: string }
    const refreshResponse = {
      token,
      expiredAt: expiresAt.toISOString()
    };

    // Complete response for both apps
    res.json({
      ...refreshResponse, // Format expected by qr-student-app
      success: true,
      sessionId,
      // Keep qrPayload for teacher frontend
      qrPayload,
      displayData: {
        classNumber: qrSession.qrPayload.classNumber,
        subjectCode: qrSession.qrPayload.subjectCode,
        subjectName: qrSession.qrPayload.subjectName,
        classYear: qrSession.qrPayload.classYear,
        semester: qrSession.qrPayload.semester,
        division: qrSession.qrPayload.division,
        coordinates: qrSession.qrPayload.coordinates
      },
      qrCode: token,
      expiresAt,
      teacher: qrSession.teacherId ? { fullName: qrSession.teacherId.fullName, email: qrSession.teacherId.email } : null,
    });
  } catch (err) {
    logger.error('Refresh QR token error:', err);
    res.status(err.message === 'Active session not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
 * @route DELETE /api/qr/terminate/:sessionId
 * @desc Terminate a specific QR session
 * @access Teacher only
 */
export const terminateQRSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!/^[a-f0-9]{32}$/.test(sessionId)) {
      throw new Error('Invalid sessionId');
    }
    
    const qrSession = await QRCodeSession.findOneAndUpdate(
      {
        sessionId,
        teacherId: req.user._id,
        isActive: true,
      },
      {
        isActive: false,
        expiresAt: new Date(),
      },
      { new: true }
    );

    if (!qrSession) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    await new AuditLog({
      userId: req.user._id,
      action: 'TERMINATE_QR_SESSION',
      details: { sessionId },
      status: 'success',
    }).save();

    res.json({ message: 'Session terminated successfully' });
  } catch (err) {
    logger.error('Terminate QR session error:', err);
    res.status(err.message === 'Active session not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
 * @route GET /api/qr/active
 * @desc Get all active QR sessions for a teacher
 * @access Teacher only
 */
export const getActiveQRSessions = async (req, res) => {
  try {
    const activeSessions = await QRCodeSession.find({
      teacherId: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .populate('classId', 'classNumber subjectCode subjectName')
      .populate('scheduleId', 'dayOfWeek startTime endTime')
      .populate('teacherId', 'fullName email')
      .sort('-createdAt');

    res.json(activeSessions);
  } catch (err) {
    logger.error('Get active QR sessions error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * @route DELETE /api/qr/terminate-all
 * @desc Terminate all active QR sessions for a teacher
 * @access Teacher only
 */
export const terminateAllQRSessions = async (req, res) => {
  try {
    const result = await QRCodeSession.updateMany(
      {
        teacherId: req.user._id,
        isActive: true,
      },
      {
        isActive: false,
        expiresAt: new Date(),
      }
    );

    await new AuditLog({
      userId: req.user._id,
      action: 'TERMINATE_ALL_QR_SESSIONS',
      details: { sessionsTerminated: result.modifiedCount },
      status: 'success',
    }).save();

    res.json({
      message: 'All sessions terminated successfully',
      terminatedCount: result.modifiedCount,
    });
  } catch (err) {
    logger.error('Terminate all QR sessions error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route POST /api/qr/validate
 * @desc Validate a QR token
 * @access Student only
 */
export const validateQRToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Handle multiple token formats:
    // 1. JSON string from QR code (teacher frontend generates JSON.stringify)
    // 2. JWT token 
    // 3. Simple session reference (QR_sessionId)
    let sessionId;
    
    // First, try to parse as JSON (from QR code scan)
    try {
      const qrData = JSON.parse(token);
      if (qrData.sessionId) {
        sessionId = qrData.sessionId;
      } else if (qrData.token && qrData.token.startsWith('QR_')) {
        sessionId = qrData.token.substring(3);
      }
    } catch (jsonError) {
      // Not JSON, try other formats
      if (token.startsWith('QR_')) {
        // Simple session reference format
        sessionId = token.substring(3);
      } else {
        // Try to verify as JWT token and extract session info
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          sessionId = decoded.sid || decoded.sessionId;
        } catch (jwtError) {
          return res.status(400).json({ error: 'Invalid token format' });
        }
      }
    }
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Invalid token: missing session ID' });
    }
    
    // Find active session by session ID
    const qrSession = await QRCodeSession.findOne({
      sessionId: sessionId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .populate('classId', 'classNumber subjectName')
      .populate('teacherId', 'fullName email');

    if (!qrSession) {
      return res.status(404).json({ error: 'Invalid or expired QR session' });
    }

    // Verify student enrollment
    const enrollment = await ClassEnrollment.findOne({
      classId: qrSession.classId._id,
      studentId: req.user._id,
      isActive: true,
    });

    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this class' });
    }

    // Log validation attempt
    await new AuditLog({
      userId: req.user._id,
      action: 'VALIDATE_QR_TOKEN',
      details: {
        sessionId: qrSession.sessionId,
        classId: qrSession.classId._id,
      },
      status: 'success',
    }).save();

    res.json({
      valid: true,
      sessionId: qrSession.sessionId,
      classId: qrSession.classId._id, // Required by qr-student-app
      scheduleId: qrSession.scheduleId || null, // May be null if no schedule assigned
      classDetails: {
        className: qrSession.classId.classNumber,
        subject: qrSession.classId.subjectName,
      },
      teacher: qrSession.teacherId ? { fullName: qrSession.teacherId.fullName, email: qrSession.teacherId.email } : null,
      timestamp: qrSession.qrPayload.timestamp,
    });
  } catch (err) {
    logger.error('Validate QR token error:', err);
    res.status(400).json({ error: err.message || 'Token validation failed' });
  }
};