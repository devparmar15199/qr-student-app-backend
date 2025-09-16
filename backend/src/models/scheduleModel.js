import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        required: true, 
        index: true 
    },
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    sessionType: { 
        type: String, 
        enum: ['lecture', 'lab', 'tutorial', 'project', 'seminar'], 
        required: true 
    },
    dayOfWeek: { 
        type: String, 
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], 
        required: true 
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    roomNumber: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    semester: { type: String, required: true },
    academicYear: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    }
}, { strict: true, timestamps: true });

// Validate teacherId
scheduleSchema.pre('save', async function(next) {
    const user = await mongoose.model('User').findById(this.teacherId);
    if (!user || user.role !== 'teacher') {
        return next(new Error('Invalid teacher ID or user is not a teacher'));
    }
    next();
});

// Indexes
scheduleSchema.index({ location: '2dsphere' });
scheduleSchema.index({ teacherId: 1, dayOfWeek: 1, startTime: 1 });
scheduleSchema.index({ teacherId: 1, dayOfWeek: 1, startTime: 1, roomNumber: 1 }, { unique: true });

export const Schedule = mongoose.model('Schedule', scheduleSchema);