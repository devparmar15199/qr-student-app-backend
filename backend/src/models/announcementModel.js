import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        required: true,
        index: true 
    },
    authorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { 
        type: String, 
        required: true,
        maxlength: 200,
        trim: true
    },
    content: { 
        type: String, 
        required: true,
        maxlength: 2000,
        trim: true
    },
    isActive: { type: Boolean, default: true },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'medium' 
    }
}, { strict: true, timestamps: true });

// Validation
announcementSchema.pre('save', async function(next) {
    const [author, classObj] = await Promise.all([
        mongoose.model('User').findById(this.authorId),
        mongoose.model('Class').findById(this.classId)
    ]);
    
    if (!author || !['teacher', 'admin'].includes(author.role)) {
        return next(new Error('Invalid authorId or user is not a teacher/admin'));
    }
    if (!classObj) {
        return next(new Error('Invalid classId'));
    }
    next();
});

announcementSchema.index({ classId: 1, isActive: 1, createdAt: -1 });
announcementSchema.index({ priority: 1, createdAt: -1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);