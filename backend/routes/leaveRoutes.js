import express from 'express';
import {
    applyLeave, getMyLeaves, getCoordinatorLeaves, getAdminTeacherLeaves, approveLeave, rejectLeave, revokeLeave, getLeaveDocument
} from '../controllers/leaveController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/document/:id', getLeaveDocument);

router.use(protect);

const handleUpload = (req, res, next) => {
    upload.single('document')(req, res, (err) => {
        if (err) {
            console.warn('[Leave Upload] Multer processing warning:', err.message);
            if (req.body && (req.body.documentData || req.body.document)) {
                return next();
            }
            return res.status(400).json({ message: err.message || 'File upload error' });
        }
        next();
    });
};

router.post('/apply', handleUpload, applyLeave);
router.get('/my-leaves', getMyLeaves);

// Coordinator Routes
router.get('/coordinator/all', authorizeRoles('admin', 'teacher'), getCoordinatorLeaves);

// Admin Routes for Teacher Leaves
router.get('/admin/teacher-leaves', authorizeRoles('admin'), getAdminTeacherLeaves);

router.put('/approve/:id', authorizeRoles('admin', 'teacher'), approveLeave);
router.put('/reject/:id', authorizeRoles('admin', 'teacher'), rejectLeave);
router.put('/revoke/:id', authorizeRoles('admin', 'teacher'), revokeLeave);

export default router;
