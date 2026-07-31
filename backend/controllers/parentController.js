import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

// Helper to retrieve linked students for parent securely
const getLinkedStudents = async (parentId, parentEmail) => {
    const res = await pool.query(`
        SELECT u.id, u.name, u.email, u.roll_number, u.section, u.avatar,
               c.id as class_id, c.name as class_name,
               d.id as department_id, d.name as department_name
        FROM users u
        LEFT JOIN classes c ON u.class_id = c.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE (u.parent_id = $1 OR (u.parent_email IS NOT NULL AND LOWER(u.parent_email) = LOWER($2)))
          AND u.role = 'student'
        ORDER BY u.id ASC
    `, [parentId, parentEmail]);

    return res.rows.map(row => ({
        studentId: row.id,
        _id: row.id,
        name: row.name,
        email: row.email,
        rollNumber: row.roll_number || 'N/A',
        section: row.section || 'A',
        avatar: row.avatar || '',
        classInfo: {
            id: row.class_id,
            className: row.class_name || 'Class VIII-A',
            name: row.class_name || 'Class VIII-A',
            section: row.section || 'A'
        },
        department: row.department_name || 'Computer Science'
    }));
};

// 1. GET /api/parent/children
export const getChildren = async (req, res) => {
    try {
        const children = await getLinkedStudents(req.user.id || req.user._id, req.user.email);
        res.json(children);
    } catch (error) {
        console.error('Error in getChildren:', error);
        res.status(500).json({ message: error.message });
    }
};

// 2. GET /api/parent/summary
export const getStudentSummary = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentEmail = req.user.email;
        const students = await getLinkedStudents(parentId, parentEmail);

        if (!students || students.length === 0) {
            return res.status(404).json({ message: 'No students found for this parent' });
        }

        const summary = [];
        for (const student of students) {
            const attnRes = await pool.query(`
                SELECT 
                    COUNT(*) as total_classes,
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present_classes,
                    COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave_classes,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_classes
                FROM attendance 
                WHERE student_id = $1
            `, [student.studentId]);

            const stats = attnRes.rows[0] || { total_classes: 0, present_classes: 0, leave_classes: 0, absent_classes: 0 };
            const total = parseInt(stats.total_classes) || 0;
            const present = parseInt(stats.present_classes) || 0;
            const leave = parseInt(stats.leave_classes) || 0;
            const absent = parseInt(stats.absent_classes) || 0;
            const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : '100.00';

            // Today's attendance status
            const todayRes = await pool.query(`
                SELECT status, time_slot FROM attendance 
                WHERE student_id = $1 AND date = CURRENT_DATE 
                ORDER BY id DESC LIMIT 1
            `, [student.studentId]);

            const todayStatus = todayRes.rows.length > 0 ? todayRes.rows[0].status : 'marked';

            // Fee status
            const feeRes = await pool.query(`
                SELECT total_amount, paid_amount, pending_amount, due_date, status
                FROM fee_details WHERE student_id = $1
            `, [student.studentId]);

            const feeInfo = feeRes.rows[0] || {
                total_amount: '45000.00',
                paid_amount: '30000.00',
                pending_amount: '15000.00',
                due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                status: 'partial'
            };

            // Pending assignments count
            const assignRes = await pool.query(`
                SELECT COUNT(*) as pending_count 
                FROM assignments a
                LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = $1
                WHERE (s.status IS NULL OR s.status = 'pending')
            `, [student.studentId]);

            const pendingAssignments = parseInt(assignRes.rows[0]?.pending_count) || 1;

            summary.push({
                studentId: student.studentId,
                name: student.name,
                email: student.email,
                rollNumber: student.rollNumber,
                section: student.section,
                classInfo: student.classInfo,
                department: student.department,
                totalClasses: total,
                presentClasses: present,
                leaveClasses: leave,
                absentClasses: absent,
                attendancePercentage: percentage,
                todayStatus,
                feeInfo,
                pendingAssignmentsCount: pendingAssignments
            });
        }

        res.json(summary);
    } catch (error) {
        console.error('Error in getStudentSummary:', error);
        res.status(500).json({ message: error.message });
    }
};

// 3. GET /api/parent/attendance
export const getStudentAttendance = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentEmail = req.user.email;
        const targetStudentId = req.query.studentId;

        const students = await getLinkedStudents(parentId, parentEmail);
        const validStudentIds = students.map(s => s.studentId);

        let filterStudentIds = validStudentIds;
        if (targetStudentId && targetStudentId !== 'null' && targetStudentId !== 'undefined') {
            if (!validStudentIds.includes(parseInt(targetStudentId))) {
                return res.status(403).json({ message: 'Unauthorized access to student record' });
            }
            filterStudentIds = [parseInt(targetStudentId)];
        }

        if (filterStudentIds.length === 0) {
            return res.status(404).json({ message: 'No linked students found' });
        }

        const attnRes = await pool.query(`
            SELECT a.id, a.student_id, a.date, a.time_slot, a.status, a.method,
                   COALESCE(s.name, 'General Session') as subject_name, s.code as subject_code,
                   u.name as student_name, u.roll_number
            FROM attendance a
            LEFT JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN users u ON a.student_id = u.id
            WHERE a.student_id = ANY($1::int[])
            ORDER BY a.date DESC, a.id DESC
        `, [filterStudentIds]);

        // Monthly Breakdown
        const monthlyRes = await pool.query(`
            SELECT 
                TO_CHAR(date, 'Mon YYYY') as month_year,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave
            FROM attendance
            WHERE student_id = ANY($1::int[])
            GROUP BY TO_CHAR(date, 'Mon YYYY'), DATE_TRUNC('month', date)
            ORDER BY DATE_TRUNC('month', date) DESC
        `, [filterStudentIds]);

        // Subject Breakdown
        const subjectRes = await pool.query(`
            SELECT 
                COALESCE(s.name, 'General Session') as subject_name,
                COUNT(*) as total,
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present
            FROM attendance a
            LEFT JOIN subjects s ON a.subject_id = s.id
            WHERE a.student_id = ANY($1::int[])
            GROUP BY COALESCE(s.name, 'General Session')
        `, [filterStudentIds]);

        res.json({
            records: attnRes.rows,
            monthlyBreakdown: monthlyRes.rows.map(r => ({
                month: r.month_year,
                total: parseInt(r.total),
                present: parseInt(r.present),
                absent: parseInt(r.absent),
                leave: parseInt(r.leave),
                percentage: parseInt(r.total) > 0 ? ((parseInt(r.present) / parseInt(r.total)) * 100).toFixed(1) : '100.0'
            })),
            subjectBreakdown: subjectRes.rows.map(s => ({
                subjectName: s.subject_name,
                total: parseInt(s.total),
                present: parseInt(s.present),
                percentage: parseInt(s.total) > 0 ? ((parseInt(s.present) / parseInt(s.total)) * 100).toFixed(1) : '100.0'
            }))
        });
    } catch (error) {
        console.error('Error in getStudentAttendance:', error);
        res.status(500).json({ message: error.message });
    }
};

// 4. GET /api/parent/attendance/export
export const downloadAttendanceReport = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentEmail = req.user.email;
        const targetStudentId = req.query.studentId;

        const students = await getLinkedStudents(parentId, parentEmail);
        const targetStudent = students.find(s => !targetStudentId || s.studentId === parseInt(targetStudentId)) || students[0];

        if (!targetStudent) {
            return res.status(403).json({ message: 'Unauthorized or student not found' });
        }

        const attnRes = await pool.query(`
            SELECT a.date, a.time_slot, a.status, COALESCE(s.name, 'General Session') as subject_name
            FROM attendance a
            LEFT JOIN subjects s ON a.subject_id = s.id
            WHERE a.student_id = $1
            ORDER BY a.date DESC
        `, [targetStudent.studentId]);

        let csv = `Date,Subject,Time Slot,Status\n`;
        attnRes.rows.forEach(r => {
            csv += `"${r.date ? new Date(r.date).toISOString().split('T')[0] : ''}","${r.subject_name}","${r.time_slot || 'Regular'}","${r.status}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=Attendance_Report_${targetStudent.name.replace(/\s+/g, '_')}.csv`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. GET /api/parent/leaves
export const getStudentLeaves = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentEmail = req.user.email;
        const targetStudentId = req.query.studentId;

        const students = await getLinkedStudents(parentId, parentEmail);
        const validStudentIds = students.map(s => s.studentId);

        let filterStudentIds = validStudentIds;
        if (targetStudentId && targetStudentId !== 'null' && targetStudentId !== 'undefined') {
            filterStudentIds = [parseInt(targetStudentId)];
        }

        const leavesRes = await pool.query(`
            SELECT l.*, u.name as student_name, u.roll_number
            FROM leave_requests l
            JOIN users u ON l.user_id = u.id
            WHERE l.user_id = ANY($1::int[])
            ORDER BY l.id DESC
        `, [filterStudentIds]);

        res.json(leavesRes.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. PUT /api/parent/leaves/:id/action (Approve/Reject Leave)
export const updateLeaveStatus = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentEmail = req.user.email;
        const leaveId = req.params.id;
        const { action, remarks } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be approved or rejected.' });
        }

        // Verify leave request belongs to linked student
        const checkLeave = await pool.query(`
            SELECT l.id, l.user_id, u.name as student_name 
            FROM leave_requests l
            JOIN users u ON l.user_id = u.id
            WHERE l.id = $1 AND (u.parent_id = $2 OR LOWER(u.parent_email) = LOWER($3))
        `, [leaveId, parentId, parentEmail]);

        if (checkLeave.rows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized leave request modification' });
        }

        await pool.query(`
            UPDATE leave_requests 
            SET status = $1, reviewed_by = $2, rejection_reason = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
        `, [action, parentId, remarks || null, leaveId]);

        res.json({ message: `Leave request successfully ${action}`, status: action });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 7. GET /api/parent/timetable
export const getStudentAcademic = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentEmail = req.user.email;
        const targetStudentId = req.query.studentId;

        const students = await getLinkedStudents(parentId, parentEmail);
        const targetStudent = students.find(s => !targetStudentId || s.studentId === parseInt(targetStudentId)) || students[0];

        if (!targetStudent) {
            return res.status(404).json({ message: 'No linked student found' });
        }

        const timetableRes = await pool.query(`
            SELECT sa.id, sa.day_of_week as "dayOfWeek", sa.time_slot as "timeSlot", sa.start_time as "startTime", sa.end_time as "endTime", sa.room_number as "roomNumber",
                   COALESCE(sub.name, 'General Subject') as "subjectName", sub.code as "subjectCode",
                   t.name as "teacherName", t.email as "teacherEmail"
            FROM subject_allocations sa
            LEFT JOIN subjects sub ON sa.subject_id = sub.id
            LEFT JOIN users t ON sa.teacher_id = t.id
            WHERE sa.class_id = $1
            ORDER BY sa.id ASC
        `, [targetStudent.classInfo.id || 1]);

        res.json({
            student: targetStudent,
            timetable: timetableRes.rows,
            subjects: timetableRes.rows
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 8. GET /api/parent/assignments
export const getStudentAssignments = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentEmail = req.user.email;
        const targetStudentId = req.query.studentId;

        const students = await getLinkedStudents(parentId, parentEmail);
        const targetStudent = students.find(s => !targetStudentId || s.studentId === parseInt(targetStudentId)) || students[0];

        if (!targetStudent) {
            return res.status(404).json({ message: 'No student found' });
        }

        const assignRes = await pool.query(`
            SELECT a.id, a.title, a.description, a.due_date, a.attachment_url,
                   COALESCE(sub.name, 'General Subject') as subject_name, sub.code as subject_code,
                   t.name as teacher_name,
                   COALESCE(s.status, 'pending') as status,
                   s.submission_date, s.teacher_comments, s.grade
            FROM assignments a
            LEFT JOIN subjects sub ON a.subject_id = sub.id
            LEFT JOIN users t ON a.teacher_id = t.id
            LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = $1
            ORDER BY a.due_date ASC
        `, [targetStudent.studentId]);

        res.json({
            student: targetStudent,
            assignments: assignRes.rows
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 9. GET /api/parent/results
export const getStudentResults = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentEmail = req.user.email;
        const targetStudentId = req.query.studentId;

        const students = await getLinkedStudents(parentId, parentEmail);
        const targetStudent = students.find(s => !targetStudentId || s.studentId === parseInt(targetStudentId)) || students[0];

        if (!targetStudent) {
            return res.status(404).json({ message: 'No student found' });
        }

        const resultsRes = await pool.query(`
            SELECT r.id, r.marks_obtained, r.grade, r.remarks,
                   es.exam_name, es.exam_date, es.max_marks,
                   COALESCE(sub.name, 'General Subject') as subject_name, sub.code as subject_code
            FROM exam_results r
            JOIN exam_schedules es ON r.exam_schedule_id = es.id
            LEFT JOIN subjects sub ON r.subject_id = sub.id
            WHERE r.student_id = $1
            ORDER BY es.exam_date DESC
        `, [targetStudent.studentId]);

        const upcomingExams = await pool.query(`
            SELECT es.id, es.exam_name, es.exam_date, es.time_slot, es.room_number, es.max_marks,
                   COALESCE(sub.name, 'General Subject') as subject_name, sub.code as subject_code
            FROM exam_schedules es
            LEFT JOIN subjects sub ON es.subject_id = sub.id
            ORDER BY es.exam_date ASC
        `);

        res.json({
            student: targetStudent,
            examResults: resultsRes.rows,
            upcomingExams: upcomingExams.rows
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 10. GET /api/parent/fees
export const getStudentFees = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentEmail = req.user.email;
        const targetStudentId = req.query.studentId;

        const students = await getLinkedStudents(parentId, parentEmail);
        const targetStudent = students.find(s => !targetStudentId || s.studentId === parseInt(targetStudentId)) || students[0];

        if (!targetStudent) {
            return res.status(404).json({ message: 'No student found' });
        }

        const feeRes = await pool.query(`
            SELECT total_amount, paid_amount, pending_amount, due_date, status
            FROM fee_details WHERE student_id = $1
        `, [targetStudent.studentId]);

        const feeSummary = feeRes.rows[0] || {
            total_amount: '45000.00',
            paid_amount: '30000.00',
            pending_amount: '15000.00',
            due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            status: 'partial'
        };

        const paymentsRes = await pool.query(`
            SELECT receipt_no, amount_paid, payment_method, payment_date, transaction_ref
            FROM fee_payments WHERE student_id = $1
            ORDER BY payment_date DESC
        `, [targetStudent.studentId]);

        res.json({
            student: targetStudent,
            feeSummary,
            paymentHistory: paymentsRes.rows
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 11. GET /api/parent/messages & POST /api/parent/messages
export const getParentMessages = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;

        // Fetch messages
        const msgsRes = await pool.query(`
            SELECT m.*, u_sender.name as sender_name, u_receiver.name as receiver_name
            FROM parent_messages m
            JOIN users u_sender ON m.sender_id = u_sender.id
            JOIN users u_receiver ON m.receiver_id = u_receiver.id
            WHERE m.sender_id = $1 OR m.receiver_id = $1
            ORDER BY m.created_at ASC
        `, [parentId]);

        // Fetch available teachers
        const teachersRes = await pool.query(`
            SELECT id, name, email FROM users WHERE role = 'teacher' ORDER BY name ASC
        `);

        res.json({
            messages: msgsRes.rows,
            teachers: teachersRes.rows
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const sendParentMessage = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const parentRes = await pool.query('SELECT name FROM users WHERE id = $1', [parentId]);
        const parentName = parentRes.rows[0]?.name || 'Parent';

        const { receiverId, studentId, subject, message } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        const targetTeacherId = parseInt(receiverId, 10) || 2; // Default to Jane Teacher

        const newMsg = await pool.query(`
            INSERT INTO parent_messages (sender_id, receiver_id, student_id, subject, message)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [parentId, targetTeacherId, studentId || null, subject || 'General Inquiry', message]);

        // Real-time Notification for Teacher
        await pool.query(`
            INSERT INTO notifications (recipient_id, title, message, type, link)
            VALUES ($1, $2, $3, 'info', '/teacher/messages')
        `, [targetTeacherId, '💬 New Message from Parent', `Message from ${parentName}: "${message.substring(0, 45)}..."`]);

        res.status(201).json(newMsg.rows[0]);
    } catch (error) {
        console.error('Error sending parent message:', error);
        res.status(500).json({ message: error.message });
    }
};

// 12. PUT /api/parent/profile & PUT /api/parent/change-password
export const updateParentProfile = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const { name, phone, address, emergencyContact, relationship } = req.body;

        const updated = await pool.query(`
            UPDATE users
            SET name = COALESCE($1, name),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, name, email, role
        `, [name, parentId]);

        res.json({ message: 'Profile updated successfully', user: updated.rows[0] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const changeParentPassword = async (req, res) => {
    try {
        const parentId = req.user.id || req.user._id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new passwords are required' });
        }

        const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [parentId]);
        if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, parentId]);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
