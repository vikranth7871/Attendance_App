import mongoose from 'mongoose';

/**
 * QuizAttempt Schema — records every student quiz submission
 * @property {ObjectId} studentId - Ref to User (student)
 * @property {ObjectId} quizId - Ref to Quiz
 * @property {Array} answers - Array of {questionIndex, selectedOption} pairs
 * @property {Number} score - Raw correct count
 * @property {Number} percentage - (score/total)*100
 * @property {Boolean} passed - percentage >= quiz.passingScore
 * @property {Number} timeTaken - Seconds taken to complete
 * @property {Date} completedAt - When submitted
 * @property {String} semester / year - Denormalized for record keeping
 */
const quizAttemptSchema = new mongoose.Schema({
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
    answers: [{
        questionIndex: { type: Number, required: true },
        selectedOption: { type: Number, default: -1 } // -1 = skipped
    }],
    score: { type: Number, required: true, default: 0 },
    percentage: { type: Number, required: true, default: 0 },
    passed: { type: Boolean, required: true, default: false },
    timeTaken: { type: Number, default: 0 }, // seconds
    completedAt: { type: Date, default: Date.now },
    semester: { type: String, default: '' },
    year: { type: String, default: '' }
}, { timestamps: true });

// Index for fast leaderboard queries
quizAttemptSchema.index({ quizId: 1, percentage: -1, timeTaken: 1 });
quizAttemptSchema.index({ studentId: 1, quizId: 1 });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
export default QuizAttempt;
