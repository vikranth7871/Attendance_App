import { pool } from '../config/db.js';

/**
 * @desc    Mark manual attendance for a student
 * @route   POST /api/attendance/manual
 * @access  Private (Teacher/Admin)
 */
export const markManualAttendance = async (req, res) => {
    try {
        const { studentId, subjectId, classId, status, timeSlot } = req.body;
        const teacherId = req.user.id || req.user._id;

        const today = new Date().toISOString().split('T')[0];

        // If timeSlot not passed, try to fetch current time slot from subject_allocations
        let slot = timeSlot || null;
        if (!slot && subjectId && classId) {
            const alloc = await pool.query(
                'SELECT time_slot, start_time, end_time FROM subject_allocations WHERE class_id = $1 AND subject_id = $2 LIMIT 1',
                [classId, subjectId]
            );
            if (alloc.rows.length > 0) {
                slot = alloc.rows[0].time_slot || (alloc.rows[0].start_time ? `${alloc.rows[0].start_time} - ${alloc.rows[0].end_time}` : null);
            }
        }

        // 1. Check if attendance already marked for this specific time slot & date
        const existing = await pool.query(
            `SELECT id FROM attendance 
             WHERE student_id = $1 
               AND (subject_id = $2 OR $2 IS NULL) 
               AND (class_id = $3 OR $3 IS NULL) 
               AND date = $4 
               AND (time_slot = $5 OR ($5 IS NULL AND time_slot IS NULL))
             LIMIT 1`,
            [studentId, subjectId || null, classId || null, today, slot]
        );

        if (existing.rows.length > 0) {
            // Update status if already exists
            const updated = await pool.query(
                'UPDATE attendance SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                [status || 'present', existing.rows[0].id]
            );
            return res.status(200).json({ message: 'Attendance updated', attendance: updated.rows[0] });
        }

        // 2. Insert attendance record
        const insertRes = await pool.query(
            `INSERT INTO attendance (student_id, subject_id, class_id, marked_by, method, status, date, time_slot)
             VALUES ($1, $2, $3, $4, 'manual', $5, $6, $7) RETURNING *`,
            [studentId, subjectId || null, classId || null, teacherId, status || 'present', today, slot]
        );

        // 3. Update student streak count
        if (status === 'present') {
            await pool.query(
                `UPDATE users SET streak_count = streak_count + 1, 
                                 best_streak = GREATEST(best_streak, streak_count + 1),
                                 last_attendance_date = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [studentId]
            );
        } else if (status === 'absent') {
            await pool.query('UPDATE users SET streak_count = 0 WHERE id = $1', [studentId]);
        }

        // 4. Notify parent AND student if absent or on leave
        const studentRes = await pool.query('SELECT parent_id, name FROM users WHERE id = $1', [studentId]);
        if (studentRes.rows.length > 0 && (status === 'absent' || status === 'leave')) {
            const student = studentRes.rows[0];
            const statusLabel = status === 'absent' ? 'ABSENT 🔴' : 'on LEAVE 📋';
            // Notify parent
            if (student.parent_id) {
                await pool.query(
                    `INSERT INTO notifications (recipient_id, title, message, type, link)
                     VALUES ($1, $2, $3, 'warning', '/parent/attendance')`,
                    [student.parent_id, 'Attendance Alert', `⚠️ ${student.name} was marked ${statusLabel} today.`]
                );
            }
            // Notify student
            await pool.query(
                `INSERT INTO notifications (recipient_id, title, message, type, link)
                 VALUES ($1, $2, $3, 'warning', '/student/attendance')`,
                [studentId, 'Attendance Marked', `⚠️ You were marked ${statusLabel} today.`]
            );
        }

        res.status(201).json({ message: 'Manual attendance marked', attendance: insertRes.rows[0] });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get attendance records for a class
 * @route   GET /api/attendance/class/:classId
 * @access  Private (Teacher/Admin/Parent)
 */
export const getClassAttendance = async (req, res) => {
    try {
        const { classId } = req.params;
        const { date } = req.query;

        let sql = `
            SELECT a.*, u.name as student_name, u.roll_number
            FROM attendance a
            LEFT JOIN users u ON a.student_id = u.id
            WHERE a.class_id = $1
        `;
        const params = [classId];

        if (date) {
            sql += ' AND a.date = $2';
            params.push(date);
        }

        sql += ' ORDER BY a.date DESC, u.name ASC';

        const result = await pool.query(sql, params);
        const records = result.rows.map(r => ({
            _id: String(r.id),
            id: r.id,
            studentId: {
                _id: String(r.student_id),
                id: r.student_id,
                name: r.student_name,
                rollNumber: r.roll_number
            },
            status: r.status,
            date: r.date,
            timeSlot: r.time_slot,
            time: r.time_slot || 'N/A',
            method: r.method
        }));

        res.json(records);
    } catch (error) {
        console.error('Error getting class attendance:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Bulk mark manual attendance for multiple students
 * @route   POST /api/attendance/manual-bulk
 * @access  Private (Teacher/Admin)
 */
export const bulkMarkManualAttendance = async (req, res) => {
    try {
        const { attendanceData, subjectId, classId, date, timeSlot } = req.body;
        const teacherId = req.user.id || req.user._id;

        if (!attendanceData || !Array.isArray(attendanceData)) {
            return res.status(400).json({ message: 'Invalid attendance data provided' });
        }

        const targetDate = date || new Date().toISOString().split('T')[0];

        // Fetch time slot if not passed
        let slot = timeSlot || null;
        if (!slot && subjectId && classId) {
            const alloc = await pool.query(
                'SELECT time_slot, start_time, end_time FROM subject_allocations WHERE class_id = $1 AND subject_id = $2 LIMIT 1',
                [classId, subjectId]
            );
            if (alloc.rows.length > 0) {
                slot = alloc.rows[0].time_slot || (alloc.rows[0].start_time ? `${alloc.rows[0].start_time} - ${alloc.rows[0].end_time}` : null);
            }
        }

        const results = [];

        for (const record of attendanceData) {
            const { studentId, status } = record;

            // Check if existing attendance for this date & slot
            const existing = await pool.query(
                `SELECT id FROM attendance 
                 WHERE student_id = $1 
                   AND (subject_id = $2 OR $2 IS NULL) 
                   AND (class_id = $3 OR $3 IS NULL) 
                   AND date = $4
                   AND (time_slot = $5 OR ($5 IS NULL AND time_slot IS NULL))
                 LIMIT 1`,
                [studentId, subjectId || null, classId || null, targetDate, slot]
            );

            if (existing.rows.length > 0) {
                const updated = await pool.query(
                    'UPDATE attendance SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                    [status || 'present', existing.rows[0].id]
                );
                results.push(updated.rows[0]);
            } else {
                const insertRes = await pool.query(
                    `INSERT INTO attendance (student_id, subject_id, class_id, marked_by, method, status, date, time_slot)
                     VALUES ($1, $2, $3, $4, 'manual', $5, $6, $7) RETURNING *`,
                    [studentId, subjectId || null, classId || null, teacherId, status || 'present', targetDate, slot]
                );
                results.push(insertRes.rows[0]);
            }

            // Update streak
            if (status === 'present') {
                await pool.query(
                    `UPDATE users SET streak_count = streak_count + 1, 
                                     best_streak = GREATEST(best_streak, streak_count + 1),
                                     last_attendance_date = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [studentId]
                );
            } else if (status === 'absent') {
                await pool.query('UPDATE users SET streak_count = 0 WHERE id = $1', [studentId]);
            }
        }

        res.status(201).json({ message: 'Bulk attendance successfully recorded', count: results.length, data: results });
    } catch (error) {
        console.error('Error bulk marking attendance:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Test attendance notification email
 * @route   GET /api/attendance/test-attendance-email
 * @access  Private (Admin)
 */
export const testAttendanceEmail = async (req, res) => {
    res.json({ message: 'Email test endpoint ready' });
};
