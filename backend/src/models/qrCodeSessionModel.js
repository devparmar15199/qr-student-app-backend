import mongoose from 'mongoose';

const qrCodeSessionSchema = new mongoose.Schema({
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        required: true, 
        index: true 
    },
    scheduleId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Schedule', 
        required: false 
    },
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    sessionId: { 
        type: String, 
        required: true, 
        unique: true,
        match: /^[a-f0-9]{32}$/, 
    },
    qrPayload: {
        classNumber: String,
        subjectCode: String,
        subjectName: String,
        classYear: String,
        semester: String,
        division: String,
        timestamp: Date,
        coordinates: { 
            latitude: { type: Number, min: -90, max: 90 }, 
            longitude: { type: Number, min: -180, max: 180 }, 
        },
        token: { type: String, required: true }
    },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
}, { strict: true, timestamps: true });

// Validate teacherId, classId, scheduleId
qrCodeSessionSchema.pre('save', async function(next) {
    const user = await mongoose.model('User').findById(this.teacherId);
    const classObj = await mongoose.model('Class').findById(this.classId);
    
    if (!user || user.role !== 'teacher') {
        return next(new Error('Invalid teacher ID or user is not a teacher'));
    }
    if (!classObj) {
        return next(new Error('Invalid classId'));
    }
    
    // Only validate schedule if scheduleId is provided
    if (this.scheduleId) {
        const schedule = await mongoose.model('Schedule').findById(this.scheduleId);
        if (!schedule || schedule.classId.toString() !== this.classId.toString()) {
            return next(new Error('Invalid scheduleId'));
        }
    }
    
    next();
});

// TTL index for all expired sessions
qrCodeSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for performance
qrCodeSessionSchema.index({ teacherId: 1, isActive: 1 });

export const QRCodeSession = mongoose.model('QRCodeSession', qrCodeSessionSchema);