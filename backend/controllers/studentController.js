import { pool } from '../config/db.js';

export const getMyStreak = async (req, res) => {
    // Streak concept removed — return neutral response for backwards compatibility
    res.json({ streakCount: 0, bestStreak: 0 });
};

export const getLeaderboard = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        const result = await pool.query(`
            SELECT u.id as "_id", u.id, u.name, u.roll_number as "rollNumber",
                   u.section, c.name as "className",
                   COUNT(a.id) FILTER (WHERE a.status = 'present') as "presentCount",
                   COUNT(a.id) as "totalCount",
                   CASE WHEN COUNT(a.id) > 0 
                        THEN ROUND((COUNT(a.id) FILTER (WHERE a.status = 'present')::decimal / COUNT(a.id)) * 100)
                        ELSE 0 
                   END as "attendanceRate"
            FROM users u
            LEFT JOIN classes c ON u.class_id = c.id
            LEFT JOIN attendance a ON a.student_id = u.id
            WHERE u.role = 'student'
            GROUP BY u.id, c.name
            ORDER BY "attendanceRate" DESC, "presentCount" DESC, u.name ASC
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

        // Fetch attendance records for this student from PostgreSQL
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
        const totalLeave = records.filter(r => r.status === 'leave').length;
        const totalClasses = records.length;
        const attendanceRate = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

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
            totalPresent,
            present_count: totalPresent,
            presentCount: totalPresent,
            totalAbsent,
            absent_count: totalAbsent,
            totalLeave,
            leave_count: totalLeave,
            totalClasses,
            total_classes: totalClasses,
            attendanceRate,
            attendance_rate: attendanceRate,
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

export const getMyAssignments = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const userRes = await pool.query('SELECT class_id FROM users WHERE id = $1', [userId]);
        const classId = userRes.rows[0]?.class_id || 1;

        const assignRes = await pool.query(`
            SELECT a.id, a.title, a.description, a.due_date, a.attachment_url,
                   COALESCE(sub.name, 'General Subject') as subject_name, sub.code as subject_code,
                   t.name as teacher_name,
                   CASE
                     WHEN s.grade IS NOT NULL OR s.status = 'graded' THEN 'graded'
                     WHEN s.status = 'completed' OR s.status = 'submitted' THEN 'submitted'
                     ELSE COALESCE(s.status, 'pending')
                   END as status,
                   s.submission_date, s.teacher_comments, s.grade
            FROM assignments a
            LEFT JOIN subjects sub ON a.subject_id = sub.id
            LEFT JOIN users t ON a.teacher_id = t.id
            LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = $1
            WHERE a.class_id = $2
            ORDER BY a.due_date ASC
        `, [userId, classId]);

        res.json(assignRes.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const submitAssignment = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const assignmentId = req.params.id;

        const check = await pool.query(
            'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
            [assignmentId, userId]
        );

        if (check.rows.length > 0) {
            await pool.query(
                `UPDATE assignment_submissions 
                 SET status = 'submitted', submission_date = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [check.rows[0].id]
            );
        } else {
            await pool.query(
                `INSERT INTO assignment_submissions (assignment_id, student_id, status, submission_date)
                 VALUES ($1, $2, 'submitted', CURRENT_TIMESTAMP)`,
                [assignmentId, userId]
            );
        }

        res.json({ message: 'Assignment submitted successfully!', status: 'submitted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentResults = async (req, res) => {
    try {
        const studentId = req.user.id || req.user._id;

        const studentRes = await pool.query(`
            SELECT u.id, u.name, u.email, u.roll_number, c.name as class_name, u.class_id
            FROM users u
            LEFT JOIN classes c ON u.class_id = c.id
            WHERE u.id = $1
        `, [studentId]);

        const student = studentRes.rows[0];

        const resultsRes = await pool.query(`
            SELECT er.id, er.marks_obtained, er.grade, er.remarks,
                   es.exam_name, es.term, es.max_marks, es.exam_date,
                   COALESCE(s.name, 'General Subject') as subject_name, s.code as subject_code
            FROM exam_results er
            LEFT JOIN exam_schedules es ON er.exam_schedule_id = es.id
            LEFT JOIN subjects s ON er.subject_id = s.id
            WHERE er.student_id = $1
            ORDER BY es.exam_date ASC, s.name ASC
        `, [studentId]);

        const schedulesRes = await pool.query(`
            SELECT es.id, es.exam_name, es.term, es.exam_date, es.time_slot, es.room_number, es.max_marks,
                   COALESCE(s.name, 'General Subject') as subject_name, s.code as subject_code
            FROM exam_schedules es
            LEFT JOIN subjects s ON es.subject_id = s.id
            WHERE es.class_id = $1
            ORDER BY es.exam_date ASC
        `, [student?.class_id]);

        res.json({
            student,
            results: resultsRes.rows,
            schedules: schedulesRes.rows
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get detailed info for a single subject (attendance, exams, upcoming, assignments)
 * @route   GET /api/student/subjects/:subjectId/details
 * @access  Private (Student)
 */
export const getSubjectDetails = async (req, res) => {
    try {
        const studentId = req.user.id || req.user._id;
        const { subjectId } = req.params;

        // 1. Subject info + teacher + schedule slots
        const subjectRes = await pool.query(`
            SELECT s.id, s.name as subject_name, s.code,
                   u.id as teacher_id, u.name as teacher_name, u.email as teacher_email,
                   sa.day_of_week, sa.time_slot, sa.start_time, sa.end_time, sa.room_number
            FROM subjects s
            LEFT JOIN subject_allocations sa ON sa.subject_id = s.id
            LEFT JOIN users u ON sa.teacher_id = u.id
            WHERE s.id = $1
            ORDER BY sa.day_of_week, sa.time_slot
        `, [subjectId]);

        if (subjectRes.rows.length === 0) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        const firstRow = subjectRes.rows[0];
        const slots = subjectRes.rows
            .filter(r => r.day_of_week)
            .map(r => ({ day: r.day_of_week, timeSlot: r.time_slot, startTime: r.start_time, endTime: r.end_time, room: r.room_number }));

        // 2. Attendance for this subject
        const attRes = await pool.query(`
            SELECT id, status, date, time_slot
            FROM attendance
            WHERE student_id = $1 AND subject_id = $2
            ORDER BY date DESC
            LIMIT 30
        `, [studentId, subjectId]);

        const attRows = attRes.rows;
        const present = attRows.filter(r => r.status === 'present').length;
        const absent = attRows.filter(r => r.status === 'absent').length;
        const leave = attRows.filter(r => r.status === 'leave').length;
        const total = attRows.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        // 3. Past exam results for this subject
        const resultsRes = await pool.query(`
            SELECT er.id, er.marks_obtained, er.grade, er.remarks,
                   es.exam_name, es.max_marks, es.exam_date, es.time_slot as exam_time
            FROM exam_results er
            LEFT JOIN exam_schedules es ON er.exam_schedule_id = es.id
            WHERE er.student_id = $1 AND er.subject_id = $2
            ORDER BY es.exam_date DESC
        `, [studentId, subjectId]);

        // 4. Upcoming exams for this subject
        const upcomingRes = await pool.query(`
            SELECT es.id, es.exam_name, es.exam_date, es.time_slot, es.room_number, es.max_marks
            FROM exam_schedules es
            WHERE es.subject_id = $1 AND es.exam_date >= CURRENT_DATE
            ORDER BY es.exam_date ASC
            LIMIT 10
        `, [subjectId]);

        // 5. Assignments for this subject
        const userRes = await pool.query('SELECT class_id FROM users WHERE id = $1', [studentId]);
        const classId = userRes.rows[0]?.class_id || 1;

        const assignRes = await pool.query(`
            SELECT a.id, a.title, a.description, a.due_date, a.attachment_url,
                   t.name as teacher_name,
                   CASE
                     WHEN sub.grade IS NOT NULL OR sub.status = 'graded' THEN 'graded'
                     WHEN sub.status = 'completed' OR sub.status = 'submitted' THEN 'submitted'
                     ELSE COALESCE(sub.status, 'pending')
                   END as status,
                   sub.submission_date, sub.grade, sub.teacher_comments
            FROM assignments a
            LEFT JOIN users t ON a.teacher_id = t.id
            LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_id = $1
            WHERE a.class_id = $2 AND a.subject_id = $3
            ORDER BY a.due_date ASC
        `, [studentId, classId, subjectId]);

        const formattedResults = resultsRes.rows.map(r => ({
            ...r,
            marksObtained: r.marks_obtained,
            maxMarks: r.max_marks,
            examName: r.exam_name,
            examTitle: r.exam_name,
            examDate: r.exam_date,
            timeSlot: r.exam_time,
            startTime: r.exam_time,
            percentage: r.max_marks > 0 ? Math.round((r.marks_obtained / r.max_marks) * 100) : 0
        }));

        const formattedUpcoming = upcomingRes.rows.map(r => ({
            ...r,
            examName: r.exam_name,
            examTitle: r.exam_name,
            examDate: r.exam_date,
            timeSlot: r.time_slot,
            startTime: r.time_slot?.split('-')[0]?.trim() || r.time_slot,
            endTime: r.time_slot?.split('-')[1]?.trim() || '',
            roomNumber: r.room_number,
            maxMarks: r.max_marks
        }));

        const formattedAssignments = assignRes.rows.map(r => ({
            ...r,
            dueDate: r.due_date,
            teacherName: r.teacher_name,
            submissionDate: r.submission_date,
            teacherComments: r.teacher_comments
        }));

        res.json({
            subject: {
                id: firstRow.id,
                name: firstRow.subject_name,
                code: firstRow.code,
                teacher: {
                    id: firstRow.teacher_id,
                    name: firstRow.teacher_name,
                    email: firstRow.teacher_email
                },
                slots
            },
            attendance: {
                present,
                absent,
                leave,
                total,
                percentage,
                recentHistory: attRows.map(r => ({
                    id: String(r.id),
                    status: r.status,
                    date: r.date,
                    timeSlot: r.time_slot
                }))
            },
            results: formattedResults,
            upcomingExams: formattedUpcoming,
            assignments: formattedAssignments
        });
    } catch (error) {
        console.error('Error in getSubjectDetails:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getStudentTimetable = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const userRes = await pool.query('SELECT class_id FROM users WHERE id = $1', [userId]);
        const classId = userRes.rows[0]?.class_id || 1;

        const result = await pool.query(`
            SELECT sa.id, sa.subject_id, sa.day_of_week, sa.time_slot, sa.start_time, sa.end_time, sa.room_number,
                   COALESCE(s.name, 'General Class') as subject_name, s.code as subject_code,
                   u.name as teacher_name
            FROM subject_allocations sa
            LEFT JOIN subjects s ON sa.subject_id = s.id
            LEFT JOIN users u ON sa.teacher_id = u.id
            WHERE sa.class_id = $1
            ORDER BY sa.id ASC
        `, [classId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error in getStudentTimetable:', error);
        res.status(500).json({ message: error.message });
    }
};


