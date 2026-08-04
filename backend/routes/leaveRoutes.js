import express from 'express';
import {
    applyLeave, getMyLeaves, getCoordinatorLeaves, getAdminTeacherLeaves, approveLeave, rejectLeave, revokeLeave, getLeaveDocument
} from '../controllers/leaveController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/apply', upload.single('document'), applyLeave);
router.get('/my-leaves', getMyLeaves);
router.get('/document/:id', getLeaveDocument);

// Coordinator Routes
router.get('/coordinator/all', authorizeRoles('admin', 'teacher'), getCoordinatorLeaves);

// Admin Routes for Teacher Leaves
router.get('/admin/teacher-leaves', authorizeRoles('admin'), getAdminTeacherLeaves);

router.put('/approve/:id', authorizeRoles('admin', 'teacher'), approveLeave);
router.put('/reject/:id', authorizeRoles('admin', 'teacher'), rejectLeave);
router.put('/revoke/:id', authorizeRoles('admin', 'teacher'), revokeLeave);

export default router;
