import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        required: true,
        index: true 
    },
    uploadedBy: { 
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
    description: { 
        type: String,
        maxlength: 1000,
        trim: true
    },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number },
    fileType: { 
        type: String, 
        enum: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'image', 'video', 'other'],
        required: true
    },
    isActive: { type: Boolean, default: true },
    downloadCount: { type: Number, default: 0 }
}, { strict: true, timestamps: true });

// Validation
resourceSchema.pre('save', async function(next) {
    const [uploader, classObj] = await Promise.all([
        mongoose.model('User').findById(this.uploadedBy),
        mongoose.model('Class').findById(this.classId)
    ]);
    
    if (!uploader || !['teacher', 'admin'].includes(uploader.role)) {
        return next(new Error('Invalid uploadedBy or user is not a teacher/admin'));
    }
    if (!classObj) {
        return next(new Error('Invalid classId'));
    }
    next();
});

resourceSchema.index({ classId: 1, isActive: 1, createdAt: -1 });
resourceSchema.index({ uploadedBy: 1, createdAt: -1 });

export const Resource = mongoose.model('Resource', resourceSchema);