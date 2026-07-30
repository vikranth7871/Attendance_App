import { pool } from '../config/db.js';

export const getMyStreak = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const userRes = await pool.query(
            'SELECT id, streak_count as "streakCount", best_streak as "bestStreak", last_attendance_date as "lastAttendanceDate" FROM users WHERE id = $1',
            [userId]
        );
        res.json(userRes.rows[0] || { streakCount: 0, bestStreak: 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getLeaderboard = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        const result = await pool.query(`
            SELECT u.id as "_id", u.id, u.name, u.roll_number as "rollNumber",
                   u.streak_count as "streakCount", u.best_streak as "bestStreak",
                   u.section, c.name as "className"
            FROM users u
            LEFT JOIN classes c ON u.class_id = c.id
            WHERE u.role = 'student'
            ORDER BY u.streak_count DESC, u.best_streak DESC, u.name ASC
            LIMIT 25
        `);

        const currentStudentRank = result.rows.findIndex(s => String(s.id) === String(userId)) + 1;

        res.json({
            leaderboard: result.rows,
            userRank: currentStudentRank > 0 ? currentStudentRank : 1,
            totalStudents: result.rows.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentOverview = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        // 1. Fetch student user from PostgreSQL
        const userRes = await pool.query(
            'SELECT streak_count, best_streak FROM users WHERE id = $1',
            [userId]
        );

        const streakCount = parseInt(userRes.rows[0]?.streak_count, 10) || 0;
        const bestStreak = parseInt(userRes.rows[0]?.best_streak, 10) || 0;

        // 2. Fetch attendance records for this student from PostgreSQL
        const attRes = await pool.query(`
            SELECT DISTINCT ON (a.id)
                   a.id, a.status, a.date, a.time_slot, a.method, a.created_at, 
                   s.name as subject_name,
                   sa.room_number, sa.time_slot as allocated_slot, sa.start_time, sa.end_time,
                   u.name as teacher_name
            FROM attendance a
            LEFT JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN subject_allocations sa ON (a.subject_id = sa.subject_id AND (a.time_slot = sa.time_slot OR a.time_slot IS NULL))
            LEFT JOIN users u ON a.marked_by = u.id
            WHERE a.student_id = $1
            ORDER BY a.id, a.date DESC, a.created_at DESC
        `, [userId]);

        const records = attRes.rows;
        records.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

        const totalPresent = records.filter(r => r.status === 'present').length;
        const totalAbsent = records.filter(r => r.status === 'absent').length;
        const totalClasses = records.length;

        const history = records.map(r => ({
            _id: String(r.id),
            status: r.status,
            date: r.date || r.created_at,
            timeSlot: r.time_slot || r.allocated_slot || (r.start_time ? `${r.start_time} - ${r.end_time}` : null),
            time: r.time_slot || r.allocated_slot || (r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'),
            roomNumber: r.room_number || 'C5-05',
            teacherName: r.teacher_name || 'Jane Teacher',
            method: r.method || 'manual',
            subjectId: { subjectName: r.subject_name || 'Subject' }
        }));

        res.json({
            streakCount,
            bestStreak,
            totalPresent,
            totalAbsent,
            totalClasses,
            history
        });
    } catch (error) {
        console.error('Error fetching student overview:', error);
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
            SELECT DISTINCT ON (sa.class_id, sa.subject_id, sa.day_of_week, sa.time_slot)
                   sa.id as allocation_id,
                   sa.day_of_week, sa.time_slot, sa.start_time, sa.end_time, sa.room_number,
                   s.id as subject_id, s.name as subject_name, s.department_id,
                   c.id as class_id, c.name as class_name,
                   u.id as teacher_id, u.name as teacher_name, u.email as teacher_email
            FROM subject_allocations sa
            LEFT JOIN subjects s ON sa.subject_id = s.id
            LEFT JOIN classes c ON sa.class_id = c.id
            LEFT JOIN users u ON sa.teacher_id = u.id
            WHERE sa.class_id = $1
            ORDER BY sa.class_id, sa.subject_id, sa.day_of_week, sa.time_slot, sa.id ASC
        `, [studentClassId]);

        if (result.rows.length === 0) {
            result = await pool.query(`
                SELECT DISTINCT ON (sa.class_id, sa.subject_id, sa.day_of_week, sa.time_slot)
                       sa.id as allocation_id,
                       sa.day_of_week, sa.time_slot, sa.start_time, sa.end_time, sa.room_number,
                       s.id as subject_id, s.name as subject_name, s.department_id,
                       c.id as class_id, c.name as class_name,
                       u.id as teacher_id, u.name as teacher_name, u.email as teacher_email
                FROM subject_allocations sa
                LEFT JOIN subjects s ON sa.subject_id = s.id
                LEFT JOIN classes c ON sa.class_id = c.id
                LEFT JOIN users u ON sa.teacher_id = u.id
                ORDER BY sa.class_id, sa.subject_id, sa.day_of_week, sa.time_slot, sa.id ASC
            `);
        }

        // Fetch subject-wise attendance aggregation for this student
        const statsRes = await pool.query(`
            SELECT subject_id,
                   COUNT(id) as total_count,
                   COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
                   COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
                   COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave_count
            FROM attendance
            WHERE student_id = $1
            GROUP BY subject_id
        `, [userId]);

        const statsMap = {};
        statsRes.rows.forEach(r => {
            const tot = parseInt(r.total_count, 10) || 0;
            const pres = parseInt(r.present_count, 10) || 0;
            const abs = parseInt(r.absent_count, 10) || 0;
            const lev = parseInt(r.leave_count, 10) || 0;
            const pct = tot > 0 ? Math.round((pres / tot) * 100) : 0;
            statsMap[r.subject_id] = { total: tot, present: pres, absent: abs, leave: lev, percentage: pct };
        });

        const subjects = result.rows.map(r => {
            const st = statsMap[r.subject_id] || { total: 0, present: 0, absent: 0, leave: 0, percentage: 0 };
            return {
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
                },
                attendance: st
            };
        });

        res.json(subjects);
    } catch (error) {
        console.error('CRITICAL ERROR in getMySubjects:', error);
        res.status(500).json({ message: error.message });
    }
};
