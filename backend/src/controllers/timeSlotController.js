import mongoose from 'mongoose';
import moment from 'moment';
import logger from '../utils/logger.js';
import { TimeSlot } from '../models/timeSlotModel.js';
import { Schedule } from '../models/scheduleModel.js';
import { AuditLog } from '../models/auditLogModel.js';

/**
 * Get all time slots
 * @route GET /api/timeslots
 * @access Public
 */
export const getTimeSlots = async (req, res) => {
  try {
    const { type, active, sort = 'order' } = req.query;
    const query = {};

    if (type) query.type = type;
    if (active !== undefined) query.isActive = active === 'true';

    // Get time slots with sorting
    const timeSlots = await TimeSlot.find(query)
      .populate('createdBy', 'fullName email')
      .sort(sort === 'order' ? { order: 1 } : { startTime: 1 })
      .lean();

    const groupedSlots = timeSlots.reduce((acc, slot) => {
      if (!acc[slot.type]) acc[slot.type] = [];

      acc[slot.type].push({
        id: slot._id,
        name: slot.name,
        time: {
          start: slot.startTime,
          end: slot.endTime
        },
        duration: slot.duration,
        order: slot.order,
        isActive: slot.isActive,
        createdBy: slot.createdBy ? { fullName: slot.createdBy.fullName, email: slot.createdBy.email } : null,
      });
      return acc;
    }, {});

    res.json({
      count: timeSlots.length,
      timeSlots: groupedSlots,
    });
  } catch (err) {
    logger.error('Get time slots error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get available time slots (excluding breaks)
 * @route GET /api/timeslots/available
 * @access Protected
 */
export const getAvailableTimeSlots = async (req, res) => {
  try {
    const { date, type = 'lecture' } = req.query;

    if (data && !moment(date, 'YYYY-MM-DD', true).isValid()) {
      throw new Error('Invalid data format, use YYYY-MM-DD');
    }

    // Get active time slots of specified type
    const timeSlots = await TimeSlot.find({
      type: { $in: ['lecture', 'lab'] },
      isActive: true,
    })
      .populate('createdBy', 'fullName email')
      .sort({ order: 1 });

    let availableSlots = timeSlots.map((slot) => ({
      id: slot._id,
      name: slot.name,
      time: {
        start: slot.startTime,
        end: slot.endTime
      },
      duration: slot.duration,
      isAvailable: true,
    }));

    // If date is provided, check schedule conflicts
    if (date) {
      const scheduleDate = moment(date, 'YYYY-MM-DD');
      const dayOfWeek = scheduleDate.format('dddd');
      
      const existingSchedules = await Schedule.find({
        dayOfWeek,
        isActive: true,
      });

      // Mark slots as unavailable if they conflict with existing schedules
      availableSlots = availableSlots.map((slot) => {
        const slotStart = moment(slot.time.start, 'HH:mm');
        const slotEnd = moment(slot.time.end, 'HH:mm');
        const hasConflict = existingSchedules.some((schedule) => {
          const scheduleStart = moment(schedule.startTime, 'HH:mm');
          const scheduleEnd = moment(schedule.endTime, 'HH:mm');
          return scheduleStart.isBefore(slotEnd) && scheduleEnd.isAfter(slotStart);
        });
        return { ...slot, isAvailable: !hasConflict };
      });
    }

    res.json({
      date: date || 'Not specified',
      type,
      count: availableSlots.length,
      availableSlots: availableSlots.filter((slot) => slot.isAvailable),
    });
  } catch (err) {
    logger.error('Get available time slots error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Create a new time slot
 * @route POST /api/timeslots
 * @access Admin
 */
export const createTimeSlot = async (req, res) => {
  try {
    const { name, startTime, endTime, type, order } = req.body;

    // Check for overlapping time slots
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH;mm');
    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
      throw new Error('Invalid time range');
    }

    const overlappingSlot = await TimeSlot.findOne({
      startTime: { $lt: end.format('HH:mm') },
      endTime: { $gt: start.format('HH:mm') },
      isActive: true,
    });

    if (overlappingSlot) {
      return res.status(409).json({
        error: 'Time slot overlaps with existing slot',
        conflictingSlot: {
          name: overlappingSlot.name,
          time: {
            start: overlappingSlot.startTime,
            end: overlappingSlot.endTime
          },
        },
      });
    }

    // Create time slot
    const timeSlot = new TimeSlot({
      name,
      startTime,
      endTime,
      type,
      order,
      createdBy: req.user._id
    });

    await timeSlot.save();

    await new AuditLog({
      userId: req.user._id,
      action: 'CREATE_TIMESLOT',
      details: {
        timeSlotId: timeSlot._id,
        name: timeSlot.name,
        time: `${timeSlot.startTime}-${timeSlot.endTime}`,
        type: timeSlot.type,
      },
      status: 'success'
    }).save();

    const populatedSlot = await TimeSlot.findById(timeSlot._id).populate('createdBy', 'fullName email');

    res.status(201).json({
      message: 'Time slot created successfully',
      timeSlot: {
        id: populatedSlot._id,
        name: populatedSlot.name,
        time: {
          start: populatedSlot.startTime,
          end: populatedSlot.endTime
        },
        type: populatedSlot.type,
        duration: populatedSlot.duration,
        order: populatedSlot.order,
        createdBy: populatedSlot.createdBy ? { fullName: populatedSlot.createdBy.fullName, email: populatedSlot.createdBy.email } : null,
      }
    });
  } catch (err) {
    logger.error('Create time slot error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Update a time slot
 * @route PUT /api/timeslots/:id
 * @access Admin
 */
export const updateTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, type, order, isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      throw new Error('Invalid time slot ID');
    }

    // Find existing time slot
    const timeSlot = await TimeSlot.findById(id);
    if (!timeSlot) {
      return res.status(404).json({ error: 'Time slot not found' });
    }

    if (startTime || endTime) {
      const start = moment(startTime || timeSlot.startTime, 'HH:mm');
      const end = moment(endTime || timeSlot.endTime, 'HH:mm');
      if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
        throw new Error('Invalid time range');
      }

      // Check for overlapping slots
      const overlappingSlot = await TimeSlot.findOne({
        _id: { $ne: id },
        startTime: { $lt: end.format('HH:mm') },
        endTime: { $gt: start.format('HH:mm') },
        isActive: true,
      });

      if (overlappingSlot) {
        return res.status(409).json({
          error: 'Updated time slot would overlap with existing slot',
          conflictingSlot: {
            name: overlappingSlot.name,
            time: {
              start: overlappingSlot.startTime,
              end: overlappingSlot.endTime
            },
          },
        });
      }
    }

    // Update time slot
    Object.assign(timeSlot, { name, startTime, endTime, type, order, isActive });
    await timeSlot.save();

    // Log update
    await new AuditLog({
      userId: req.user._id,
      action: 'UPDATE_TIMESLOT',
      details: {
        timeSlotId: timeSlot._id,
        updates: Object.keys(req.body),
        previousValues: Object.keys(req.body).reduce((acc, key) => {
          acc[key] = timeSlot[key];
          return acc;
        }, {})
      },
      status: 'success',
    }).save();

    const populatedSlot = await TimeSlot.findById(timeSlot._id).populate('createdBy', 'fullName email');

    res.json({
      message: 'Time slot updated successfully',
      timeSlot: {
        id: populatedSlot._id,
        name: populatedSlot.name,
        time: {
          start: populatedSlot.startTime,
          end: populatedSlot.endTime
        },
        type: populatedSlot.type,
        duration: populatedSlot.duration,
        order: populatedSlot.order,
        isActive: populatedSlot.isActive,
        createdBy: populatedSlot.createdBy ? { fullName: populatedSlot.createdBy.fullName, email: populatedSlot.createdBy.email } : null,
      },
    });
  } catch (err) {
    logger.error('Update time slot error:', err);
    res.status(err.message === 'Time slot not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
 * Delete a time slot
 * @route DELETE /api/timeslots/:id
 * @access Admin
 */
export const deleteTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new Error('Invalid time slot ID');
    }

    // Find time slot
    const timeSlot = await TimeSlot.findById(id);
    if (!timeSlot) {
      return res.status(404).json({ error: 'Time slot not found' });
    }

    // Check if time slot is used in any active schedules
    const schedules = await Schedule.find({
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      isActive: true,
    });

    if (schedules.length > 0) {
      // Mark as inactive instead of deleting
      timeSlot.isActive = false;
      await timeSlot.save();

      await new AuditLog({
        userId: req.user._id,
        action: 'DEACTIVATE_TIMESLOT',
        details: {
          timeSlotId: timeSlot._id,
          name: timeSlot.name,
          activeSchedules: schedules.length,
        },
        status: 'success',
      }).save();

      return res.json({
        message: 'Time slot has active schedules and has been deactivated',
        deactivated: true,
        activeSchedules: schedules.length
      });
    }

    await timeSlot.deleteOne();

    await new AuditLog({
      userId: req.user._id,
      action: 'DELETE_TIMESLOT',
      details: {
        timeSlotId: timeSlot._id,
        name: timeSlot.name,
        time: `${timeSlot.startTime}-${timeSlot.endTime}`
      },
      status: 'success',
    }).save();

    res.json({
      message: 'Time slot deleted successfully',
      deleted: true,
    });
  } catch (err) {
    logger.error('Delete time slot error:', err);
    res.status(err.message === 'Time slot not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
 * Initialize default time slots
 * @route POST /api/timeslots/initialize
 * @access Admin
 */
export const initializeDefaultTimeSlots = async (req, res) => {
  try {
    const customeSlots = req.body.slots || [
      { name: 'First Period', startTime: '09:00', endTime: '10:00', type: 'lecture', order: 1 },
      { name: 'Second Period', startTime: '10:00', endTime: '11:00', type: 'lecture', order: 2 },
      { name: 'Morning Break', startTime: '11:00', endTime: '11:15', type: 'break', order: 3 },
      { name: 'Third Period', startTime: '11:15', endTime: '12:15', type: 'lecture', order: 4 },
      { name: 'Fourth Period', startTime: '12:15', endTime: '13:15', type: 'lecture', order: 5 },
      { name: 'Lunch Break', startTime: '13:15', endTime: '14:00', type: 'break', order: 6 },
      { name: 'Fifth Period', startTime: '14:00', endTime: '15:00', type: 'lecture', order: 7 },
      { name: 'Sixth Period', startTime: '15:00', endTime: '16:00', type: 'lecture', order: 8 },
      { name: 'Lab Period', startTime: '16:00', endTime: '17:30', type: 'lab', order: 9 },
    ];

    // Check if time slots already exist
    const existingCount = await TimeSlot.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({ error: 'Time slots already initialized' });
    }

    const timeSlots = await TimeSlot.insertMany(
      customeSlots.map((slot) => ({
        ...slot,
        createdBy: req.user._id,
      }))
    );

    await new AuditLog({
      userId: req.user._id,
      action: 'INITIALIZE_TIMESLOTS',
      details: {
        count: timeSlots.length,
        slots: timeSlots.map((slot) => ({
          name: slot.name,
          time: `${slot.startTime}-${slot.endTime}`,
          type: slot.type,
        }))
      },
      status: 'success',
    }).save();

    const populatedSlots = await TimeSlot.find(
      { _id: { $in: timeSlots.map((s) => s._id) } 
    }).populate('createdBy', 'fullName email');

    res.json({
      message: 'Default time slots initialized successfully',
      count: timeSlots.length,
      timeSlots: populatedSlots.map((slot) => ({
        id: slot._id,
        name: slot.name,
        time: {
          start: slot.startTime,
          end: slot.endTime
        },
        type: slot.type,
        duration: slot.duration,
        order: slot.order,
        createdBy: slot.createdBy ? { fullName: slot.createdBy.fullName, email: slot.createdBy.email } : null,
      })),
    });
  } catch (err) {
    logger.error('Initialize time slots error:', err);
    res.status(400).json({ error: err.message });
  }
};
