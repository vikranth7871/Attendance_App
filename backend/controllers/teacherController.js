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

export const updateStudentByCoordinator = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { name, rollNumber, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and Email are required.' });
        }

        // Check if email belongs to another user
        const existing = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
            [email.trim(), studentId]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Email address is already in use by another user.' });
        }

        const updated = await pool.query(`
            UPDATE users
            SET name = $1,
                roll_number = $2,
                email = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND role = 'student'
            RETURNING id, name, email, roll_number as "rollNumber"
        `, [name.trim(), rollNumber ? rollNumber.trim() : null, email.trim().toLowerCase(), studentId]);

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        res.json({ message: 'Student details updated successfully!', student: updated.rows[0] });
    } catch (error) {
        console.error('Error updating student profile:', error);
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

        res.json({ message: 'Exam marks published successfully!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const submitBulkTeacherExamMarks = async (req, res) => {
    try {
        const { examScheduleId, subjectId, marksData } = req.body;

        if (!Array.isArray(marksData) || marksData.length === 0) {
            return res.status(400).json({ message: 'No student marks data provided' });
        }

        const validExamScheduleId = parseInt(examScheduleId, 10) || 1;
        const validSubjectId = parseInt(subjectId, 10) || 1;

        let successCount = 0;

        for (const item of marksData) {
            const { studentId, marksObtained, grade, remarks } = item;
            if (studentId === undefined || marksObtained === undefined || marksObtained === '') continue;

            const validStudentId = parseInt(studentId, 10);
            const m = parseFloat(marksObtained);

            let calcGrade = grade;
            if (!calcGrade) {
                if (m >= 90) calcGrade = 'A+';
                else if (m >= 80) calcGrade = 'A';
                else if (m >= 70) calcGrade = 'B';
                else if (m >= 60) calcGrade = 'C';
                else if (m >= 50) calcGrade = 'D';
                else calcGrade = 'F';
            }

            const existing = await pool.query(
                'SELECT id FROM exam_results WHERE student_id = $1 AND exam_schedule_id = $2',
                [validStudentId, validExamScheduleId]
            );

            if (existing.rows.length > 0) {
                await pool.query(`
                    UPDATE exam_results
                    SET marks_obtained = $1, grade = $2, remarks = $3, subject_id = $4
                    WHERE id = $5
                `, [m, calcGrade, remarks || '', validSubjectId, existing.rows[0].id]);
            } else {
                await pool.query(`
                    INSERT INTO exam_results (exam_schedule_id, student_id, subject_id, marks_obtained, grade, remarks)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [validExamScheduleId, validStudentId, validSubjectId, m, calcGrade, remarks || '']);
            }

            // Real-time notifications for student & parent
            try {
                const stRes = await pool.query('SELECT name, parent_id FROM users WHERE id = $1', [validStudentId]);
                const studentObj = stRes.rows[0];

                await pool.query(`
                    INSERT INTO notifications (recipient_id, title, message, type, link)
                    VALUES ($1, $2, $3, 'info', '/student/results')
                `, [validStudentId, '🏆 Exam Result Published', `Your exam score of ${m}/100 [Grade: ${calcGrade}] has been published.`]);

                if (studentObj?.parent_id) {
                    await pool.query(`
                        INSERT INTO notifications (recipient_id, title, message, type, link)
                        VALUES ($1, $2, $3, 'info', '/parent/results')
                    `, [studentObj.parent_id, '🏆 Exam Result Published', `${studentObj.name}'s exam score of ${m}/100 [Grade: ${calcGrade}] has been updated.`]);
                }
            } catch (notifErr) {
                console.error('Non-blocking notification error:', notifErr.message);
            }

            successCount++;
        }

        res.json({ message: `Successfully published marks for ${successCount} students!` });
    } catch (error) {
        console.error('Error submitting bulk exam marks:', error);
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

export const updateTeacherAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, dueDate, attachmentUrl, classId, subjectId } = req.body;

        if (!title || !dueDate) {
            return res.status(400).json({ message: 'Title and Due Date are required' });
        }

        const updated = await pool.query(`
            UPDATE assignments
            SET title = $1,
                description = $2,
                due_date = $3,
                attachment_url = $4,
                class_id = COALESCE($5, class_id),
                subject_id = COALESCE($6, subject_id)
            WHERE id = $7
            RETURNING *
        `, [title, description || '', dueDate, attachmentUrl || null, classId || null, subjectId || null, id]);

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        res.json({ message: 'Assignment updated successfully', assignment: updated.rows[0] });
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getAssignmentSubmissions = async (req, res) => {
    try {
        const { id } = req.params;

        const assignRes = await pool.query('SELECT * FROM assignments WHERE id = $1', [id]);
        if (assignRes.rows.length === 0) return res.status(404).json({ message: 'Assignment not found' });
        const assignment = assignRes.rows[0];

        const result = await pool.query(`
            SELECT u.id as student_id, u.name as student_name, u.roll_number, u.email,
                   sub.id as submission_id, COALESCE(sub.status, 'pending') as status,
                   sub.submission_date, sub.teacher_comments, sub.grade
            FROM users u
            LEFT JOIN assignment_submissions sub ON sub.assignment_id = $1 AND sub.student_id = u.id
            WHERE u.class_id = $2 AND u.role = 'student'
            ORDER BY u.name ASC
        `, [id, assignment.class_id]);

        res.json({
            assignment,
            submissions: result.rows
        });
    } catch (error) {
        console.error('Error fetching assignment submissions:', error);
        res.status(500).json({ message: error.message });
    }
};

export const gradeAssignmentSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId, grade, teacherComments } = req.body;

        const checkSub = await pool.query('SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2', [id, studentId]);

        if (checkSub.rows.length > 0) {
            await pool.query(`
                UPDATE assignment_submissions
                SET status = 'graded',
                    grade = $1,
                    teacher_comments = $2
                WHERE assignment_id = $3 AND student_id = $4
            `, [grade, teacherComments, id, studentId]);
        } else {
            await pool.query(`
                INSERT INTO assignment_submissions (assignment_id, student_id, status, submission_date, grade, teacher_comments)
                VALUES ($1, $2, 'graded', CURRENT_TIMESTAMP, $3, $4)
            `, [id, studentId, grade, teacherComments]);
        }

        try {
            await pool.query(`
                INSERT INTO notifications (recipient_id, title, message, type, link)
                VALUES ($1, '📝 Homework Graded', $2, 'success', '/student/assignments')
            `, [studentId, `Your homework submission has been evaluated: ${grade || 'Graded'}`]);
        } catch (e) {
            console.error('Notification insertion error:', e);
        }

        res.json({ message: 'Submission graded successfully!' });
    } catch (error) {
        console.error('Error grading submission:', error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteTeacherAssignment = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM assignment_submissions WHERE assignment_id = $1', [id]);
        const deleted = await pool.query('DELETE FROM assignments WHERE id = $1 RETURNING *', [id]);

        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        res.json({ message: 'Homework assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherExams = async (req, res) => {
    try {
        const schedulesRes = await pool.query(`
            SELECT es.id, COALESCE(es.term, es.exam_name) as term, es.exam_name as "examName", es.exam_date as "examDate", es.time_slot as "timeSlot",
                   es.room_number as "roomNumber", es.max_marks as "maxMarks", es.class_id as "classId", es.subject_id as "subjectId",
                   s.name as "subjectName", c.name as "className"
            FROM exam_schedules es
            LEFT JOIN subjects s ON es.subject_id = s.id
            LEFT JOIN classes c ON es.class_id = c.id
            ORDER BY es.exam_date ASC, es.time_slot ASC
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
        const { term, examName, classId, subjectId, examDate, timeSlot, roomNumber, maxMarks } = req.body;

        const nameToUse = examName || term;
        if (!nameToUse || !examDate) {
            return res.status(400).json({ message: 'Exam name/term and date are required' });
        }

        const result = await pool.query(`
            INSERT INTO exam_schedules (term, exam_name, class_id, subject_id, exam_date, time_slot, room_number, max_marks)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [nameToUse, nameToUse, classId || 1, subjectId || 1, examDate, timeSlot || '10:00 AM - 12:00 PM', roomNumber || 'Lab 301', maxMarks || 100]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTeacherExam = async (req, res) => {
    try {
        const { id } = req.params;
        const { term, examName, subjectId, examDate, timeSlot, roomNumber, maxMarks } = req.body;

        const nameToUse = examName || term;
        if (!nameToUse || !examDate) {
            return res.status(400).json({ message: 'Exam name/term and date are required' });
        }

        const result = await pool.query(`
            UPDATE exam_schedules
            SET term = $1,
                exam_name = $2,
                subject_id = $3,
                exam_date = $4,
                time_slot = $5,
                room_number = $6,
                max_marks = $7
            WHERE id = $8
            RETURNING *
        `, [nameToUse, nameToUse, subjectId || 1, examDate, timeSlot || '10:00 AM - 12:00 PM', roomNumber || 'Lab 301', maxMarks || 100, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Exam schedule not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTeacherExam = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM exam_results WHERE exam_schedule_id = $1', [id]);
        const result = await pool.query('DELETE FROM exam_schedules WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Exam schedule not found' });
        }

        res.json({ message: 'Exam schedule deleted successfully' });
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
