import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true,
    },
    action: { 
        type: String, 
        required: true, 
        enum: [
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
        ],
        index: true,
    },
    details: { type: mongoose.Schema.Types.Mixed },
    status: { 
        type: String, 
        required: true, 
        enum: ['success', 'failed'], 
        default: 'success',
    },
}, { strict: true, timestamps: true });

// Validate userId
auditLogSchema.pre('save', async function (next) {
    const user = await mongoose.model('User').findById(this.userId);
    if (!user) {
        return next(new Error('Invalid userId'));
    }
    next();
});

// Compound index for common queries
auditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);