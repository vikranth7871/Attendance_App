import express from 'express';
import {
    getMySubjects, getMyRoster, getStudentProfile, updateStudentByCoordinator, getAttendanceReport,
    getTeacherAssignments, createTeacherAssignment, updateTeacherAssignment, deleteTeacherAssignment, getAssignmentSubmissions, gradeAssignmentSubmission,
    getTeacherExams, createTeacherExam, updateTeacherExam, deleteTeacherExam, submitTeacherExamMarks, submitBulkTeacherExamMarks,
    getTeacherParentMessages, replyParentMessage
} from '../controllers/teacherController.js';
import { protect, authorizeRoles, authorizePermissions } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/subjects', protect, authorizeRoles('teacher'), getMySubjects);
router.get('/roster', protect, authorizeRoles('teacher'), getMyRoster);
router.get('/report', protect, authorizeRoles('teacher'), getAttendanceReport);
router.get('/student/:studentId/profile', protect, authorizeRoles('teacher'), getStudentProfile);
router.put('/student/:studentId/update', protect, authorizeRoles('teacher', 'admin'), updateStudentByCoordinator);
router.get('/assignments', protect, authorizeRoles('teacher'), getTeacherAssignments);
router.post('/assignments', protect, authorizeRoles('teacher'), createTeacherAssignment);
router.put('/assignments/:id', protect, authorizeRoles('teacher'), updateTeacherAssignment);
router.delete('/assignments/:id', protect, authorizeRoles('teacher'), deleteTeacherAssignment);
router.get('/assignments/:id/submissions', protect, authorizeRoles('teacher'), getAssignmentSubmissions);
router.post('/assignments/:id/grade', protect, authorizeRoles('teacher'), gradeAssignmentSubmission);
router.get('/exams', protect, authorizeRoles('teacher'), getTeacherExams);
router.post('/exams', protect, authorizeRoles('teacher'), createTeacherExam);
router.put('/exams/:id', protect, authorizeRoles('teacher'), updateTeacherExam);
router.delete('/exams/:id', protect, authorizeRoles('teacher'), deleteTeacherExam);
router.post('/exams/marks', protect, authorizeRoles('teacher'), submitTeacherExamMarks);
router.post('/exams/marks-bulk', protect, authorizeRoles('teacher'), submitBulkTeacherExamMarks);
router.get('/messages', protect, authorizeRoles('teacher'), getTeacherParentMessages);
router.post('/messages/reply', protect, authorizeRoles('teacher'), replyParentMessage);

export default router;
