import express from 'express';
import {
    markManualAttendance, bulkMarkManualAttendance, getClassAttendance, testAttendanceEmail
} from '../controllers/attendanceController.js';
import { protect, authorizeRoles, authorizePermissions } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// BUG-03 Fix: Guard test endpoint — admin only, not public
router.get('/test-attendance-email', authorizeRoles('admin'), testAttendanceEmail);

router.post('/manual', authorizeRoles('teacher', 'admin'), authorizePermissions('markAttendance', 'manualAttendance'), markManualAttendance);
router.post('/manual-bulk', authorizeRoles('teacher', 'admin'), authorizePermissions('markAttendance', 'manualAttendance'), bulkMarkManualAttendance);
router.get('/class/:classId', authorizeRoles('teacher', 'admin', 'parent'), authorizePermissions('viewAttendance'), getClassAttendance);

export default router;
