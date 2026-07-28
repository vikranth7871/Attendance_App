import { pool } from '../config/db.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Subject from '../models/Subject.js';
import SubjectAllocation from '../models/SubjectAllocation.js';

export const getMyStreak = async (req, res) => {
    try {
        const student = await User.findById(req.user._id).select('streakCount bestStreak lastAttendanceDate');
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await User.find({ role: 'student' })
            .sort({ streakCount: -1 })
            .limit(10)
            .select('name streakCount bestStreak classId section');

        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentOverview = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch aggregate statistics
        let stats = { totalPresent: 0, totalAbsent: 0, totalClasses: 0, history: [], streakCount: 0, bestStreak: 0 };

        const user = await User.findById(userId).select('streakCount bestStreak');
        stats.streakCount = user?.streakCount || 0;
        stats.bestStreak = user?.bestStreak || 0;

        const attendanceRecords = await Attendance.find({ studentId: userId })
            .populate('subjectId', 'subjectName departmentId')
            .sort({ date: -1 });

        stats.totalPresent = attendanceRecords.filter(a => a.status === 'present').length;
        stats.totalAbsent = attendanceRecords.filter(a => a.status === 'absent').length;
        stats.totalClasses = attendanceRecords.length;
        stats.history = attendanceRecords;

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get subjects for the logged-in student (Class-allocated + Individually enrolled)
 * @route   GET /api/student/subjects
 * @access  Private (Student)
 */
export const getMySubjects = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const student = userRes.rows[0];

        const studentClassId = student.class_id || student.classId || 1;
        let result = await pool.query(`
            SELECT sa.id as allocation_id,
                   sa.day_of_week, sa.time_slot, sa.start_time, sa.end_time, sa.room_number,
                   s.id as subject_id, s.name as subject_name, s.department_id,
                   c.id as class_id, c.name as class_name,
                   u.id as teacher_id, u.name as teacher_name, u.email as teacher_email
            FROM subject_allocations sa
            LEFT JOIN subjects s ON sa.subject_id = s.id
            LEFT JOIN classes c ON sa.class_id = c.id
            LEFT JOIN users u ON sa.teacher_id = u.id
            WHERE sa.class_id = $1
        `, [studentClassId]);

        if (result.rows.length === 0) {
            result = await pool.query(`
                SELECT sa.id as allocation_id,
                       sa.day_of_week, sa.time_slot, sa.start_time, sa.end_time, sa.room_number,
                       s.id as subject_id, s.name as subject_name, s.department_id,
                       c.id as class_id, c.name as class_name,
                       u.id as teacher_id, u.name as teacher_name, u.email as teacher_email
                FROM subject_allocations sa
                LEFT JOIN subjects s ON sa.subject_id = s.id
                LEFT JOIN classes c ON sa.class_id = c.id
                LEFT JOIN users u ON sa.teacher_id = u.id
            `);
        }

        const subjects = result.rows.map(r => ({
            _id: String(r.allocation_id),
            id: r.allocation_id,
            dayOfWeek: r.day_of_week,
            timeSlot: r.time_slot,
            startTime: r.start_time,
            endTime: r.end_time,
            roomNumber: r.room_number,
            subjectId: {
                _id: String(r.subject_id),
                id: r.subject_id,
                subjectName: r.subject_name,
                name: r.subject_name,
                departmentId: r.department_id
            },
            classId: {
                _id: String(r.class_id),
                id: r.class_id,
                className: r.class_name,
                name: r.class_name
            },
            teacherId: {
                _id: String(r.teacher_id),
                id: r.teacher_id,
                name: r.teacher_name,
                email: r.teacher_email
            }
        }));

        res.json(subjects);
    } catch (error) {
        console.error('CRITICAL ERROR in getMySubjects:', error);
        res.status(500).json({ message: error.message });
    }
};
