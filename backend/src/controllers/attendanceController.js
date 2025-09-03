import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { Attendance } from '../models/attendanceModel.js';
import { QRCodeSession } from '../models/qrCodeSessionModel.js';
import { Schedule } from '../models/scheduleModel.js';
import { ClassEnrollment } from '../models/classEnrollmentModel.js';
import { Class } from '../models/classModel.js';
import { AuditLog } from '../models/auditLogModel.js';
import { calculateDistance } from '../utils/geo.js';

/**
 * @route POST /api/attendances
 * @desc Submit attendance for a class session
 * @access Student only
 */
export const submitAttendance = async (req, res) => {
  try {
    const { sessionId, classId, scheduleId, studentCoordinates, livenessPassed, faceEmbedding } = req.body;

    // sessionId comes from qr-student-app as session string ID, not MongoDB ObjectId
    // classId should be valid MongoDB ObjectId
    // scheduleId can be null/optional
    if (
      !sessionId ||
      !mongoose.isValidObjectId(classId) ||
      (scheduleId && !mongoose.isValidObjectId(scheduleId))
    ) {
      throw new Error('Invalid sessionId, classId, or scheduleId');
    }

    // Find QR session by sessionId field (string), not _id (ObjectId)
    const qrSession = await QRCodeSession.findOne({
      sessionId: sessionId, // Use sessionId field, not _id
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).populate('classId', 'classNumber subjectName');

    if (!qrSession) {
      return res.status(404).json({ error: 'Invalid or expired QR session' });
    }

    // Check enrollment first
    const enrollment = await ClassEnrollment.findOne({ 
      classId, 
      studentId: req.user._id, 
      isActive: true 
    });
    
    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this class' });
    }

    // Schedule is optional - only validate if provided
    let schedule = null;
    if (scheduleId) {
      schedule = await Schedule.findById(scheduleId).populate('classId', 'classNumber subjectName');
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
    }
  
    const maxDistance = parseInt(process.env.MAX_ATTENDANCE_DISTANCE_METERS || '100', 10);
    const distance = calculateDistance(studentCoordinates, qrSession.qrPayload.coordinates);

    // Proximity check (max 100 meters)
    if (distance > maxDistance) {
      return res.status(403).json({ error: `Student too far from class location (${distance.toFixed(2)} meters)` });
    }

    // Check if attendance already exists (use QR session's ObjectId for database consistency)
    const existingAttendance = await Attendance.findOne({
      sessionId: qrSession._id, // Use QR session's ObjectId for database consistency
      studentId: req.user._id,
    });

    if (existingAttendance) {
      return res.status(409).json({ error: 'Attendance already submitted for this session' });
    }

    // Determine attendance status based on schedule time (if available)
    let status = 'present'; // default status
    if (schedule) {
      const now = new Date();
      const scheduleStart = new Date(`${now.toISOString().split('T')[0]}T${schedule.startTime}:00`);
      const lateThresholdMinutes = parseInt(process.env.LATE_THRESHOLD_MINUTES || '15', 10);
      const lateThreshold = new Date(scheduleStart.getTime() + lateThresholdMinutes * 60 * 1000);
      status = now <= lateThreshold ? 'present' : 'late';
    }

    const attendanceData = {
      studentId: req.user._id,
      sessionId: qrSession._id, // Use QR session's ObjectId for database consistency
      classId,
      studentCoordinates,
      livenessPassed: livenessPassed || false,
      faceEmbedding: faceEmbedding || [],
      synced: true,
      status,
      attendedAt: new Date(),
    };

    // Only include scheduleId if it's provided
    if (scheduleId) {
      attendanceData.scheduleId = scheduleId;
    }

    const attendance = new Attendance(attendanceData);
    await attendance.save();

    await new AuditLog({
      userId: req.user._id,
      action: 'SUBMIT_ATTENDANCE',
      details: { classId, sessionId: qrSession.sessionId, status, livenessPassed }, // Log string sessionId for clarity
      status: 'success',
    }).save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('studentId', 'fullName enrollmentNo email')
      .populate('classId', 'classNumber subjectName');

    res.status(201).json(populatedAttendance);
  } catch (err) {
    logger.error('Attendance submission error:', err);
    res.status(
      err.message.includes('not found') ? 404 :
      err.message.includes('already submitted') ? 409 : 400
    ).json({ error: err.message });
  }
};

/**
 * @route POST /api/attendances/sync
 * @desc Sync offline attendance records
 * @access Student only
 */
export const syncAttendance = async (req, res) => {
  try {
    const { attendances } = req.body;
    const results = [];

    for (const att of attendances) {
      try {
        const { sessionId, classId, scheduleId, studentCoordinates, livenessPassed, faceEmbedding, syncVersion, attendedAt } = att;
        
        if (
          !sessionId ||
          !mongoose.isValidObjectId(classId) ||
          (scheduleId && !mongoose.isValidObjectId(scheduleId))
        ) {
          results.push({ status: 'failed', error: 'Invalid sessionId, classId or scheduleId', data: att });
          continue;
        }

        // Find session by sessionId field (string), not _id (ObjectId)
        const qrSession = await QRCodeSession.findOne({ sessionId: sessionId }).populate('classId', 'classNumber subjectName');
        const enrollment = await ClassEnrollment.findOne({ classId, studentId: req.user._id, isActive: true });
        
        // Schedule is optional
        let schedule = null;
        if (scheduleId) {
          schedule = await Schedule.findById(scheduleId).populate('classId', 'classNumber subjectName');
        }

        // Validate required data
        if (!qrSession || !enrollment) {
          results.push({ 
            status: 'failed', 
            error: !qrSession ? 'Invalid session' : 'Not enrolled', 
            data: att,
          });
          continue;
        }

        // Validate schedule if provided
        if (scheduleId && !schedule) {
          results.push({ 
            status: 'failed', 
            error: 'Invalid schedule',
            data: att,
          });
          continue;
        }

        const maxDistance = parseInt(process.env.MAX_ATTENDANCE_DISTANCE_METERS || '100', 10);
        const distance = calculateDistance(studentCoordinates, qrSession.qrPayload.coordinates);
        // Check distance
        if (distance > maxDistance) {
          results.push({ status: 'failed', error: `Location too far from class (${distance.toFixed(2)} meters)`, data: att });
          continue;
        }

        // Check for existing record with version control (use QR session ObjectId)
        const existing = await Attendance.findOne({ sessionId: qrSession._id, studentId: req.user._id });
        if (existing && existing.syncVersion >= syncVersion) {
          results.push({ status: 'skipped', error: 'Newer version exists', data: att });
          continue;
        }

        // Determine status based on schedule time (if available)
        let status = 'present'; // default status
        if (schedule) {
          const attendanceTime = new Date(attendedAt);
          const scheduleStart = new Date(`${attendanceTime.toISOString().split('T')[0]}T${schedule.startTime}:00`);
          const lateThresholdMinutes = parseInt(process.env.LATE_THRESHOLD_MINUTES || '15', 10);
          const lateThreshold = new Date(scheduleStart.getTime() + lateThresholdMinutes * 60 * 1000);
          status = attendanceTime <= lateThreshold ? 'present' : 'late';
        }

        const attendanceData = {
          studentId: req.user._id,
          sessionId: qrSession._id, // Use QR session ObjectId for consistency
          classId,
          studentCoordinates,
          livenessPassed: livenessPassed || false,
          faceEmbedding: faceEmbedding || [],
          status,
          synced: true,
          syncVersion,
          attendedAt: new Date(attendedAt),
        };

        // Only include scheduleId if it's provided
        if (scheduleId) {
          attendanceData.scheduleId = scheduleId;
        }

        // Create or update attendance record
        if (existing) {
          await Attendance.updateOne(
            { _id: existing._id },
            { $set: attendanceData }
          );
        } else {
          const attendance = new Attendance(attendanceData);
          await attendance.save();
        }

        await new AuditLog({
          userId: req.user._id,
          action: 'SYNC_ATTENDANCE',
          details: { classId, sessionId: qrSession.sessionId, syncVersion, status }, // Log string sessionId
          status: 'success',
        }).save();

        results.push({ status: 'success', data: att });
      } catch (error) {
        results.push({ status: 'failed', error: error.message, data: att });
      }
    }

    res.json({
      success: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      details: results,
    });
  } catch (err) {
    logger.error('Attendance sync error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route GET /api/attendances/records
 * @desc Get all attendance records
 * @access Teacher or Admin
 */
export const getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = {};

    if (req.user.role !== 'admin') {
      const classes = await Class.find({ teacherId: req.user._id }).select('_id');
      query.classId = { $in: classes.map((c) => c._id) };
    }

    // Add date range filter
    if (startDate || endDate) {
      query.attendedAt = {};
      if (startDate) query.attendedAt.$gte = new Date(startDate);
      if (endDate) query.attendedAt.$lte = new Date(endDate);
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    const attendances = await Attendance.find(query)
      .populate('studentId', 'fullName enrollmentNo email')
      .populate('classId', 'classNumber subjectName')
      .populate('scheduleId', 'dayOfWeek startTime endTime')
      .populate('sessionId', 'qrPayload.timestamp')
      .sort({ attendedAt: -1 });

    res.json(attendances);
  } catch (err) {
    logger.error('Get all attendance error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route GET /api/attendances/records/student/:studentId
 * @desc Get attendance records for a specific student
 * @access Teacher or Admin
 */
export const getAttendanceByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, classId } = req.query;

    if (!mongoose.isValidObjectId(studentId)) {
      throw new Error('Invalid studentId');
    }

    const query = { studentId };

    if (req.user.role !== 'admin') {
      const classes = await Class.find({ teacherId: req.user._id }).select('_id');
      query.classId = { $in: classes.map((c) => c._id) };
    }

    // Add date range filter
    if (startDate || endDate) {
      query.attendedAt = {};
      if (startDate) query.attendedAt.$gte = new Date(startDate);
      if (endDate) query.attendedAt.$lte = new Date(endDate);
    }

    // Add class filter
    if (classId) {
      if (!mongoose.isValidObjectId(classId)) {
        throw new Error('Invalid classId');
      }
      query.classId = classId;
    }

    const attendances = await Attendance.find(query)
      .populate('classId', 'classNumber subjectName')
      .populate('scheduleId', 'dayOfWeek startTime endTime')
      .populate('sessionId', 'qrPayload.timestamp')
      .sort({ attendedAt: -1 });

    const stats = {
      total: attendances.length,
      present: attendances.filter((a) => a.status === 'present').length,
      late: attendances.filter((a) => a.status === 'late').length,
      absent: attendances.filter((a) => a.status === 'absent').length
    };

    res.json({ attendances, stats });
  } catch (err) {
    logger.error('Get student attendance error:', err);
    res.status(err.message.includes('Invalid') ? 400 : 500).json({ error: err.message });
  }
};

/**
 * @route GET /api/attendances/records/class/:classId
 * @desc Get attendance records for a specific class
 * @access Teacher, Admin, or enrolled Student
 */
export const getAttendanceByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate, status } = req.query;

    if (!mongoose.isValidObjectId(classId)) {
      throw new Error('Invalid classId');
    }

    if (req.user.role === 'teacher') {
      const classObj = await Class.findOne({ _id: classId, teacherId: req.user._id });
      if (!classObj) {
        return res.status(403).json({ error: 'Not authorized for this class' });
      }
    }

    const query = { classId };

    // Add date range filter
    if (startDate || endDate) {
      query.attendedAt = {};
      if (startDate) query.attendedAt.$gte = new Date(startDate);
      if (endDate) query.attendedAt.$lte = new Date(endDate);
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    const attendances = await Attendance.find(query)
      .populate('studentId', 'fullName enrollmentNo email')
      .populate('scheduleId', 'dayOfWeek startTime endTime')
      .populate('sessionId', 'qrPayload.timestamp')
      .sort({ attendedAt: -1 });

    // Calculate class statistics
    const stats = {
      total: attendances.length,
      present: attendances.filter((a) => a.status === 'present').length,
      late: attendances.filter((a) => a.status === 'late').length,
      absent: attendances.filter((a) => a.status === 'absent').length,
      manualEntries: attendances.filter((a) => a.manualEntry).length,
    };

    res.json({ attendances, stats });
  } catch (err) {
    logger.error('Get class attendance error:', err);
    res.status(err.message.includes('Invalid') ? 400 : err.message.includes('Not authorized') ? 403 : 500).json({
      error: err.message
    });
  }
};

/**
 * @route POST /api/attendances/manual
 * @desc Manually enter attendance for a student
 * @access Teacher or Admin
 */
export const manualAttendance = async (req, res) => {
  try {
    const { studentId, classId, scheduleId, status = 'present', attendedAt } = req.body;

    if (
      !mongoose.isValidObjectId(studentId) ||
      !mongoose.isValidObjectId(classId) ||
      !mongoose.isValidObjectId(scheduleId)
    ) {
      throw new Error('Invalid studentId, classId, or scheduleId');
    }

    const [enrollment, schedule, classObj] = await Promise.all([
      ClassEnrollment.findOne({ 
        classId, 
        studentId,
        isActive: true,
      }),
      Schedule.findById(scheduleId),
      Class.findById(classId),
    ]);

    if (!enrollment) {
      return res.status(403).json({ error: 'Student not enrolled in this class' });
    }

    if (!schedule || !classObj) {
      return res.status(404).json({ error: 'Schedule or class not found' });
    }

    if (schedule.classId.toString() !== classId) {
      return res.status(400).json({ error: 'Schedule does not belong to the specified class' });
    }

    if (req.user.role === 'teacher') {
      if (classObj.teacherId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized for this class'});
      }
    }

    const now = attendedAt ? new Date(attendedAt) : new Date();
    const scheduleDate = new Date(`${now.toISOString().split('T')[0]}T${schedule.startTime}:00`);
    const scheduleEnd = new Date(`${now.toISOString().split('T')[0]}T${schedule.endTime}:00`);
    if (now < scheduleDate || now > scheduleEnd) {
      return res.status(400).json({ error: 'Attendance time outside schedule'});
    }

    // Check if attendance already exists
    const existingAttendance = await Attendance.findOne({
      studentId,
      classId,
      scheduleId,
      attendedAt: {
        $gte: new Date(now).setHours(0, 0, 0, 0),
        $lt: new Date(now).setHours(23, 59, 59, 999),
      },
    });

    if (existingAttendance) {
      return res.status(409).json({ error: 'Attendance already exists for this schedule and date' });
    }

    const attendance = new Attendance({
      studentId,
      classId,
      scheduleId,
      sessionId: null,
      studentCoordinates: null,
      livenessPassed: false,
      faceEmbedding: [],
      manualEntry: true,
      synced: true,
      status,
      attendedAt: now,
    });

    await attendance.save();

    await new AuditLog({
      userId: req.user._id,
      action: 'MANUAL_ATTENDANCE',
      details: { classId, studentId, status, attendedAt },
      status: 'success',
    }).save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('studentId', 'fullName enrollmentNo email')
      .populate('classId', 'classNumber subjectName');

    res.status(201).json(populatedAttendance);
  } catch (err) {
    logger.error('Manual attendance error:', err);
    res.status(
      err.message.includes('not found') ? 404 : err.message.includes('already exists') ? 409 : 400
    ).json({ error: err.message });
  }
};