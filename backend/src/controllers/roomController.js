import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { Room } from '../models/roomModel.js';
import { Schedule } from '../models/scheduleModel.js';
import { AuditLog } from '../models/auditLogModel.js';

/**
 * @route  GET /api/rooms
 * @desc   Get all rooms
 * @access Teacher or Admin
 */
export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .sort({ roomNumber: 1 })
      .populate('createdBy', 'fullName email');
    
    res.json(rooms);
  } catch (err) {
    logger.error('Get rooms error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * @route  GET /api/rooms/type/:type
 * @desc   Get rooms by type
 * @access Teacher or Admin
 */
export const getRoomsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const rooms = await Room.find({ type, isActive: true })
      .sort({ roomNumber: 1 })
      .populate('createdBy', 'fullName email');

    res.json(rooms);
  } catch (err) {
    logger.error('Get rooms by type error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route  POST /api/rooms
 * @desc   Create a new room
 * @access Teacher or Admin
 */
export const createRoom = async (req, res) => {
  try {
    const { roomNumber, type } = req.body;

    if (req.user.role !== 'admin' && req.user._id.toString() !== req.body.createdBy) {
      throw new Error('CreatedBy ID must match authenticated user');
    }

    // Check if room number already exists
    const existingRoom = await Room.findOne({ roomNumber, isActive: true });
    if (existingRoom) {
      return res.status(409).json({ error: 'Room number already exists' });
    }

    const room = new Room({
      roomNumber,
      type,
      createdBy: req.user._id
    });

    await room.save();

    await new AuditLog({
      userId: req.user._id,
      action: 'CREATE_ROOM',
      details: { roomId: room._id, roomNumber },
      status: 'success',
    }).save();

    const populatedRoom = await Room.findById(room._id).populate('createdBy', 'fullName email');

    res.status(201).json(populatedRoom);
  } catch (err) {
    logger.error('Create room error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route  PUT /api/rooms/:id
 * @desc   Update a room by ID
 * @access Teacher or Admin
 */
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomNumber, type, isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      throw new Error('Invalid room ID');
    }

    if (req.user.role !== 'admin' && req.body.createdBy && req.body.createdBy !== req.user._id.toString()) {
      throw new Error('CreatedBy ID must match authenticated user');
    }

    if (roomNumber) {
      const existingRoom = await Room.findOne({
        roomNumber,
        _id: { $ne: id },
        isActive: true,
      });
      if (existingRoom) {
        return res.status(409).json({ error: 'Room number already exists' });
      }
    }

    const room = await Room.findByIdAndUpdate(
      id,
      { roomNumber, type, isActive },
      { new: true, runValidators: true },
    ).populate('createdBy', 'fullName email');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Log the update
    await new AuditLog({
      userId: req.user._id,
      action: 'UPDATE_ROOM',
      details: { roomId: room._id, roomNumber: room.roomNumber },
    }).save();

    res.json(room);
  } catch (err) {
    logger.error('Update room error:', err);
    res.status(err.message === 'Room not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
 * @route  DELETE /api/rooms/:id
 * @desc   Delete a room (soft delete)
 * @access Teacher or Admin
 */
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new Error('Invalid room ID');
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const schedules = await Schedule.find({ roomNumber: room.roomNumber, isActive: true });
    if (schedules.length > 0) { 
      room.isActive = false;
      await room.save();
      await new AuditLog({
        userId: req.user._id,
        action: 'DEACTIVATE_ROOM',
        details: { roomId: room._id, roomNumber: room.roomNumber, activeSchedules: schedules.length },
        status: 'success',
      }).save();

      return res.status(400).json({
        error: 'Room is in use by active schedules and has been deactivated',
        activeSchedules: schedules.length,
      });
    }

    await room.deleteOne();

    await new AuditLog({
      userId: req.user._id,
      action: 'DELETE_ROOM',
      details: { roomId: room._id, roomNumber: room.roomNumber },
      status: 'success',
    }).save();

    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    logger.error('Delete room error:', err);
    res.status(err.message === 'Room not found' ? 404 : 400).json({ error: err.message });
  }
};

/**
 * @route  POST /api/rooms/initialize
 * @desc   Initialize default rooms
 * @access Teachers or Admin
 */
export const initializeDefaultRooms = async (req, res) => {
  try {
    const customRooms = req.body.rooms || [
      { roomNumber: '101', type: 'classroom' },
      { roomNumber: '102', type: 'classroom' },
      { roomNumber: '103', type: 'classroom' },
      { roomNumber: '201', type: 'classroom' },
      { roomNumber: '202', type: 'classroom' },
      { roomNumber: '203', type: 'classroom' },
      { roomNumber: 'L01', type: 'lab' },
      { roomNumber: 'L02', type: 'lab' },
      { roomNumber: 'L03', type: 'lab' },
      { roomNumber: 'AUD-1', type: 'auditorium' },
      { roomNumber: 'AUD-2', type: 'auditorium' },
      { roomNumber: 'SEM-1', type: 'seminar' },
      { roomNumber: 'SEM-2', type: 'seminar' },
    ];

    const createdRooms = [];
    const skippedRooms = [];

    for (const roomData of customRooms) {
      try {
        const existingRoom = await Room.findOne({
          roomNumber: roomData.roomNumber,
          isActive: true,
        });

        if (existingRoom) {
          skippedRooms.push(roomData.roomNumber);
          continue;
        }

        const newRoom = new Room({
          ...roomData,
          createdBy: req.user._id,
        });

        await newRoom.save();
        createdRooms.push(newRoom);

        await new AuditLog({
          userId: req.user._id,
          action: 'CREATE_DEFAULT_ROOM',
          details: { roomId: newRoom._id, roomNumber: newRoom.roomNumber },
          status: 'success',
          }).save();
      } catch (error) {
        logger.error(`Error creating default room ${roomData.roomNumber}:`, error);
        skippedRooms.push({ roomNumber: roomData.roomNumber, error: error.message });
      }
    }

    const populatedRooms = await Room.find({ _id: { $in: createdRooms.map((room) => room._id) } }).populate(
      'createdBy', 
      'fullName email'
    );

    res.status(201).json({
      message: 'Default rooms initialization completed',
      created: createdRooms.length,
      skipped: skippedRooms,
      rooms: populatedRooms,
    });
  } catch (err) {
    logger.error('Initialize default rooms error:', err);
    res.status(400).json({ error: err.message });
  }
};