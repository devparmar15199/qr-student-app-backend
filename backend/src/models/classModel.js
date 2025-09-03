import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
    classNumber: { type: String, required: true },
    subjectCode: { 
        type: String, 
        required: true, 
        index: true,
        match: /^[A-Z]{4}\d{5}$/,
    },
    subjectName: { type: String, required: true },
    classYear: { type: String, required: true },
    semester: { type: String, required: true },
    division: { type: String, required: true },
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
}, { strict: true, timestamps: true });

// Unique index to prevent duplicate classes
classSchema.index({ subjectCode: 1, semester: 1, division: 1 }, { unique: true });

export const Class = mongoose.model('Class', classSchema);