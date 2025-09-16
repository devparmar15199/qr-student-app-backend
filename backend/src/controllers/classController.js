import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { Class } from '../models/classModel.js';
import { ClassEnrollment } from '../models/classEnrollmentModel.js';
import { ClassTeacher } from '../models/classTeacherModel.js';
import { Schedule } from '../models/scheduleModel.js';
import { User } from '../models/userModel.js';
import { AuditLog } from '../models/auditLogModel.js';

/**
 * @route POST /api/classes
 * @desc Create a new class
 * @access Teacher or Admin
 */
export const createClass = async (req, res) => {
  try {
    const { classNumber, subjectCode, subjectName, classYear, semester, division } = req.body;

    // Create class with teacherId from authenticated user
    const classObj = new Class({
      classNumber,
      subjectCode,
      subjectName,
      classYear,
      semester,
      division,
      teacherId: req.user._id,
    });
    await classObj.save();

    // Create ClassTeacher entry
    await new ClassTeacher({
      classId: classObj._id,
      teacherId: req.user._id,
    }).save();

    // Log class creation in AuditLog
    await new AuditLog({
      userId: req.user._id,
      action: 'CREATE_CLASS',
      details: { classId: classObj._id, subjectCode },
    }).save();

    // Populate teacher details
    const populatedClass = await Class.findById(classObj._id).populate('teacherId', 'fullName email');

    res.status(201).json(populatedClass);
  } catch (err) {
    logger.error('Class creation error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route POST /api/classes/enroll
 * @desc Enroll a student in a class
 * @access Teacher or Admin
 */
export const enrollStudent = async (req, res) => {
  try {
    const { classId, studentId } = req.body;

    if (!mongoose.isValidObjectId(classId) || !mongoose.isValidObjectId(studentId)) {
      throw new Error('Invalid class or student ID');
    }

    // Verify class exists and user is authorized
    const classTeacher = await ClassTeacher.findOne({ classId, teacherId: req.user._id });
    if (!classTeacher && req.user.role !== 'admin') {
      throw new Error('Not authorized to enroll students in this class');
    }

    // Check if student is already enrolled to avoid duplicates
    const existingEnrollment = await ClassEnrollment.findOne({ classId, studentId });
    if (existingEnrollment) {
      return res.status(409).json({ error: 'Student is already enrolled in this class' });
    }

    // Create ClassEnrollment entry with correct field names
    const enrollment = new ClassEnrollment({
      classId: classId, // Use classId as defined in schema
      studentId: studentId // Use studentId as defined in schema
    });
    await enrollment.save();

    // Log enrollment
    await new AuditLog({
      userId: req.user._id,
      action: 'ENROLL_STUDENT',
      details: { classId, studentId },
    }).save();

    // Populate class and student details
    const populatedEnrollment = await ClassEnrollment.findById(enrollment._id)
      .populate('classId', 'subjectCode subjectName')
      .populate('studentId', 'fullName enrollmentNo');

    res.status(201).json(populatedEnrollment);
  } catch (err) {
    logger.error('Enrollment error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route GET /api/classes
 * @desc Get all classes for the authenticated user
 * @access Teacher or Student
 */
export const getClasses = async (req, res) => {
  try {
    let classes;
    if (req.user.role === 'teacher' || req.user.role === 'admin') {
      const classTeachers = await ClassTeacher.find({ teacherId: req.user._id }).populate(
        'classId',
        'classNumber subjectCode subjectName classYear semester division teacherId'
      );
      classes = classTeachers.map((ct) => ct.classId).filter((c) => c);
      if (classes.length < classTeachers.length) {
        logger.warn('Some classes not found for teacher:', { userId: req.user._id });
      }
    } else {
      const enrollments = await ClassEnrollment.find({ studentId: req.user._id }).populate(
        'classId',
        'classNumber subjectCode subjectName classYear semester division teacherId'
      );
      classes = enrollments.map((e) => e.classId).filter((c) => c);
      if (classes.length < enrollments.length) {
        logger.warn('Some classes not found for student:', { userId: req.user._id });
      }
    }

    // Populate teacher details
    await Class.populate(classes, { path: 'teacherId', select: 'fullName email' });

    res.json(classes);
  } catch (err) {
    logger.error('Get classes error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * @route GET /api/classes/:id
 * @desc Get a specific class by ID
 * @access Teacher or Student
 */
export const getClassById = async (req, res) => {
  try {
    const classId = req.params.id;

    if (!mongoose.isValidObjectId(classId)) {
      throw new Error('Invalid class ID');
    }

    // Verify user has access
    const isTeacher = await ClassTeacher.findOne({ classId, teacherId: req.user._id });
    const isStudent = await ClassEnrollment.findOne({ classId, studentId: req.user._id });
    if (!isTeacher && !isStudent && req.user.role !== 'admin') {
      throw new Error('Not authorized to access this class');
    }

    const classObj = await Class.findById(classId).populate('teacherId', 'fullName email');
    if (!classObj) {
      throw new Error('Class not found');
    }

    res.json(classObj);
  } catch (err) {
    logger.error('Get class by ID error:', err);
    if (err.message === 'Class not found') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message })
    }
  }
};

/**
 * @route PUT /api/classes/:id
 * @desc Update a class
 * @access Teacher or Admin
 */
export const updateClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const { classNumber, subjectCode, subjectName, classYear, semester, division } = req.body;

    if (!mongoose.isValidObjectId(classId)) {
      throw new Error('Invalid class ID');
    }

    // Verify user is authorized
    const classTeacher = await ClassTeacher.findOne({ classId, teacherId: req.user._id });
    if (!classTeacher && req.user.role !== 'admin') {
      throw new Error('Not authorized to update this class');
    }

    // Update class    
    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      { classNumber, subjectCode, subjectName, classYear, semester, division, teacherId: req.user._id },
      { new: true, runValidators: true }
    ).populate('teacherId', 'fullName email');

    if (!updatedClass) {
      throw new Error('Class not found');
    }

    // Log class update
    await new AuditLog({
      userId: req.user._id,
      action: 'UPDATE_CLASS',
      details: { classId, subjectCode },
    }).save();

    res.json(updatedClass);
  } catch (err) {
    logger.error('Update class error:', err);
    if (err.message === 'Class not found') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};

/**
 * @route DELETE /api/classes/:id
 * @desc Delete a class
 * @access Teacher or Admin
 */
/**
 * @route GET /api/classes/:id/students
 * @desc Get all students enrolled in a specific class
 * @access Teacher or Admin
 */
export const getClassStudents = async (req, res) => {
  try {
    const classId = req.params.id;

    if (!mongoose.isValidObjectId(classId)) {
      throw new Error('Invalid class ID');
    }

    // Verify user is authorized to access this class
    const classTeacher = await ClassTeacher.findOne({ classId, teacherId: req.user._id });
    if (!classTeacher && req.user.role !== 'admin') {
      throw new Error('Not authorized to access this class');
    }

    // Get all enrollments for this class with student details
    const enrollments = await ClassEnrollment.find({ classId, isActive: true })
      .populate('studentId', 'fullName email enrollmentNo')
      .populate('classId', 'subjectCode subjectName')
      .sort({ createdAt: -1 });

    // Extract student information
    const students = enrollments.map(enrollment => ({
      _id: enrollment.studentId._id,
      name: enrollment.studentId.fullName,
      email: enrollment.studentId.email,
      enrollmentNo: enrollment.studentId.enrollmentNo,
      enrolledAt: enrollment.createdAt,
      isActive: enrollment.isActive
    }));

    res.json(students);
  } catch (err) {
    logger.error('Get class students error:', err);
    if (err.message === 'Class not found' || err.message === 'Not authorized to access this class') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};

export const deleteClass = async (req, res) => {
  try {
    const classId = req.params.id;

    if (!mongoose.isValidObjectId(classId)) {
      throw new Error('Invalid class ID');
    }

    // Verify user is authorized
    const classTeacher = await ClassTeacher.findOne({ classId, teacherId: req.user._id });
    if (!classTeacher && req.user.role !== 'admin') {
      throw new Error('Not authorized to delete this class');
    }

    // Delete class
    const deletedClass = await Class.findByIdAndDelete(classId);
    if (!deletedClass) {
      throw new Error('Class not found');
    }

    // Delete related records
    await ClassTeacher.deleteMany({ classId });
    await ClassEnrollment.deleteMany({ classId });

    // Log class deletion
    await new AuditLog({
      userId: req.user._id,
      action: 'DELETE_CLASS',
      details: { classId, subjectCode: deletedClass.subjectCode }
    }).save();

    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    logger.error('Delete class error:', err);
    if (err.message === 'Class not found') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};

/**
 * @route GET /api/classes/:id/schedule
 * @desc Get schedule for a specific class
 * @access Student, Teacher, Admin
 */
export const getClassSchedule = async (req, res) => {
  try {
    const classId = req.params.id;

    if (!mongoose.isValidObjectId(classId)) {
      throw new Error('Invalid class ID');
    }

    // Verify user has access to this class
    const isTeacher = await ClassTeacher.findOne({ classId, teacherId: req.user._id });
    const isStudent = await ClassEnrollment.findOne({ classId, studentId: req.user._id, isActive: true });
    
    if (!isTeacher && !isStudent && req.user.role !== 'admin') {
      throw new Error('Not authorized to access this class');
    }

    // Get schedules for this class
    const schedules = await Schedule.find({ classId, isActive: true })
      .populate('teacherId', 'fullName email')
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json(schedules);
  } catch (err) {
    logger.error('Get class schedule error:', err);
    if (err.message === 'Not authorized to access this class') {
      res.status(403).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};

/**
 * @route GET /api/classes/:id/classmates
 * @desc Get classmates for a specific class (for students)
 * @access Student, Teacher, Admin
 */
export const getClassmates = async (req, res) => {
  try {
    const classId = req.params.id;

    if (!mongoose.isValidObjectId(classId)) {
      throw new Error('Invalid class ID');
    }

    // Verify user has access to this class
    const isTeacher = await ClassTeacher.findOne({ classId, teacherId: req.user._id });
    const isStudent = await ClassEnrollment.findOne({ classId, studentId: req.user._id, isActive: true });
    
    if (!isTeacher && !isStudent && req.user.role !== 'admin') {
      throw new Error('Not authorized to access this class');
    }

    // Get all active enrollments for this class
    const enrollments = await ClassEnrollment.find({ classId, isActive: true })
      .populate('studentId', 'fullName email enrollmentNo profilePictureUrl phoneNumber department division semester year')
      .sort({ 'studentId.fullName': 1 });

    // Extract student information
    const classmates = enrollments.map(enrollment => {
      const student = enrollment.studentId;
      return {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        enrollmentNo: student.enrollmentNo,
        profilePictureUrl: student.profilePictureUrl,
        phoneNumber: student.phoneNumber,
        department: student.department,
        division: student.division,
        semester: student.semester,
        year: student.year,
        enrolledAt: enrollment.enrolledAt
      };
    });

    res.json(classmates);
  } catch (err) {
    logger.error('Get classmates error:', err);
    if (err.message === 'Not authorized to access this class') {
      res.status(403).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};