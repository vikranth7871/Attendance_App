import mongoose from 'mongoose';

/**
 * Certificate Schema — issued when a student passes a university quiz with >= passingScore
 * @property {ObjectId} studentId - Ref to User (student)
 * @property {ObjectId} quizId - Ref to Quiz
 * @property {ObjectId} attemptId - Ref to QuizAttempt
 * @property {String} certificateId - Unique human-readable ID (e.g. "CERT-2025-XF7K2A")
 * @property {Date} issuedAt - Issue date
 * @property {Number} score / percentage - Denormalized for PDF generation
 * @property {String} studentName / quizTitle - Denormalized for PDF generation without joins
 */
const certificateSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizAttempt',
        required: true
    },
    certificateId: {
        type: String,
        required: true,
        unique: true
    },
    issuedAt: { type: Date, default: Date.now },
    score: { type: Number },
    percentage: { type: Number },
    // Denormalized fields for fast certificate rendering (no joins needed)
    studentName: { type: String },
    quizTitle: { type: String },
    subjectName: { type: String, default: '' }
}, { timestamps: true });

certificateSchema.index({ studentId: 1 });
certificateSchema.index({ certificateId: 1 }, { unique: true });

const Certificate = mongoose.model('Certificate', certificateSchema);
export default Certificate;
