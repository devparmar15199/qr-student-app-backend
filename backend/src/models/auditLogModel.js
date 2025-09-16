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