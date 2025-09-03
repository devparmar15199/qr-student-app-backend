import mongoose from 'mongoose';
import { body, param, query, validationResult } from 'express-validator';

export const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const registerValidation = [
  body('enrollmentNo')
    .optional()
    .isString()
    .matches(/^[A-Z]{2}\d{2}[A-Z]{4}\d{3}$/)
    .withMessage('Enrollment number must be in the format ETXXBTXX000'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/)
    .withMessage('Password must be at least 6 characters with at least one uppercase letter, one lowercase letter, and one number'),
  body('fullName').notEmpty().isString().withMessage('Full name is required and must be a string'),
  body('role').isIn(['teacher', 'student', 'admin']).withMessage('Role must be teacher, student, or admin'),
];

export const loginValidation = [
  body('enrollmentNo')
    .optional()
    .isString()
    .matches(/^[A-Z]{2}\d{2}[A-Z]{4}\d{3}$/)
    .withMessage('Invalid enrollment number'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
  body().custom((value, { req }) => {
    if (!req.body.enrollmentNo && !req.body.email) {
      throw new Error('Enrollment number or email is required');
    }
    return true;
  }),
];

export const createUserValidation = [
  body('enrollmentNo')
    .optional()
    .isString()
    .matches(/^[A-Z]{2}\d{2}[A-Z]{4}\d{3}$/)
    .withMessage('Enrollment number must be in the format ETXXBTXX000'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/)
    .withMessage('Password must be at least 6 characters with at least one uppercase letter, one lowercase letter, and one number'),
  body('fullName').notEmpty().isString().withMessage('Full name is required and must be a string'),
  body('role').isIn(['teacher', 'student', 'admin']).withMessage('Role must be teacher, student, or admin'),
  body('faceEmbedding').optional().isArray().withMessage('Face embedding must be an array'),
];

export const updateUserValidation = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('fullName').optional().notEmpty().isString().withMessage('Full name must be a string'),
];

export const classValidation = [
  body('classNumber').notEmpty().isString().withMessage('Class number is required and must be a string'),
  body('subjectCode')
    .notEmpty()
    .isString()
    .matches(/^[A-Z]{4}\d{5}$/)
    .withMessage('Subject code must be like BTXX00000'),
  body('subjectName').notEmpty().isString().withMessage('Subject name is required and must be a string'),
  body('classYear').notEmpty().isString().withMessage('Class year is required and must be a string'),
  body('semester').notEmpty().isString().withMessage('Semester is required and must be a string'),
  body('division').notEmpty().isString().withMessage('Division is required and must be a string'),
  body('teacherId')
    .optional()
    .isMongoId()
    .withMessage('Invalid teacher ID')
    .custom(async (value, { req }) => {
      if (value && value !== req.user._id.toString()) {
        throw new Error('Teacher ID must match authenticated user');
      }
      if (value) {
        const user = await mongoose.model('User').findById(value);
        if (!user || user.role !== 'teacher') {
          throw new Error('Invalid teacher ID or user is not a teacher');
        }
      }
      return true;
    }),
];

export const enrollValidation = [
  body('classId').isMongoId().withMessage('Invalid class ID'),
  body('studentId')
    .isMongoId()
    .withMessage('Invalid student ID')
    .custom(async (value) => {
      const user = await mongoose.model('User').findById(value);
      if (!user || user.role !== 'student') {
        throw new Error('Invalid student ID or user is not a student');
      }
      return true;
    }),
];

export const scheduleValidation = [
  body('classId').isMongoId().withMessage('Invalid class ID'),
  body('teacherId')
    .isMongoId()
    .withMessage('Invalid teacher ID')
    .custom(async (value, { req }) => {
      if (value !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new Error('Teacher ID must match authenticated user');
      }
      const user = await mongoose.model('User').findById(value);
      if (!user || user.role !== 'teacher') {
        throw new Error('Invalid teacher ID or user is not a teacher');
      }
      return true;
    }),
  body('sessionType').isIn(['lecture', 'lab', 'project']).withMessage('Session type must be lecture, lab, or project'),
  body('dayOfWeek')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    .withMessage('Invalid day of week'),
  body('startTime')
    .notEmpty()
    .withMessage('Start time must be in HH:mm format'),
  body('endTime')
    .notEmpty()
    .withMessage('End time must be in HH:mm format'),
  body('roomNumber').notEmpty().isString().withMessage('Room number is required and must be a string'),
  body('semester').notEmpty().isString().withMessage('Semester is required and must be a string'),
  body('academicYear').notEmpty().isString().withMessage('Academic year is required and must be a string'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of two numbers')
    .isFloat()
    .withMessage('Coordinates must be numbers'),
];

export const bulkScheduleValidation = [
  body()
    .isArray()
    .withMessage('Input must be an array of schedules')
    .custom((value) => {
      if (!value.every((item) => typeof item === 'object')) {
        throw new Error('Each schedule must be an object');
      }
      return true;
    }),
  body('*.classId').isMongoId().withMessage('Invalid class ID'),
  body('*.teacherId')
    .isMongoId()
    .withMessage('Invalid teacher ID')
    .custom(async (value, { req }) => {
      if (value !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new Error('Teacher ID must match authenticated user');
      }
      const user = await mongoose.model('User').findById(value);
      if (!user || user.role !== 'teacher') {
        throw new Error('Invalid teacher ID or user is not a teacher');
      }
      return true;
    }),
  body('*.sessionType').isIn(['lecture', 'lab', 'project']).withMessage('Session type must be lecture, lab, or project'),
  body('*.dayOfWeek')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    .withMessage('Invalid day of week'),
  body('*.startTime')
    .notEmpty()
    .withMessage('Start time must be in HH:mm format'),
  body('*.endTime')
    .notEmpty()
    .withMessage('End time must be in HH:mm format'),
  body('*.roomNumber').notEmpty().isString().withMessage('Room number is required and must be a string'),
  body('*.semester').notEmpty().isString().withMessage('Semester is required and must be a string'),
  body('*.academicYear').notEmpty().isString().withMessage('Academic year is required and must be a string'),
  body('*.location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of two numbers')
    .isFloat()
    .withMessage('Coordinates must be numbers'),
];

export const mergeScheduleValidation = [
  body('scheduleIds')
    .isArray({ min: 2 })
    .withMessage('At least two schedule IDs are required')
    .custom((value) => value.every((id) => mongoose.isValidObjectId(id)))
    .withMessage('All schedule IDs must be valid'),
];

export const splitScheduleValidation = [
  body('splitPoints')
    .isArray({ min: 1 })
    .withMessage('At least one split point is required')
    .custom((value) =>
      value.every((time) => /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time))
    )
    .withMessage('Split points must be in HH:mm format'),
];

export const timeSlotValidation = [
  body('name').notEmpty().trim().withMessage('Name is required and must be a string'),
  body('startTime')
    .notEmpty()
    .withMessage('Start time must be in HH:mm format'),
  body('endTime')
    .notEmpty()
    .withMessage('End time must be in HH:mm format'),
  body('type').isIn(['lecture', 'lab', 'break']).withMessage('Type must be lecture, lab, or break'),
  body('order').isInt().withMessage('Order must be an integer'),
  body('createdBy')
    .isMongoId()
    .withMessage('Invalid createdBy ID')
    .custom(async (value, { req }) => {
      if (value !== req.user._id.toString()) {
        throw new Error('CreatedBy ID must match authenticated user');
      }
      const user = await mongoose.model('User').findById(value);
      if (!user || user.role !== 'admin') {
        throw new Error('Invalid createdBy ID or user is not an admin');
      }
      return true;
    }),
];

export const availableTimeSlotValidation = [
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  query('type')
    .optional()
    .isIn(['lecture', 'lab'])
    .withMessage('Type must be lecture or lab'),
];

export const initializeTimeSlotValidation = [
  body('slots')
    .optional()
    .isArray()
    .withMessage('Slots must be an array')
    .custom((value) => value.every((item) => typeof item === 'object'))
    .withMessage('Each slot must be an object'),
  body('slots.*.name').notEmpty().trim().withMessage('Slot name is required'),
  body('slots.*.startTime')
    .notEmpty()
    .withMessage('Slot start time must be in HH:mm format'),
  body('slots.*.endTime')
    .notEmpty()
    .withMessage('Slot end time must be in HH:mm format'),
  body('slots.*.type').isIn(['lecture', 'lab', 'break']).withMessage('Slot type must be lecture, lab, or break'),
  body('slots.*.order').isInt().withMessage('Slot order must be an integer'),
];

export const roomValidation = [
  body('roomNumber')
    .notEmpty()
    .isString()
    .matches(/^[A-Z]{1}[0-9]{3}$/)
    .withMessage('Room number must be in the format A123'),
  body('type')
    .isIn(['classroom', 'lab', 'auditorium', 'seminar'])
    .withMessage('Type must be classroom, lab, auditorium, or seminar'),
  body('createdBy')
    .isMongoId()
    .withMessage('Invalid createdBy ID')
    .custom(async (value, { req }) => {
      if (value !== req.user._id.toString()) {
        throw new Error('CreatedBy ID must match authenticated user');
      }
      const user = await mongoose.model('User').findById(value);
      if (!user || !['admin', 'teacher'].includes(user.role)) {
        throw new Error('Invalid createdBy ID or user is not an admin/teacher');
      }
      return true;
    }),
];

export const initializeRoomValidation = [
  body('rooms')
    .optional()
    .isArray()
    .withMessage('Rooms must be an array')
    .custom((value) => value.every((item) => typeof item === 'object'))
    .withMessage('Each room must be an object'),
  body('rooms.*.roomNumber')
    .notEmpty()
    .isString()
    .matches(/^[A-Z]{1}[0-9]{3}$/)
    .withMessage('Room number must be in the format A123'),
  body('rooms.*.type')
    .isIn(['classroom', 'lab', 'auditorium', 'seminar'])
    .withMessage('Type must be classroom, lab, auditorium, or seminar'),
];

export const typeValidation = [
  param('type')
    .isIn(['classroom', 'lab', 'auditorium', 'seminar'])
    .withMessage('Type must be classroom, lab, auditorium, or seminar'),
];

export const qrSessionValidation = [
  body('classId').isMongoId().withMessage('Invalid class ID'),
  body('scheduleId').optional().custom((value) => {
    if (value !== undefined && value !== null && !mongoose.isValidObjectId(value)) {
      throw new Error('Invalid schedule ID');
    }
    return true;
  }),
  body('teacherId')
    .optional()
    .isMongoId()
    .withMessage('Invalid teacher ID')
    .custom(async (value, { req }) => {
      if (value && value !== req.user._id.toString()) {
        throw new Error('Teacher ID must match authenticated user');
      }
      if (value) {
        const user = await mongoose.model('User').findById(value);
        if (!user || user.role !== 'teacher') {
          throw new Error('Invalid teacher ID or user is not a teacher');
        }
      }
      return true;
    }),
  body('coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

export const sessionIdValidation = [
  param('sessionId')
    .matches(/^[a-f0-9]{32}$/)
    .withMessage('Session ID must be a 32-character hexadecimal string'),
];

export const qrTokenValidation = [
  body('token').notEmpty().isString().withMessage('Token is required and must be a string'),
];

export const attendanceValidation = [
  // sessionId is a hex string, not a MongoDB ObjectId
  body('sessionId')
    .isString()
    .isLength({ min: 32, max: 32 })
    .matches(/^[a-f0-9]{32}$/)
    .withMessage('Session ID must be a 32-character hexadecimal string'),
  body('classId').isMongoId().withMessage('Invalid class ID'),
  // scheduleId can be null/optional since some QR sessions don't have scheduleId
  body('scheduleId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid schedule ID'),
  body('studentCoordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('studentCoordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('livenessPassed').optional().isBoolean().withMessage('Liveness passed must be a boolean'),
  // Face embedding can be optional or any array format since it varies by implementation
  body('faceEmbedding')
    .optional()
    .isArray()
    .withMessage('Face embedding must be an array'),
  // Status should not be sent by client - it's calculated by backend
  // studentId should not be sent by client - it comes from authenticated user
];

export const syncAttendanceValidation = [
  body('attendances')
    .isArray({ min: 1 })
    .withMessage('Attendances must be a non-empty array')
    .custom((value) => value.every((item) => typeof item === 'object'))
    .withMessage('Each attendance must be an object'),
  // sessionId is a hex string, not a MongoDB ObjectId
  body('attendances.*.sessionId')
    .isString()
    .isLength({ min: 32, max: 32 })
    .matches(/^[a-f0-9]{32}$/)
    .withMessage('Session ID must be a 32-character hexadecimal string'),
  body('attendances.*.classId').isMongoId().withMessage('Invalid class ID'),
  // scheduleId can be null/optional
  body('attendances.*.scheduleId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid schedule ID'),
  body('attendances.*.studentCoordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('attendances.*.studentCoordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('attendances.*.livenessPassed').optional().isBoolean().withMessage('Liveness passed must be a boolean'),
  body('attendances.*.faceEmbedding')
    .optional()
    .isArray()
    .withMessage('Face embedding must be an array'),
  body('attendances.*.syncVersion').isInt({ min: 1 }).withMessage('Sync version must be a positive integer'),
  body('attendances.*.attendedAt').isISO8601().withMessage('Attended at must be a valid date'),
];

export const manualAttendanceValidation = [
  body('studentId').isMongoId().withMessage('Invalid student ID'),
  body('classId').isMongoId().withMessage('Invalid class ID'),
  body('scheduleId').isMongoId().withMessage('Invalid schedule ID'),
  body('status')
    .isIn(['present', 'late', 'absent'])
    .withMessage('Status must be present, late, or absent'),
  body('attendedAt').optional().isISO8601().withMessage('Attended at must be a valid date'),
];

export const dateQueryValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('status')
    .optional()
    .isIn(['present', 'late', 'absent'])
    .withMessage('Status must be present, late, or absent'),
  query('classId').optional().isMongoId().withMessage('Invalid class ID'),
];

export const auditLogQueryValidation = [
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  query('action')
    .optional()
    .isIn([
      'GENERATE_QR_SESSION',
      'REFRESH_QR_TOKEN',
      'TERMINATE_QR_SESSION',
      'TERMINATE_ALL_QR_SESSIONS',
      'VALIDATE_QR_TOKEN',
      'SUBMIT_ATTENDANCE',
      'SYNC_ATTENDANCE',
      'MANUAL_ATTENDANCE',
      'CREATE_USER',
      'LOGIN',
      'UPDATE_USER',
      'CREATE_CLASS',
      'ENROLL_STUDENT',
      'CREATE_SCHEDULE',
      'UPDATE_SCHEDULE',
      'DELETE_SCHEDULE',
      'MERGE_SCHEDULES',
      'SPLIT_SCHEDULE',
      'CREATE_ROOM',
      'UPDATE_ROOM',
      'DELETE_ROOM',
      'CREATE_TIMESLOT',
      'UPDATE_TIMESLOT',
      'DELETE_TIMESLOT',
    ])
    .withMessage('Invalid action'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('status').optional().isIn(['success', 'failed']).withMessage('Status must be success or failed'),
];