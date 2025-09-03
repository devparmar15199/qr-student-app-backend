import mongoose from 'mongoose';

const classEnrollmentSchema = new mongoose.Schema({
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        required: true, 
        index: true 
    },
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    isActive: { type: Boolean, default: true }, // Add isActive field
    enrolledAt: { type: Date, default: Date.now }
}, { strict: true, timestamps: true });

// Ensure studentId is a student
classEnrollmentSchema.pre('save', async function(next) {
    const user = await mongoose.model('User').findById(this.studentId);
    if (!user || user.role !== 'student') {
        return next(new Error('Invalid student ID or user is not a student'));
    }
    next();
});

// Unique index to prevent duplicate enrollments
classEnrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });

export const ClassEnrollment = mongoose.model('ClassEnrollment', classEnrollmentSchema);