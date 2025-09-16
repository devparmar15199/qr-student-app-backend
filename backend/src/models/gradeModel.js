import mongoose from 'mongoose';

// --- Grade Schema ---
const gradeSchema = new mongoose.Schema({
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        required: true,
        index: true 
    },
    gradedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    assignmentName: { 
        type: String, 
        required: true,
        maxlength: 200,
        trim: true
    },
    assignmentType: { 
        type: String, 
        enum: ['quiz', 'assignment', 'midterm', 'final', 'project', 'lab', 'other'],
        required: true
    },
    score: { 
        type: Number, 
        required: true,
        min: 0
    },
    maxScore: { 
        type: Number, 
        required: true,
        min: 1
    },
    percentage: { type: Number },
    grade: { 
        type: String, 
        enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F']
    },
    comments: { 
        type: String,
        maxlength: 500
    },
    date: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: false }
}, { strict: true, timestamps: true });

// Calculate percentage and grade
gradeSchema.pre('save', function(next) {
    if (this.isModified('score') || this.isModified('maxScore')) {
        this.percentage = Math.round((this.score / this.maxScore) * 100 * 100) / 100;
        
        // Calculate letter grade
        if (this.percentage >= 97) this.grade = 'A+';
        else if (this.percentage >= 93) this.grade = 'A';
        else if (this.percentage >= 90) this.grade = 'A-';
        else if (this.percentage >= 87) this.grade = 'B+';
        else if (this.percentage >= 83) this.grade = 'B';
        else if (this.percentage >= 80) this.grade = 'B-';
        else if (this.percentage >= 77) this.grade = 'C+';
        else if (this.percentage >= 73) this.grade = 'C';
        else if (this.percentage >= 70) this.grade = 'C-';
        else if (this.percentage >= 67) this.grade = 'D+';
        else if (this.percentage >= 60) this.grade = 'D';
        else this.grade = 'F';
    }
    next();
});

// Validation
gradeSchema.pre('save', async function(next) {
    const [student, classObj, grader] = await Promise.all([
        mongoose.model('User').findById(this.studentId),
        mongoose.model('Class').findById(this.classId),
        mongoose.model('User').findById(this.gradedBy)
    ]);
    
    if (!student || student.role !== 'student') {
        return next(new Error('Invalid studentId or user is not a student'));
    }
    if (!classObj) {
        return next(new Error('Invalid classId'));
    }
    if (!grader || !['teacher', 'admin'].includes(grader.role)) {
        return next(new Error('Invalid gradedBy or user is not a teacher/admin'));
    }
    if (this.score > this.maxScore) {
        return next(new Error('Score cannot be greater than max score'));
    }
    next();
});

gradeSchema.index({ studentId: 1, classId: 1, date: -1 });
gradeSchema.index({ classId: 1, assignmentType: 1, date: -1 });
gradeSchema.index({ isPublished: 1, date: -1 });

export const Grade = mongoose.model('Grade', gradeSchema);