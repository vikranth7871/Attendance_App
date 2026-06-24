import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import {
    generateAIQuestions,
    createQuiz,
    togglePublishQuiz,
    getQuizzes,
    getManageQuizzes,
    getQuizById,
    submitAttempt,
    getLeaderboard,
    getMyAttempts,
    getMyCertificates,
    deleteQuiz,
    getQuizCertificates
} from '../controllers/quizController.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ── Admin + Teacher Routes (must come before /:id to avoid conflict) ───
router.get('/admin/manage', authorizeRoles('admin', 'teacher'), getManageQuizzes);   // Manage all quizzes
router.post('/generate-ai', authorizeRoles('admin', 'teacher'), upload.single('image'), generateAIQuestions); // AI question generation
router.post('/create', authorizeRoles('admin', 'teacher'), createQuiz);              // Create quiz

// ── Student-only fixed routes ──────────────────────────────────────────
router.get('/my-attempts', authorizeRoles('student'), getMyAttempts);                // My attempt history
router.get('/my-certificates', authorizeRoles('student'), getMyCertificates);        // My certificates

// ── Shared routes ──────────────────────────────────────────────────────
router.get('/', getQuizzes);                                                         // Browse published quizzes
router.get('/:id', getQuizById);                                                     // Get quiz details
router.post('/:id/attempt', authorizeRoles('student'), submitAttempt);               // Submit attempt
router.get('/:id/leaderboard', getLeaderboard);                                      // Quiz leaderboard
router.put('/:id/publish', authorizeRoles('admin', 'teacher'), togglePublishQuiz);   // Publish / unpublish
router.delete('/:id', authorizeRoles('admin', 'teacher'), deleteQuiz);               // Delete quiz
router.get('/:id/certificates', authorizeRoles('admin', 'teacher'), getQuizCertificates); // Get certificates for a quiz

export default router;
