import mongoose from 'mongoose';

const classTeacherSchema = new mongoose.Schema({
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        required: true, 
        index: true 
    },
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    assignedAt: { type: Date, default: Date.now }
}, { strict: true, timestamps: true });

// Ensure teacherId is a teacher
classTeacherSchema.pre('save', async function(next) {
    const user = await mongoose.model('User').findById(this.teacherId);
    if (!user || user.role !== 'teacher') {
        return next(new Error('Invalid teacher ID or user is not a teacher'));
    }
    next();
});

// Unique index to prevent duplicate assignments
classTeacherSchema.index({ classId: 1, teacherId: 1 }, { unique: true });
export const ClassTeacher = mongoose.model('ClassTeacher', classTeacherSchema);