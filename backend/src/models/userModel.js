import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    enrollmentNo: {
        type: String,
        required: function() {
            return this.role === 'student';
        },
        index: { unique: true, sparse: true },
        match: [/^[A-Z]{2}\d{2}[A-Z]{4}\d{3}$/, 'Invalid enrollment number format']
    },
    email: { 
        type: String, 
        unique: true, 
        required: true, 
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    passwordHash: { type: String, required: true },
    fullName: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 100
    },
    role: {
        type: String, 
        enum: ['teacher', 'student', 'admin'], 
        required: true, 
        default: 'student'
    },
    faceEmbedding: { type: [Number], default: [] },
    
    // Student-specific fields
    phoneNumber: {
        type: String,
        required: function() { return this.role === 'student'; },
        match: [/^\+?[\d\s-()]{10,}$/, 'Invalid phone number format']
    },
    department: {
        type: String,
        required: function() { return this.role === 'student'; },
        trim: true
    },
    division: {
        type: String,
        required: function() { return this.role === 'student'; },
        trim: true
    },
    semester: {
        type: String,
        required: function() { return this.role === 'student'; },
        enum: ['1', '2', '3', '4', '5', '6', '7', '8']
    },
    year: {
        type: String,
        required: function() { return this.role === 'student'; },
        enum: ['1', '2', '3', '4']
    },
    profilePictureUrl: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date }
}, { strict: true, timestamps: true });

// Pre-save hook to ensure enrollmentNo is not set for teachers/admins
userSchema.pre('save', function(next) {
    if (this.role !== 'student') {
        this.enrollmentNo = undefined;
    }
    next();
});

export const User = mongoose.model('User', userSchema);