import express from 'express';
import {
    getChildren,
    getStudentSummary,
    getStudentAttendance,
    downloadAttendanceReport,
    getStudentLeaves,
    updateLeaveStatus,
    getStudentAcademic,
    getStudentAssignments,
    getStudentResults,
    getStudentFees,
    getParentMessages,
    sendParentMessage,
    markMessagesRead,
    updateParentProfile,
    changeParentPassword
} from '../controllers/parentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('parent'));

router.get('/children', getChildren);
router.get('/student-summary', getStudentSummary);
router.get('/student-attendance', getStudentAttendance);
router.get('/student-attendance/export', downloadAttendanceReport);
router.get('/student-leaves', getStudentLeaves);
router.put('/student-leaves/:id/action', updateLeaveStatus);
router.get('/student-academic', getStudentAcademic);
router.get('/student-assignments', getStudentAssignments);
router.get('/student-results', getStudentResults);
router.get('/student-fees', getStudentFees);
router.get('/messages', getParentMessages);
router.post('/messages', sendParentMessage);
router.put('/messages/read/:teacherId', markMessagesRead);
router.put('/profile', updateParentProfile);
router.put('/change-password', changeParentPassword);

export default router;
