import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema({
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        required: true,
        index: true 
    },
    leaveDate: { type: Date, required: true },
    reason: { 
        type: String, 
        required: true,
        maxlength: 500,
        trim: true
    },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending',
        index: true
    },
    documentUrl: { type: String },
    reviewedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    reviewedAt: { type: Date },
    reviewComments: { type: String, maxlength: 500 }
}, { strict: true, timestamps: true });

// Validation
leaveRequestSchema.pre('save', async function(next) {
    const [student, classObj, reviewer] = await Promise.all([
        mongoose.model('User').findById(this.studentId),
        mongoose.model('Class').findById(this.classId),
        this.reviewedBy ? mongoose.model('User').findById(this.reviewedBy) : null
    ]);
    
    if (!student || student.role !== 'student') {
        return next(new Error('Invalid studentId or user is not a student'));
    }
    if (!classObj) {
        return next(new Error('Invalid classId'));
    }
    if (this.reviewedBy && (!reviewer || !['teacher', 'admin'].includes(reviewer.role))) {
        return next(new Error('Invalid reviewedBy or user is not a teacher/admin'));
    }
    next();
});

leaveRequestSchema.index({ studentId: 1, classId: 1, leaveDate: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);