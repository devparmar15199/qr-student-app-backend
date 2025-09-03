import mongoose from 'mongoose';
import moment from 'moment';
import logger from '../utils/logger.js';
import { Schedule } from '../models/scheduleModel.js';
import { AuditLog } from '../models/auditLogModel.js';

/**
* @route  POST /api/schedules
* @desc   Create a new schedule
* @access Teachers or Admin
*/
export const createSchedule = async (req, res) => {
  try {
    const {
      classId,
      teacherId,
      sessionType,
      dayOfWeek,
      startTime,
      endTime,
      roomNumber,
      semester,
      academicYear,
      location
    } = req.body;

    if (!mongoose.isValidObjectId(classId) || !mongoose.isValidObjectId(teacherId)) {
      throw new Error('Invalid class or teacher ID');
    }

    if (teacherId !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new Error('Teacher ID must match authenticated user');
    }

    // Check for schedule conflicts
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');
    const conflictingSchedule = await Schedule.findOne({
      teacherId,
      dayOfWeek,
      isActive: true,
      $or: [
        {
          startTime: { $lt: end.format('HH:mm') },
          endTime: { $gt: start.format('HH:mm') },
        },
      ],
    });

    if (conflictingSchedule) {
      return res.status(409).json({
        error: 'Schedule conflict detected',
        conflictingSchedule,
      });
    }

    const schedule = new Schedule({
      classId,
      teacherId,
      sessionType,
      dayOfWeek,
      startTime,
      endTime,
      roomNumber,
      semester,
      academicYear,
      location
    });

    await schedule.save();

    await new AuditLog({
      userId: req.user._id,
      action: 'CREATE_SCHEDULE',
      details: { classId, scheduleId: schedule._id },
    }).save();

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate('classId', 'subjectCode subjectName')
      .populate('teacherId', 'fullName email');

    res.status(201).json(populatedSchedule);
  } catch (err) {
    logger.error('Schedule creation error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
* @route  GET /api/schedules
* @desc   Get all schedules
* @access Teachers or Admin
*/
export const getAllSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find()
      .populate('classId', 'subjectCode subjectName')
      .populate('teacherId', 'fullName email')
      .sort({ dayOfWeek: 1, startTime: 1 });
    res.json(schedules);
  } catch (err) {
    logger.error('Get all schedules error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
* @route  GET /api/schedules/:id
* @desc   Get schedule by ID
* @access Teachers or Admin
*/
export const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new Error('Invalid schedule ID');
    }

    const schedule = await Schedule.findById(id)
      .populate('classId', 'subjectCode subjectName')
      .populate('teacherId', 'fullName email');

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (schedule.teacherId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to access this schedule' });
    }

    res.json(schedule);
  } catch (err) {
    logger.error('Get schedule by ID error:', err);
    res.status(err.message === 'Schedule not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
* @route  PUT /api/schedules/:id
* @desc   Update a schedule by ID
* @access Teachers or Admin
*/
export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      classId,
      teacherId,
      sessionType,
      dayOfWeek,
      startTime,
      endTime,
      roomNumber,
      semester,
      academicYear,
      location,
      isActive
    } = req.body;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(classId) || !mongoose.isValidObjectId(teacherId)) {
      throw new Error('Invalid schedule, class, or teacher ID');
    }

    if (teacherId !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new Error('Teacher ID must match authenticated user');
    }

    // Check for conflicts
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');
    const conflictingSchedule = await Schedule.findOne({
      _id: { $ne: id },
      teacherId,
      dayOfWeek,
      isActive: true,
      $or: [
        {
          startTime: { $lt: end.format('HH:mm') },
          endTime: { $gt: start.format('HH:mm') }
        },
      ],
    });

    if (conflictingSchedule) {
      return res.status(409).json({
        error: 'Schedule conflict detected',
        conflictingSchedule,
      });
    }

    const schedule = await Schedule.findByIdAndUpdate(
      id,
      {
        classId,
        teacherId,
        sessionType,
        dayOfWeek,
        startTime,
        endTime,
        roomNumber,
        semester,
        academicYear,
        location,
        isActive
      },
      { new: true, runValidators: true }
    )
      .populate('classId', 'subjectCode subjectName')
      .populate('teacherId', 'fullName email');

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await new AuditLog({
      userId: req.user._id,
      action: 'UPDATE_SCHEDULE',
      details: { scheduleId: schedule._id },
    }).save();

    res.json(schedule);
  } catch (err) {
    logger.error('Update schedule error:', err);
    res.status(err.message === 'Schedule not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
 * @route DELETE /api/schedules/:id 
 * @desc  Delete a schedule (soft delete)
 * @access Teachers or Admin
 */
export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new Error('Invalid schedule ID');
    }

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (schedule.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this schedule' });
    }

    schedule.isActive = false;
    await schedule.save();

    await new AuditLog({
      userId: req.user._id,
      action: 'DELETE_SCHEDULE',
      details: { scheduleId: schedule._id },
    }).save();

    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    logger.error('Delete schedule error:', err);
    res.status(err.message === 'Schedule not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
 * @route  GET /api/schedules/weekly
 * @desc   Get weekly schedule for a teacher
 * @access Teachers or Admin
 */
export const getTeacherWeeklySchedule = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const schedules = await Schedule.find({
      teacherId,
      isActive: true,
    })
      .populate('classId', 'subjectCode subjectName')
      .populate('teacherId', 'fullName email')
      .sort({ dayOfWeek: 1, startTime: 1 });

    const weeklySchedule = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.dayOfWeek]) {
        acc[schedule.dayOfWeek] = [];
      }
      acc[schedule.dayOfWeek].push(schedule);
      return acc;
    }, {});

    res.json(weeklySchedule);
  } catch (err) {
    logger.error('Get teacher weekly schedule error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * @route  GET /api/schedules/today
 * @desc   Get today's schedule for a teacher
 * @access Teachers or Admin
 */
export const getTodaySchedule = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    const schedules = await Schedule.find({
      teacherId,
      dayOfWeek: today,
      isActive: true,
    })
      .populate('classId', 'subjectCode subjectName')
      .populate('teacherId', 'fullName email')
      .sort({ startTime: 1 });

    res.json(schedules);
  } catch (err) {
    logger.error('Get today schedule error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * @route  POST /api/schedules/bulk
 * @desc   Create multiple schedules
 * @access Teachers or Admin
 */
export const createBulkSchedules = async (req, res) => {
  try {
    const schedules = req.body;
    const createdSchedules = [];
    const errors = [];

    for (const scheduleData of schedules) {
      try {
        if (scheduleData.teacherId !== req.user._id.toString() && req.user.role !== 'admin') {
          throw new Error('Teacher ID must match authenticated user');
        }

        const start = moment(scheduleData.startTime, 'HH:mm');
        const end = moment(scheduleData.endTime, 'HH:mm');
        const conflictingSchedule = await Schedule.findOne({
          teacherId: scheduleData.teacherId,
          dayOfWeek: scheduleData.dayOfWeek,
          isActive: true,
          $or: [
            {
              startTime: { $lt: end.format('HH:mm') },
              endTime: { $gt: start.format('HH:mm') },
            },
          ],
        });

        if (conflictingSchedule) {
          throw new Error('Schedule conflict detected');
        }

        const newSchedule = new Schedule(scheduleData);
        await newSchedule.save();
        const populatedSchedule = await Schedule.findById(newSchedule._id)
          .populate('classId', 'subjectCode subjectName')
          .populate('teacherId', 'fullName email');
        createdSchedules.push(populatedSchedule);

        await new AuditLog({
          userId: req.user._id,
          action: 'CREATE_BULK_SCHEDULE',
          details: { scheduleId: newSchedule._id },
        }).save();
      } catch (error) {
        errors.push({
          schedule: scheduleData,
          error: error.message,
        });
      }
    }

    res.json({
      success: createdSchedules,
      errors,
    });
  } catch (err) {
    logger.error('Bulk create schedules error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route  POST /api/schedules/merge
 * @desc   Merge multiple schedules
 * @access Teachers or Admin
 */
export const mergeSchedules = async (req, res) => {
  try {
    const { scheduleIds } = req.body;

    if (!mongoose.isValidObjectId(scheduleIds.every((id) => mongoose.isValidObjectId(id)))) {
      throw new Error('Invalid schedule IDs');
    }

    // Get all schedules to merge
    const schedules = await Schedule.find({
      _id: { $in: scheduleIds },
      isActive: true,
    });

    if (schedules.length !== scheduleIds.length) {
      return res.status(404).json({ error: 'One or more schedules not found' });
    }

    // Validate schedules can be merged (same day, consecutive times)
    const firstSchedule = schedules[0];
    const canMerge = schedules.every(
      (schedule) => 
        schedule.dayOfWeek === firstSchedule.dayOfWeek &&
        schedule.classId.toString() === firstSchedule.classId.toString() &&
        schedule.teacherId.toString() === firstSchedule.teacherId.toString() &&
        schedule.roomNumber === firstSchedule.roomNumber
    );

    if (!canMerge) {
      return res.status(400).json({ error: 'Schedules cannot be merged' });
    }

    if (firstSchedule.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to merge these schedules' });
    }

    // Create new merged schedule
    const mergedSchedule = new Schedule({
      classId: firstSchedule.classId,
      teacherId: firstSchedule.teacherId,
      sessionType: firstSchedule.sessionType,
      dayOfWeek: firstSchedule.dayOfWeek,
      startTime: moment.min(schedules.map((s) => moment(s.startTime, 'HH:mm'))).format('HH:mm'),
      endTime: moment.max(schedules.map((s) => moment(s.endTime, 'HH:mm'))).format('HH:mm'),
      roomNumber: firstSchedule.roomNumber,
      semester: firstSchedule.semester,
      academicYear: firstSchedule.academicYear,
      location: firstSchedule.location
    });

    await mergedSchedule.save();

    await Schedule.updateMany({ _id: { $in: scheduleIds } }, { isActive: false });

    await new AuditLog({
      userId: req.user._id,
      action: 'MERGE_SCHEDULES',
      details: { 
        mergedScheduleId: mergedSchedule._id,
        originalScheduleIds: scheduleIds
      },
    }).save();
    
    const populatedSchedule = await Schedule.findById(mergedSchedule._id)
      .populate('classId', 'subjectCode subjectName')
      .populate('teacherId', 'fullName email');

    res.json(populatedSchedule);
  } catch (err) {
    logger.error('Merge schedules error:', err);
    res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message });
  }
};

/**
 * @route  POST /api/schedules/split/:id
 * @desc   Split a schedule by ID
 * @access Teachers or Admin
 */
export const splitSchedule = async (req, res) => {
  try {
    const { splitPoints } = req.body;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new Error('Invalid schedule ID');
    }

    const originalSchedule = await Schedule.findById(id);
    if (!originalSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (originalSchedule.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to split this schedule' });
    }

    const newSchedules = [];
    let currentStartTime = moment(originalSchedule.startTime, 'HH:mm');

    for (const splitTime of [...splitPoints, originalSchedule.endTime]) {
      const splitMoment = moment(splitTime, 'HH:mm');
      if (!splitMoment.isValid() || !splitMoment.isAfter(currentStartTime)) {
        throw new Error('Invalid split point');
      }

      const newSchedule = new Schedule({
        classId: originalSchedule.classId,
        teacherId: originalSchedule.teacherId,
        sessionType: originalSchedule.sessionType,
        dayOfWeek: originalSchedule.dayOfWeek,
        startTime: currentStartTime.format('HH:mm'),
        endTime: splitMoment.format('HH:mm'),
        roomNumber: originalSchedule.roomNumber,
        semester: originalSchedule.semester,
        academicYear: originalSchedule.academicYear,
        location: originalSchedule.location
      });

      await newSchedule.save();
      const populatedSchedule = await Schedule.findById(newSchedule._id)
        .populate('classId', 'subjectCode subjectName')
        .populate('teacherId', 'fullName email');
      newSchedules.push(populatedSchedule);
      currentStartTime = splitMoment;
    }

    // Deactivate original schedule
    originalSchedule.isActive = false;
    await originalSchedule.save();

    await new AuditLog({
      userId: req.user._id,
      action: 'SPLIT_SCHEDULE',
      details: { 
        originalScheduleId: id,
        newScheduleIds: newSchedules.map((s) => s._id),
      },
    }).save();

    res.json(newSchedules);
  } catch (err) {
    logger.error('Split schedule error:', err);
    res.status(err.message === 'Schedule not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
 * @route POST /api/schedules/check-conflict
 * @desc  Check for schedule conflicts
 * @access Teacher or Admin
 */
export const checkScheduleConflict = async (req, res) => {
  try {
    const { teacherId, dayOfWeek, startTime, endTime } = req.body;

    if (!mongoose.isValidObjectId(teacherId)) {
      throw new Error('Invalid teacher ID');
    }

    if (teacherId !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new Error('Teacher ID must match authenticated user');
    }

    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');
    const conflictingSchedule = await Schedule.findOne({
      teacherId,
      dayOfWeek,
      isActive: true,
      $or: [
        {
          startTime: { $lt: end.format('HH:mm') },
          endTime: { $gt: start.format('HH:mm') },
        },
      ],
    });

    if (conflictingSchedule) {
      return res.status(409).json({
        conflict: true,
        conflictingSchedule,
      });
    }

    res.json({ conflict: false });
  } catch (err) {
    logger.error('Check schedule conflict error:', err);
    res.status(400).json({ error: err.message });    
  }
};