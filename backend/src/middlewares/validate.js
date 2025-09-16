import mongoose from 'mongoose';
import { body, param, query, check, validationResult } from 'express-validator';

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

// Auth validations
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

export const registerValidation = [
  body('fullName').notEmpty().isString().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .withMessage('Password must be at least 6 characters with at least one uppercase letter, one lowercase letter, and one number'),
  body('enrollmentNo')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Enrollment number is required for students')
    .matches(/^[A-Z]{2}\d{2}[A-Z]{4}\d{3}$/)
    .withMessage('Enrollment number must be in the format ETXXBTXX000'),

  body('role').isIn(['teacher', 'student', 'admin']).withMessage('Role must be teacher, student, or admin'),

  // Student-specific fields validation
  body('phoneNumber')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Phone number is required for students')
    .matches(/^\+?[\d\s-()]{10,}$/)
    .withMessage('Invalid phone number format'),
  body('department')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Department is required for students')
    .isString(),
  body('division')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Division is required for students')
    .isString(),
  body('semester')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Semester is required for students')
    .isIn(['1', '2', '3', '4', '5', '6', '7', '8'])
    .withMessage('Invalid semester'),
  body('year')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Year is required for students')
    .isIn(['1', '2', '3', '4'])
    .withMessage('Invalid year'),
  body('profilePictureUrl').optional().isString(),
];

export const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
];

export const resetPasswordValidation = [
  body('token').notEmpty().isString().withMessage('Reset token is required'),
  body('newPassword')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .withMessage('Password must be at least 6 characters with at least one uppercase letter, one lowercase letter, and one number'),
];

// User validations
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

  // Student-specific fields required when creating a student
  body('phoneNumber')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Phone number is required for students'),
  body('department')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Department is required for students'),
  body('division')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Division is required for students'),
  body('semester')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Semester is required for students'),
  body('year')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Year is required for students'),
];

export const updateUserValidation = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('fullName').optional().notEmpty().isString().withMessage('Full name must be a string'),
  // Conditional validation for student-specific fields
  body('phoneNumber').optional().matches(/^\+?[\d\s-()]{10,}$/).withMessage('Invalid phone number format'),
  body('department').optional().notEmpty().withMessage('Department cannot be empty'),
  body('division').optional().notEmpty().withMessage('Division cannot be empty'),
  body('semester').optional().isIn(['1', '2', '3', '4', '5', '6', '7', '8']).withMessage('Invalid semester'),
  body('year').optional().isIn(['1', '2', '3', '4']).withMessage('Invalid year'),
  body('profilePictureUrl').optional().isURL().withMessage('Invalid URL format'),
];

// Validation for file upload using a custom check (requires multer middleware)
export const profilePictureValidation = [
  // This is a placeholder as express-validator does not directly validate files.
  // The actual file validation should happen after a multer middleware has processed the file.
  // The presence of a file can be checked on `req.file`
  check('profilePicture')
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error('Profile picture file is required');
      }
      // You can add more checks here, e.g., file type or size
      return true;
    })
];

// Class validations
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

// Schedule validations
export const createScheduleValidation = [
  body('classId').isMongoId().withMessage('Invalid class ID'),
  body('teacherId')
    .isMongoId()
    .withMessage('Invalid teacher ID')
    .custom(async (value, { req }) => {
      if (value !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new Error('Teacher ID must match authenticated user or user must be an admin');
      }
      return true;
    }),
  body('sessionType').isIn(['lecture', 'lab', 'tutorial', 'project', 'seminar']).withMessage('Invalid session type'),
  body('dayOfWeek')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    .withMessage('Invalid day of week'),
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:mm format'),
  body('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:mm format'),
  body('roomNumber').notEmpty().isString().withMessage('Room number is required'),
  body('semester').notEmpty().isString().withMessage('Semester is required'),
  body('academicYear').notEmpty().isString().withMessage('Academic year is required'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of two numbers'),
];

export const updateScheduleValidation = [
  param('id').isMongoId().withMessage('Invalid schedule ID'),
  body('classId').optional().isMongoId().withMessage('Invalid class ID'),
  body('teacherId')
    .optional()
    .isMongoId()
    .withMessage('Invalid teacher ID')
    .custom((value, { req }) => {
      if (value !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new Error('Teacher ID must match authenticated user or user must be an admin');
      }
      return true;
    }),
  body('sessionType').optional().isIn(['lecture', 'lab', 'tutorial', 'project', 'seminar']).withMessage('Invalid session type'),
  body('dayOfWeek')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    .withMessage('Invalid day of week'),
  body('startTime')
    .optional()
    .notEmpty()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:mm format'),
  body('endTime')
    .optional()
    .notEmpty()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:mm format'),
  body('roomNumber').optional().notEmpty().isString().withMessage('Room number is required'),
  body('semester').optional().notEmpty().isString().withMessage('Semester is required'),
  body('academicYear').optional().notEmpty().isString().withMessage('Academic year is required'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of two numbers'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const bulkScheduleValidation = [
  body()
    .isArray({ min: 1 })
    .withMessage('Input must be a non-empty array of schedules')
    .custom((value) => value.every(item => typeof item === 'object' && item !== null))
    .withMessage('Each schedule must be a valid object'),
  ...createScheduleValidation.map(validation => {
    return body(`*.${validation.builder.fields[0]}`);
  }),
];

// Re-defining bulkScheduleValidation more cleanly
export const bulkScheduleValidationClean = [
  body().isArray({ min: 1 }).withMessage('Input must be a non-empty array of schedules'),
  body('*.classId').isMongoId().withMessage('Invalid class ID for one or more schedules'),
  body('*.teacherId')
    .isMongoId().withMessage('Invalid teacher ID for one or more schedules')
    .custom((value, { req }) => {
      if (value !== req.user._id.toString() && req.user.role !== 'admin') {
        throw new Error('Teacher ID must match authenticated user or user must be an admin for all schedules');
      }
      return true;
    }),
  body('*.sessionType').isIn(['lecture', 'lab', 'tutorial', 'project', 'seminar']).withMessage('Invalid session type for one or more schedules'),
  body('*.dayOfWeek').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']).withMessage('Invalid day of week for one or more schedules'),
  body('*.startTime').notEmpty().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:mm format for all schedules'),
  body('*.endTime').notEmpty().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:mm format for all schedules'),
  body('*.roomNumber').notEmpty().isString().withMessage('Room number is required for all schedules'),
  body('*.semester').notEmpty().isString().withMessage('Semester is required for all schedules'),
  body('*.academicYear').notEmpty().isString().withMessage('Academic year is required for all schedules'),
  body('*.location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Coordinates must be an array of two numbers for all schedules'),
];

export const mergeScheduleValidation = [
  body('scheduleIds')
    .isArray({ min: 2 })
    .withMessage('At least two schedule IDs are required')
    .custom((value) => value.every(id => mongoose.isValidObjectId(id)))
    .withMessage('All schedule IDs must be valid'),
];

export const splitScheduleValidation = [
  param('id').isMongoId().withMessage('Invalid schedule ID'),
  body('splitPoints')
    .isArray({ min: 1 })
    .withMessage('At least one split point is required')
    .custom((value) => value.every((time) => /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)))
    .withMessage('Split points must be in HH:mm format'),
];

export const getScheduleQueryValidation = [
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  query('dayOfWeek')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day of week'),
  query('startDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Start date must be in YYYY-MM-DD format'),
];

// TimeSlot validations
export const createTimeSlotValidation = [
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
      return true;
    }),
];

export const updateTimeSlotValidation = [
  param('id').isMongoId().withMessage('Invalid time slot ID'),
  body('name').notEmpty().trim().withMessage('Name is required and must be a string'),
  body('startTime')
    .optional()
    .notEmpty()
    .withMessage('Start time must be in HH:mm format'),
  body('endTime')
    .optional()
    .notEmpty()
    .withMessage('End time must be in HH:mm format'),
  body('type').isIn(['lecture', 'lab', 'break']).withMessage('Type must be lecture, lab, or break'),
  body('order').isInt().withMessage('Order must be an integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
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
    .notEmpty()
    .isArray()
    .withMessage('Slots must be a non-empty array')
    .custom((value) => value.every((item) => typeof item === 'object' && item !== null))
    .withMessage('Each slot must be a valid object'),
  body('slots.*.name').notEmpty().trim().withMessage('Slot name is required'),
  body('slots.*.startTime')
    .notEmpty()
    .withMessage('Slot start time is required and must be in HH:mm format'),
  body('slots.*.endTime')
    .notEmpty()
    .withMessage('Slot end time is required and must be in HH:mm format'),
  body('slots.*.type').isIn(['lecture', 'lab', 'break']).withMessage('Slot type must be lecture, lab, or break'),
  body('slots.*.order').isInt().withMessage('Slot order must be an integer'),
  // Add validation for the `createdBy` field within the body of the request
  body('createdBy')
    .isMongoId()
    .withMessage('Invalid createdBy ID')
    .custom((value, { req }) => {
      if (value !== req.user._id.toString()) {
        throw new Error('CreatedBy ID must match authenticated user');
      }
      return true;
    }),
];

// Room validations
export const createRoomValidation = [
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
      return true;
    }),
];

export const updateRoomValidation = [
  param('id').isMongoId().withMessage('Invalid room ID'),
  body('roomNumber')
    .optional()
    .notEmpty()
    .isString()
    .matches(/^[A-Z]{1}[0-9]{3}$/)
    .withMessage('Room number must be in the format A123'),
  body('type')
    .optional()
    .isIn(['classroom', 'lab', 'auditorium', 'seminar'])
    .withMessage('Type must be classroom, lab, auditorium, or seminar'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

export const initializeRoomValidation = [
  body('rooms')
    .notEmpty()
    .isArray()
    .withMessage('Rooms must be a non-empty array')
    .custom((value) => value.every((item) => typeof item === 'object' && item !== null))
    .withMessage('Each room must be a valid object'),
  body('rooms.*.roomNumber')
    .notEmpty()
    .isString()
    .matches(/^[A-Z]{1}[0-9]{3}$/)
    .withMessage('Room number must be in the format A123'),
  body('rooms.*.type')
    .isIn(['classroom', 'lab', 'auditorium', 'seminar'])
    .withMessage('Type must be classroom, lab, auditorium, or seminar'),
  body('createdBy')
    .isMongoId()
    .withMessage('Invalid createdBy ID')
    .custom((value, { req }) => {
      if (value !== req.user._id.toString()) {
        throw new Error('CreatedBy ID must match authenticated user');
      }
      return true;
    }),
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
  query('action').optional(),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('status').optional().isIn(['success', 'failed']).withMessage('Status must be success or failed'),
];



