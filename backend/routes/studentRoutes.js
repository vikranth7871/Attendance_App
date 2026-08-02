import express from 'express';
import { getMyStreak, getLeaderboard, getStudentOverview, getMySubjects, getMyAssignments, submitAssignment, getStudentResults, getSubjectDetails } from '../controllers/studentController.js';
import { protect, authorizeRoles, authorizePermissions } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/streak', authorizeRoles('student'), getMyStreak);
router.get('/overview', authorizeRoles('student'), authorizePermissions('viewAttendance'), getStudentOverview);
router.get('/subjects', authorizeRoles('student'), getMySubjects);
router.get('/subjects/:subjectId/details', authorizeRoles('student'), getSubjectDetails);
router.get('/assignments', authorizeRoles('student'), getMyAssignments);
router.post('/assignments/:id/submit', authorizeRoles('student'), submitAssignment);
router.get('/results', authorizeRoles('student'), getStudentResults);
router.get('/leaderboard', getLeaderboard); // Anyone authenticated can view leaderboard

export default router;
