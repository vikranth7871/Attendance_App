import cron from 'node-cron';
import { pool } from '../config/db.js';

/**
 * Helper to parse time strings like "11:00 AM", "4:30 PM", "14:00" into minutes past midnight
 */

export function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const timeOnly = clean.replace(/(AM|PM)/g, '').trim();
    const parts = timeOnly.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1] || '0', 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

/**
 * Auto-Mark Unmarked Students as 'absent' or 'leave' after grace period
 * Edge Case 1: If student has approved leave -> status = 'leave'
 * Edge Case 2: Only trigger for active timetable slots in `subject_allocations`
 * Edge Case 3: Grace period (15 minutes after end_time) allows teacher manual overrides
 */
export const autoMarkAbsentAndLeave = async (gracePeriodMinutes = 15) => {
    try {
        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayOfWeek = days[now.getDay()];
        const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // 1. Fetch active timetable slots for today from subject_allocations
        const allocRes = await pool.query(
            'SELECT * FROM subject_allocations WHERE LOWER(day_of_week) = LOWER($1)',
            [currentDayOfWeek]
        );

        if (allocRes.rows.length === 0) return;

        for (const slot of allocRes.rows) {
            const endMin = parseTimeToMinutes(slot.end_time || slot.time_slot?.split('-')[1]);
            if (endMin === null) continue;

            // Check if end_time + grace_period has passed
            const graceEndTime = endMin + gracePeriodMinutes;
            if (currentMinutes < graceEndTime) {
                // Grace period is still active for this slot
                continue;
            }

            const { class_id, subject_id, teacher_id } = slot;

            // 2. Fetch all active students in this class
            const studentsRes = await pool.query(
                `SELECT id, name, parent_id, streak_count 
                 FROM users 
                 WHERE role = 'student' AND (class_id = $1 OR $1 IS NULL)`,
                [class_id]
            );

            const slotStr = slot.time_slot || (slot.start_time ? `${slot.start_time} - ${slot.end_time}` : null);

            for (const student of studentsRes.rows) {
                // 3. Check if student already has an attendance record today for this specific subject/class & time slot
                const existingAtt = await pool.query(
                    `SELECT id FROM attendance 
                     WHERE student_id = $1 
                       AND (subject_id = $2 OR $2 IS NULL) 
                       AND date = $3 
                       AND (time_slot = $4 OR ($4 IS NULL AND time_slot IS NULL))
                     LIMIT 1`,
                    [student.id, subject_id, todayStr, slotStr]
                );

                if (existingAtt.rows.length > 0) {
                    // Attendance already marked (either present, absent, or leave)
                    continue;
                }

                // 4. Edge Case 1: Check if student has approved leave for today
                const leaveRes = await pool.query(
                    `SELECT id, leave_type FROM leave_requests 
                     WHERE user_id = $1 AND status = 'approved' AND start_date <= $2 AND end_date >= $2 LIMIT 1`,
                    [student.id, todayStr]
                );

                if (leaveRes.rows.length > 0) {
                    // Auto-mark as 'leave'
                    await pool.query(
                        `INSERT INTO attendance (student_id, subject_id, class_id, marked_by, method, status, date, time_slot)
                         VALUES ($1, $2, $3, $4, 'auto_leave', 'leave', $5, $6)`,
                        [student.id, subject_id, class_id, teacher_id || null, todayStr, slotStr]
                    );

                    if (student.parent_id) {
                        await pool.query(
                            `INSERT INTO notifications (recipient_id, title, message, type)
                             VALUES ($1, 'Attendance Alert', $2, 'info')`,
                            [student.parent_id, `📋 Attendance Alert: ${student.name} is on approved LEAVE today.`]
                        );
                    }
                } else {
                    // Auto-mark as 'absent'
                    await pool.query(
                        `INSERT INTO attendance (student_id, subject_id, class_id, marked_by, method, status, date, time_slot)
                         VALUES ($1, $2, $3, $4, 'auto_absent', 'absent', $5, $6)`,
                        [student.id, subject_id, class_id, teacher_id || null, todayStr, slotStr]
                    );

                    // Reset student streak count to 0
                    await pool.query('UPDATE users SET streak_count = 0 WHERE id = $1', [student.id]);

                    // Notify parent of absence
                    if (student.parent_id) {
                        await pool.query(
                            `INSERT INTO notifications (recipient_id, title, message, type)
                             VALUES ($1, 'Attendance Alert', $2, 'warning')`,
                            [student.parent_id, `⚠️ Attendance Alert: ${student.name} was marked ABSENT today for non-marking.`]
                        );
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in autoMarkAbsentAndLeave scheduler:', error);
    }
};

/**
 * Initialize cron scheduler running every 5 minutes
 */
export const initAttendanceScheduler = () => {
    // Run every 5 minutes: '*/5 * * * *'
    cron.schedule('*/5 * * * *', () => {
        console.log('⏰ [Automated Scheduler] Checking for un-marked attendance slots...');
        autoMarkAbsentAndLeave(15);
    });

    console.log('✅ Automated Attendance Scheduler initialized (runs every 5 mins with 15-min grace period)');
};
