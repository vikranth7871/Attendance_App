import express from 'express';
import {
    getMySubjects, getMyRoster, getStudentProfile, getAttendanceReport,
    getTeacherAssignments, createTeacherAssignment,
    getTeacherExams, createTeacherExam, submitTeacherExamMarks,
    getTeacherParentMessages, replyParentMessage
} from '../controllers/teacherController.js';
import { protect, authorizeRoles, authorizePermissions } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/subjects', protect, authorizeRoles('teacher'), getMySubjects);
router.get('/roster', protect, authorizeRoles('teacher'), getMyRoster);
router.get('/report', protect, authorizeRoles('teacher'), getAttendanceReport);
router.get('/student/:studentId/profile', protect, authorizeRoles('teacher'), getStudentProfile);
router.get('/assignments', protect, authorizeRoles('teacher'), getTeacherAssignments);
router.post('/assignments', protect, authorizeRoles('teacher'), createTeacherAssignment);
router.get('/exams', protect, authorizeRoles('teacher'), getTeacherExams);
router.post('/exams', protect, authorizeRoles('teacher'), createTeacherExam);
router.post('/exams/marks', protect, authorizeRoles('teacher'), submitTeacherExamMarks);
router.get('/messages', protect, authorizeRoles('teacher'), getTeacherParentMessages);
router.post('/messages/reply', protect, authorizeRoles('teacher'), replyParentMessage);

export default router;
