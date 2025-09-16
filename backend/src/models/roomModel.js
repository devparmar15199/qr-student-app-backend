import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    roomNumber: { 
        type: String, 
        required: true, 
        unique: true,
        match: /^[A-Z]{1}[0-9]{3}$/,
        trim: true,
    },
    type: { 
        type: String, 
        enum: ['classroom', 'lab', 'auditorium', 'seminar'], 
        required: true, 
        default: 'classroom',
    },
    isActive: { type: Boolean, default: true },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
    }
}, { strict: true, timestamps: true });

// Validate createdBy
roomSchema.pre('save', async function (next) {
    const user = await mongoose.model('User').findById(this.createdBy);
    if (!user || !['admin', 'teacher'].includes(user.role)) {
        return next(new Error('Invalid createdBy ID or user is not an admin/teacher'));
    }
    next();
});

roomSchema.index({ roomNumber: 1, isActive: 1 });

export const Room = mongoose.model('Room', roomSchema);