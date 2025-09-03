import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
    },
    sessionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'QRCodeSession', 
        required: function () {
            return !this.manualEntry;
        },
    },
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        required: true,
    },
    scheduleId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Schedule',
        required: false,  // Make scheduleId optional
    },
    studentCoordinates: { 
        latitude: { 
            type: Number, 
            min: -90, 
            max: 90,
            required: function () {
                return !this.manualEntry;
            },
        },
        longitude: { 
            type: Number, 
            min: -180, 
            max: 180,
            required: function () {
                return !this.manualEntry;
            },
        },
    },
    attendedAt: { type: Date, default: Date.now },
    livenessPassed: { 
        type: Boolean,
        required: function () {
            return !this.manualEntry;
        },
        default: false,
    },
    faceEmbedding: { 
        type: [Number], 
        required: false,  // Make faceEmbedding optional
        default: [],
    },
    synced: { type: Boolean, default: false },
    syncVersion: { type: Number, default: 1 },
    manualEntry: { type: Boolean, default: false },
    status: { 
        type: String, 
        enum: ['present', 'late', 'absent'], 
        default: 'present',
    },
}, { strict: true, timestamps: true });

// Validation
attendanceSchema.pre('save', async function (next) {
    const [user, classObj, session] = await Promise.all([
        mongoose.model('User').findById(this.studentId),
        mongoose.model('Class').findById(this.classId),
        this.sessionId ? mongoose.model('QRCodeSession').findById(this.sessionId) : null,
    ]);
    
    // Validate schedule only if scheduleId is provided
    let schedule = null;
    if (this.scheduleId) {
        schedule = await mongoose.model('Schedule').findById(this.scheduleId);
        if (!schedule) {
            return next(new Error('Invalid scheduleId'));
        }
        if (schedule.classId.toString() !== this.classId.toString()) {
            return next(new Error('Schedule does not belong to the specified class'));
        }
    }
    
    if (!user || user.role !== 'student') {
        return next(new Error('Invalid studentId or user is not a student'));
    }
    if (!classObj || (this.sessionId && !session)) {
        return next(new Error('Invalid classId or sessionId'));
    }
    if (this.sessionId && session.classId.toString() !== this.classId.toString()) {
        return next(new Error('QR session does not belong to the specified class'));
    }
    if (this.manualEntry) {
        if (this.sessionId || this.studentCoordinates || this.livenessPassed || this.faceEmbedding.length > 0) {
            return next(new Error('Manual entries should not have sessionId, coordinates, livenessPassed, and faceEmbedding'));
        }
    }
    next();
});

// Indexes
attendanceSchema.index({ studentId: 1, classId: 1, attendedAt: -1 });
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true, sparse: true }); // sparse allows null sessionId

export const Attendance = mongoose.model('Attendance', attendanceSchema);