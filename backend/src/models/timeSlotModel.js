import mongoose from 'mongoose';
import moment from 'moment';

const timeSlotSchema = new mongoose.Schema({
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['lecture', 'lab', 'break'], 
        required: true 
    },
    duration: { type: Number },
    isActive: { type: Boolean, default: true },
    order: { type: Number, required: true },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    }
}, { strict: true, timestamps: true });

// Validate createdBy
timeSlotSchema.pre('save', async function(next) {
  const user = await mongoose.model('User').findById(this.createdBy);
  if (!user || user.role !== 'admin') {
    return next(new Error('Invalid createdBy ID or user is not an admin'));
  }
  next();
});

// Calculate duration
timeSlotSchema.pre('save', function(next) {
  if (this.isModified('startTime') || this.isModified('endTime')) {
    const start = moment(this.startTime, 'HH:mm');
    const end = moment(this.endTime, 'HH:mm');
    this.duration = end.diff(start, 'minutes');
  }
  next();
});

timeSlotSchema.index({ order: 1, isActive: 1 });
timeSlotSchema.index({ startTime: 1, endTime: 1, isActive: 1 }, { unique: true });

export const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);