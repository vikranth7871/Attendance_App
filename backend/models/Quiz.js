import mongoose from 'mongoose';

/**
 * Individual MCQ question sub-schema
 */
const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options: [{
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false }
    }],
    explanation: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    aiGenerated: { type: Boolean, default: false }
}, { _id: true });

/**
 * Quiz Schema
 * @typedef {Object} Quiz
 * @property {String} title - Quiz title
 * @property {String} description - Short description shown on card
 * @property {String} type - 'practice' (subject-based) or 'university' (competitive, timed, certified)
 * @property {ObjectId} subjectId - Ref to Subject (for practice quizzes)
 * @property {String} semester - e.g. "1", "2", "3"
 * @property {String} year - e.g. "2025"
 * @property {Array} questions - MCQ questions
 * @property {Number} timeLimit - In minutes (only for university quizzes)
 * @property {Number} passingScore - Percentage needed to pass (default 80)
 * @property {Boolean} isPublished - Only published quizzes are visible to students
 * @property {ObjectId} createdBy - Ref to User (admin/teacher)
 * @property {Array} tags - Syllabus topic tags
 * @property {String} syllabus - Raw syllabus text for AI generation context
 * @property {ObjectId} targetClass - If set, only students in this class can take it
 * @property {ObjectId} targetDepartment - If set, only students in this dept can take it
 * @property {Number} maxAttempts - Max attempts allowed per student (default 3)
 */
const quizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
        type: String,
        enum: ['practice', 'university'],
        default: 'practice',
        required: true
    },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    semester: { type: String, default: '' },
    year: { type: String, default: '' },
    questions: [questionSchema],
    timeLimit: { type: Number, default: 30 }, // minutes
    passingScore: { type: Number, default: 80 }, // percentage
    isPublished: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String }],
    syllabus: { type: String, default: '' },
    targetClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    targetDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    maxAttempts: { type: Number, default: 3 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'mixed' }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
