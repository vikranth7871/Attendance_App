import express from 'express';
import { globalSearch } from '../controllers/searchController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin', 'teacher')); // BUG-14 Fix: Teachers need search access for GlobalSearch component

router.get('/', globalSearch);

export default router;
