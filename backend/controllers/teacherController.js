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

export const getTeacherAssignments = async (req, res) => {
    try {
        const teacherId = req.user.id || req.user._id;
        const result = await pool.query(`
            SELECT a.id, a.title, a.description, a.due_date, a.attachment_url, a.created_at,
                   c.name as class_name, s.name as subject_name,
                   COUNT(sub.id) as submission_count
            FROM assignments a
            LEFT JOIN classes c ON a.class_id = c.id
            LEFT JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
            WHERE a.teacher_id = $1
            GROUP BY a.id, c.name, s.name
            ORDER BY a.id DESC
        `, [teacherId]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createTeacherAssignment = async (req, res) => {
    try {
        const teacherId = req.user.id || req.user._id;
        const { classId, subjectId, title, description, dueDate, attachmentUrl } = req.body;

        if (!title || !dueDate) {
            return res.status(400).json({ message: 'Title and Due Date are required' });
        }

        const newAssign = await pool.query(`
            INSERT INTO assignments (class_id, subject_id, teacher_id, title, description, due_date, attachment_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [classId || 1, subjectId || 1, teacherId, title, description || '', dueDate, attachmentUrl || null]);

        const assignment = newAssign.rows[0];

        // Notify all students in this class + their parents
        const studentsRes = await pool.query('SELECT id, parent_id FROM users WHERE class_id = $1 AND role = \'student\'', [classId || 1]);
        for (const st of studentsRes.rows) {
            // Notification for Student
            await pool.query(`
                INSERT INTO notifications (recipient_id, title, message, type, link)
                VALUES ($1, $2, $3, 'info', '/student/assignments')
            `, [st.id, '📚 New Homework Assigned', `Homework "${title}" due on ${new Date(dueDate).toLocaleDateString()}`]);

            // Notification for Parent if linked
            if (st.parent_id) {
                await pool.query(`
                    INSERT INTO notifications (recipient_id, title, message, type, link)
                    VALUES ($1, $2, $3, 'info', '/parent/assignments')
                `, [st.parent_id, '📚 New Homework Assigned', `Homework "${title}" assigned to your child due on ${new Date(dueDate).toLocaleDateString()}`]);
            }
        }

        res.status(201).json(assignment);
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherExams = async (req, res) => {
    try {
        const schedulesRes = await pool.query(`
            SELECT es.id, es.exam_name as "examName", es.exam_date as "examDate", es.time_slot as "timeSlot",
                   es.room_number as "roomNumber", es.max_marks as "maxMarks", es.class_id as "classId", es.subject_id as "subjectId",
                   s.name as "subjectName", c.name as "className"
            FROM exam_schedules es
            LEFT JOIN subjects s ON es.subject_id = s.id
            LEFT JOIN classes c ON es.class_id = c.id
            ORDER BY es.exam_date DESC
        `);

        const rosterRes = await pool.query(`
            SELECT id, name, roll_number as "rollNumber" FROM users WHERE role = 'student' ORDER BY roll_number ASC
        `);

        const resultsRes = await pool.query(`
            SELECT er.id, er.exam_schedule_id, er.student_id, er.marks_obtained, er.grade, er.remarks
            FROM exam_results er
        `);

        res.json({
            schedules: schedulesRes.rows,
            students: rosterRes.rows,
            results: resultsRes.rows
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createTeacherExam = async (req, res) => {
    try {
        const { examName, classId, subjectId, examDate, timeSlot, roomNumber, maxMarks } = req.body;

        if (!examName || !examDate) {
            return res.status(400).json({ message: 'Exam name and date are required' });
        }

        const result = await pool.query(`
            INSERT INTO exam_schedules (exam_name, class_id, subject_id, exam_date, time_slot, room_number, max_marks)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [examName, classId || 1, subjectId || 1, examDate, timeSlot || '10:00 AM - 12:00 PM', roomNumber || 'Lab 301', maxMarks || 100]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const submitTeacherExamMarks = async (req, res) => {
    try {
        const { examScheduleId, studentId, subjectId, marksObtained, grade, remarks } = req.body;

        if (!studentId || marksObtained === undefined || marksObtained === '') {
            return res.status(400).json({ message: 'Student and Marks Obtained are required' });
        }

        const validExamScheduleId = parseInt(examScheduleId, 10) || 1;
        const validStudentId = parseInt(studentId, 10);
        const validSubjectId = parseInt(subjectId, 10) || 1;

        let calcGrade = grade;
        if (!calcGrade) {
            const m = parseFloat(marksObtained);
            if (m >= 90) calcGrade = 'A+';
            else if (m >= 80) calcGrade = 'A';
            else if (m >= 70) calcGrade = 'B';
            else if (m >= 60) calcGrade = 'C';
            else if (m >= 50) calcGrade = 'D';
            else calcGrade = 'F';
        }

        // Check if result already exists for this student & exam schedule
        const existing = await pool.query(
            'SELECT id FROM exam_results WHERE student_id = $1 AND exam_schedule_id = $2',
            [validStudentId, validExamScheduleId]
        );

        if (existing.rows.length > 0) {
            await pool.query(`
                UPDATE exam_results
                SET marks_obtained = $1, grade = $2, remarks = $3, subject_id = $4
                WHERE id = $5
            `, [marksObtained, calcGrade, remarks || '', validSubjectId, existing.rows[0].id]);
        } else {
            await pool.query(`
                INSERT INTO exam_results (exam_schedule_id, student_id, subject_id, marks_obtained, grade, remarks)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [validExamScheduleId, validStudentId, validSubjectId, marksObtained, calcGrade, remarks || '']);
        }

        // Real-time notifications for student & parent
        try {
            const stRes = await pool.query('SELECT name, parent_id FROM users WHERE id = $1', [validStudentId]);
            const studentObj = stRes.rows[0];

            await pool.query(`
                INSERT INTO notifications (recipient_id, title, message, type, link)
                VALUES ($1, $2, $3, 'info', '/student/results')
            `, [validStudentId, '🏆 Exam Result Published', `Your exam score of ${marksObtained}/100 [Grade: ${calcGrade}] has been published.`]);

            if (studentObj?.parent_id) {
                await pool.query(`
                    INSERT INTO notifications (recipient_id, title, message, type, link)
                    VALUES ($1, $2, $3, 'info', '/parent/results')
                `, [studentObj.parent_id, '🏆 Exam Result Published', `${studentObj.name}'s exam score of ${marksObtained}/100 [Grade: ${calcGrade}] has been updated.`]);
            }
        } catch (notifErr) {
            console.error('Non-blocking notification error:', notifErr.message);
        }

        res.json({ message: 'Exam marks published successfully!', grade: calcGrade });
    } catch (error) {
        console.error('Error submitting exam marks:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherParentMessages = async (req, res) => {
    try {
        const teacherId = req.user.id || req.user._id;

        const msgsRes = await pool.query(`
            SELECT m.*, 
                   u_sender.name as sender_name, u_sender.role as sender_role,
                   u_receiver.name as receiver_name, u_receiver.role as receiver_role,
                   st.name as student_name
            FROM parent_messages m
            JOIN users u_sender ON m.sender_id = u_sender.id
            JOIN users u_receiver ON m.receiver_id = u_receiver.id
            LEFT JOIN users st ON m.student_id = st.id
            WHERE m.sender_id = $1 OR m.receiver_id = $1
            ORDER BY m.created_at ASC
        `, [teacherId]);

        res.json(msgsRes.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const replyParentMessage = async (req, res) => {
    try {
        const teacherId = req.user.id || req.user._id;
        const teacherRes = await pool.query('SELECT name FROM users WHERE id = $1', [teacherId]);
        const teacherName = teacherRes.rows[0]?.name || 'Teacher';

        const { receiverId, studentId, subject, message } = req.body;

        if (!receiverId || !message) {
            return res.status(400).json({ message: 'Receiver ID and Message content are required' });
        }

        const newMsg = await pool.query(`
            INSERT INTO parent_messages (sender_id, receiver_id, student_id, subject, message)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [teacherId, parseInt(receiverId, 10), studentId || null, subject || 'Reply from Teacher', message]);

        await pool.query(`
            INSERT INTO notifications (recipient_id, title, message, type, link)
            VALUES ($1, $2, $3, 'info', '/parent/messages')
        `, [parseInt(receiverId, 10), '💬 Reply from Teacher', `${teacherName}: "${message.substring(0, 45)}..."`]);

        res.status(201).json(newMsg.rows[0]);
    } catch (error) {
        console.error('Error sending teacher reply:', error);
        res.status(500).json({ message: error.message });
    }
};
