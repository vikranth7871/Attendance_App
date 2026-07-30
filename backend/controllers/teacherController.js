import { pool } from '../config/db.js';

export const getMySubjects = async (req, res) => {
    try {
        const teacherId = req.user.id || req.user._id;
        const result = await pool.query(`
            SELECT sa.id as allocation_id,
                   sa.day_of_week, sa.time_slot, sa.start_time, sa.end_time, sa.room_number,
                   s.id as subject_id, s.name as subject_name, s.department_id,
                   c.id as class_id, c.name as class_name, c.academic_year
            FROM subject_allocations sa
            LEFT JOIN subjects s ON sa.subject_id = s.id
            LEFT JOIN classes c ON sa.class_id = c.id
            WHERE sa.teacher_id = $1
        `, [teacherId]);

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
            }
        }));

        res.json(subjects);
    } catch (error) {
        console.error('Error fetching teacher subjects:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getMyRoster = async (req, res) => {
    try {
        const teacherId = req.user.id || req.user._id;
        const today = new Date().toISOString().split('T')[0];

        // 1. Check if teacher is class coordinator for a class
        const teacherUserRes = await pool.query('SELECT class_coordinator_for FROM users WHERE id = $1', [teacherId]);
        const coordClassId = teacherUserRes.rows[0]?.class_coordinator_for;

        // 2. Fetch all subject allocations for teacher
        const allocRes = await pool.query(`
            SELECT sa.id as allocation_id,
                   sa.day_of_week, sa.time_slot, sa.start_time, sa.end_time, sa.room_number,
                   s.id as subject_id, s.name as subject_name,
                   c.id as class_id, c.name as class_name
            FROM subject_allocations sa
            LEFT JOIN subjects s ON sa.subject_id = s.id
            LEFT JOIN classes c ON sa.class_id = c.id
            WHERE sa.teacher_id = $1
            ORDER BY s.name ASC, c.name ASC
        `, [teacherId]);

        // Group allocations by unique key "subject_id:class_id"
        const groupedMap = new Map();

        allocRes.rows.forEach(r => {
            if (!r.subject_id || !r.class_id) return;
            const key = `${r.subject_id}:${r.class_id}`;
            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    subjectId: r.subject_id,
                    subjectName: r.subject_name,
                    classId: r.class_id,
                    className: r.class_name,
                    slots: []
                });
            }
            if (r.day_of_week) {
                groupedMap.get(key).slots.push({
                    dayOfWeek: r.day_of_week,
                    timeSlot: r.time_slot,
                    startTime: r.start_time,
                    endTime: r.end_time,
                    roomNumber: r.room_number
                });
            }
        });

        const roster = await Promise.all(Array.from(groupedMap.values()).map(async (group) => {
            const studentsRes = await pool.query(`
                SELECT u.id, u.name, u.email, u.roll_number,
                       COUNT(att.id) as total_sessions,
                       COUNT(CASE WHEN att.status = 'present' THEN 1 END) as present_sessions,
                       MAX(CASE WHEN att.date = $2 THEN att.status ELSE NULL END) as today_status
                FROM users u
                LEFT JOIN attendance att ON att.student_id = u.id AND att.subject_id = $1
                WHERE u.role = 'student' AND u.class_id = $3
                GROUP BY u.id, u.name, u.email, u.roll_number
                ORDER BY u.name ASC
            `, [group.subjectId, today, group.classId]);

            const students = studentsRes.rows.map(s => {
                const tot = parseInt(s.total_sessions, 10) || 0;
                const pres = parseInt(s.present_sessions, 10) || 0;
                const pct = tot > 0 ? Math.round((pres / tot) * 100) : 0;
                return {
                    _id: String(s.id),
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    rollNumber: s.roll_number,
                    attendancePercentage: pct,
                    totalSessions: tot,
                    presentSessions: pres,
                    attendanceStatus: s.today_status || null
                };
            });

            // Format schedule summary badge
            let scheduleBadge = 'Assigned';
            if (group.slots.length > 0) {
                const days = [...new Set(group.slots.map(s => s.dayOfWeek.substring(0, 3)))].join(', ');
                scheduleBadge = `${group.slots.length} Weekly Slots (${days})`;
            }

            return {
                type: 'subject',
                allocationId: `${group.subjectId}-${group.classId}`,
                subject: { _id: String(group.subjectId), id: group.subjectId, subjectName: group.subjectName, name: group.subjectName },
                class: { _id: String(group.classId), id: group.classId, className: group.className, name: group.className },
                slots: group.slots,
                scheduleBadge,
                students
            };
        }));

        let coordinatedRoster = null;
        if (coordClassId) {
            const classRes = await pool.query('SELECT id, name FROM classes WHERE id = $1', [coordClassId]);
            if (classRes.rows.length > 0) {
                const cls = classRes.rows[0];
                const coordStudentsRes = await pool.query(`
                    SELECT u.id, u.name, u.email, u.roll_number,
                           COUNT(att.id) as total_sessions,
                           COUNT(CASE WHEN att.status = 'present' THEN 1 END) as present_sessions
                    FROM users u
                    LEFT JOIN attendance att ON att.student_id = u.id
                    WHERE u.role = 'student' AND u.class_id = $1
                    GROUP BY u.id, u.name, u.email, u.roll_number
                    ORDER BY u.name ASC
                `, [coordClassId]);

                const coordStudents = coordStudentsRes.rows.map(s => {
                    const tot = parseInt(s.total_sessions, 10) || 0;
                    const pres = parseInt(s.present_sessions, 10) || 0;
                    const pct = tot > 0 ? Math.round((pres / tot) * 100) : 0;
                    return {
                        _id: String(s.id),
                        id: s.id,
                        name: s.name,
                        email: s.email,
                        rollNumber: s.roll_number,
                        attendancePercentage: pct,
                        totalSessions: tot,
                        presentSessions: pres
                    };
                });

                coordinatedRoster = {
                    class: { _id: String(cls.id), id: cls.id, className: cls.name, name: cls.name },
                    students: coordStudents
                };
            }
        }

        res.json({
            subjectRoster: roster,
            coordinatedRoster
        });
    } catch (error) {
        console.error('Error fetching teacher roster:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getStudentProfile = async (req, res) => {
    try {
        const { studentId } = req.params;
        const resUser = await pool.query(`
            SELECT u.*, d.name as department_name, c.name as class_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN classes c ON u.class_id = c.id
            WHERE u.id = $1
        `, [studentId]);

        if (resUser.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
        const studentRow = resUser.rows[0];

        const student = {
            _id: String(studentRow.id),
            id: studentRow.id,
            name: studentRow.name,
            email: studentRow.email,
            role: studentRow.role,
            rollNumber: studentRow.roll_number,
            streakCount: studentRow.streak_count || 0,
            bestStreak: studentRow.best_streak || 0,
            departmentId: { _id: String(studentRow.department_id), departmentName: studentRow.department_name },
            classId: { _id: String(studentRow.class_id), className: studentRow.class_name }
        };

        const attRes = await pool.query('SELECT * FROM attendance WHERE student_id = $1', [studentId]);
        const totalClasses = attRes.rows.length;
        const presentCount = attRes.rows.filter(a => a.status === 'present').length;
        const attendancePercentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : 0;

        res.json({
            student,
            stats: { totalClasses, presentCount, attendancePercentage, subjectWise: [] }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAttendanceReport = async (req, res) => {
    try {
        const teacherId = req.user.id || req.user._id;
        const result = await pool.query(`
            SELECT a.*, u.name as student_name, u.roll_number, s.name as subject_name, c.name as class_name
            FROM attendance a
            LEFT JOIN users u ON a.student_id = u.id
            LEFT JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN classes c ON a.class_id = c.id
            WHERE a.marked_by = $1
            ORDER BY a.date DESC
        `, [teacherId]);

        const report = result.rows.map(r => ({
            studentName: r.student_name || 'Student',
            rollNumber: r.roll_number || '-',
            subjectName: r.subject_name || 'Subject',
            className: r.class_name || 'Class',
            status: r.status,
            date: r.date
        }));

        res.json({ report, classes: [], subjects: [] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
