import { pool } from '../config/db.js';
import cloudinary from '../config/cloudinary.js';

/**
 * @desc    Apply for a new leave (Student or Teacher)
 * @route   POST /api/leave/apply
 * @access  Private (Student/Teacher)
 */
export const applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        const userId = req.user.id || req.user._id;
        const userRole = req.user.role;

        let documentUrl = '';
        if (req.file) {
            const fileBase64 = req.file.buffer.toString('base64');
            const fileUri = `data:${req.file.mimetype};base64,${fileBase64}`;
            const uploadRes = await cloudinary.uploader.upload(fileUri, {
                folder: 'iattend/leaves',
                resource_type: 'auto'
            });
            documentUrl = uploadRes.secure_url;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (userRole === 'student') {
            const isSpecialCase = ['Medical', 'Emergency'].includes(leaveType);
            if (diffDays > 3 && !isSpecialCase) {
                return res.status(400).json({ message: 'Standard leaves cannot exceed 3 days.' });
            }
        }

        const result = await pool.query(
            `INSERT INTO leave_requests
             (user_id, role, leave_type, start_date, end_date, reason, document_url, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
            [userId, userRole, leaveType || 'Casual', startDate, endDate, reason, documentUrl]
        );

        const leave = result.rows[0];

        // If teacher applied, notify all admins
        if (userRole === 'teacher') {
            const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
            for (const admin of admins.rows) {
                await pool.query(
                    `INSERT INTO notifications (recipient_id, title, message, type)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        admin.id,
                        'Teacher Leave Application',
                        `📋 New leave application from Teacher ${req.user.name} (${new Date(startDate).toLocaleDateString()} – ${new Date(endDate).toLocaleDateString()}): "${reason}"`,
                        'teacher_leave_request'
                    ]
                );
            }
        }

        // If student applied, notify class coordinator
        if (userRole === 'student') {
            const studentClassId = req.user.classId || req.user.class_id || 1;
            const coordRes = await pool.query(
                `SELECT u.id FROM users u 
                 LEFT JOIN class_coordinators cc ON cc.teacher_id = u.id 
                 WHERE cc.class_id = $1 OR u.class_coordinator_for = $1 LIMIT 1`,
                [studentClassId]
            );
            if (coordRes.rows.length > 0) {
                await pool.query(
                    `INSERT INTO notifications (recipient_id, title, message, type)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        coordRes.rows[0].id,
                        'Student Leave Request',
                        `📋 New leave request from ${req.user.name} (${new Date(startDate).toLocaleDateString()} – ${new Date(endDate).toLocaleDateString()})`,
                        'leave_request'
                    ]
                );
            }
        }

        res.status(201).json({ message: 'Leave application submitted successfully', leave });
    } catch (error) {
        console.error('Apply leave error:', error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get leave history for the logged-in user
 * @route   GET /api/leave/my-leaves
 * @access  Private
 */
export const getMyLeaves = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await pool.query(
            `SELECT * FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        const leaves = result.rows.map(r => ({
            _id: String(r.id),
            id: r.id,
            leaveType: r.leave_type,
            startDate: r.start_date,
            endDate: r.end_date,
            reason: r.reason,
            status: r.status,
            documentUrl: r.document_url,
            createdAt: r.created_at
        }));
        res.json(leaves);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get leave requests for coordinator's class
 * @route   GET /api/leave/coordinator/all
 * @access  Private (Coordinator)
 */
export const getCoordinatorLeaves = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        let classId = null;

        // 1. Check users.class_coordinator_for
        const userRes = await pool.query(`SELECT class_coordinator_for FROM users WHERE id = $1`, [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].class_coordinator_for) {
            classId = userRes.rows[0].class_coordinator_for;
        }

        // 2. Check class_coordinators table
        if (!classId) {
            const coordRes = await pool.query(
                `SELECT class_id FROM class_coordinators WHERE teacher_id = $1 LIMIT 1`,
                [userId]
            );
            if (coordRes.rows.length > 0) {
                classId = coordRes.rows[0].class_id;
            }
        }

        // 3. Check allocated classes for teacher
        if (!classId) {
            const allocRes = await pool.query(
                `SELECT class_id FROM subject_allocations WHERE teacher_id = $1 LIMIT 1`,
                [userId]
            );
            if (allocRes.rows.length > 0) {
                classId = allocRes.rows[0].class_id;
            }
        }

        const result = classId ? await pool.query(
            `SELECT lr.*, u.name as student_name, u.email, u.roll_number
             FROM leave_requests lr
             JOIN users u ON lr.user_id = u.id
             WHERE u.class_id = $1 AND lr.role = 'student'
             ORDER BY lr.created_at DESC`,
            [classId]
        ) : await pool.query(
            `SELECT lr.*, u.name as student_name, u.email, u.roll_number
             FROM leave_requests lr
             JOIN users u ON lr.user_id = u.id
             WHERE lr.role = 'student'
             ORDER BY lr.created_at DESC`
        );

        const leaves = result.rows.map(r => ({
            _id: String(r.id),
            id: r.id,
            leaveType: r.leave_type,
            startDate: r.start_date,
            endDate: r.end_date,
            reason: r.reason,
            status: r.status,
            documentUrl: r.document_url,
            createdAt: r.created_at,
            userId: {
                _id: String(r.user_id),
                name: r.student_name,
                email: r.email,
                rollNumber: r.roll_number
            }
        }));

        res.json(leaves);
    } catch (error) {
        console.error('Error fetching coordinator leaves:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get teacher leave applications for Admin
 * @route   GET /api/leave/admin/teacher-leaves
 * @access  Private (Admin)
 */
export const getAdminTeacherLeaves = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT lr.*, u.name as teacher_name, u.email as teacher_email, d.name as department_name
            FROM leave_requests lr
            JOIN users u ON lr.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE LOWER(lr.role) = 'teacher' OR LOWER(u.role) = 'teacher'
            ORDER BY lr.created_at DESC
        `);

        const leaves = result.rows.map(r => ({
            _id: String(r.id),
            id: r.id,
            leaveType: r.leave_type,
            startDate: r.start_date,
            endDate: r.end_date,
            reason: r.reason,
            status: r.status,
            documentUrl: r.document_url,
            createdAt: r.created_at,
            userId: {
                _id: String(r.user_id),
                name: r.teacher_name,
                email: r.teacher_email,
                departmentName: r.department_name || 'N/A'
            }
        }));

        res.json(leaves);
    } catch (error) {
        console.error('Error fetching admin teacher leaves:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Approve a leave request
 * @route   PUT /api/leave/approve/:id
 * @access  Private (Coordinator/Admin)
 */
export const approveLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const reviewerId = req.user.id || req.user._id;

        const result = await pool.query(
            `UPDATE leave_requests SET status = 'approved', reviewed_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [reviewerId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        const leave = result.rows[0];

        // Notify applicant
        await pool.query(
            `INSERT INTO notifications (recipient_id, title, message, type)
             VALUES ($1, $2, $3, $4)`,
            [
                leave.user_id,
                'Leave Approved',
                `✅ Your leave request (${new Date(leave.start_date).toLocaleDateString()} – ${new Date(leave.end_date).toLocaleDateString()}) has been APPROVED.`,
                'leave_approved'
            ]
        );

        res.json({ message: 'Leave approved successfully', leave });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Reject a leave request
 * @route   PUT /api/leave/reject/:id
 * @access  Private (Coordinator/Admin)
 */
export const rejectLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const reviewerId = req.user.id || req.user._id;

        const result = await pool.query(
            `UPDATE leave_requests SET status = 'rejected', reviewed_by = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
            [reviewerId, reason || 'Rejected by Admin', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        const leave = result.rows[0];

        // Notify applicant
        await pool.query(
            `INSERT INTO notifications (recipient_id, title, message, type)
             VALUES ($1, $2, $3, $4)`,
            [
                leave.user_id,
                'Leave Rejected',
                `❌ Your leave request (${new Date(leave.start_date).toLocaleDateString()} – ${new Date(leave.end_date).toLocaleDateString()}) has been REJECTED.`,
                'leave_rejected'
            ]
        );

        res.json({ message: 'Leave request rejected', leave });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Revoke a previously approved leave
 * @route   PUT /api/leave/revoke/:id
 * @access  Private (Coordinator/Admin)
 */
export const revokeLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const reviewerId = req.user.id || req.user._id;

        const result = await pool.query(
            `UPDATE leave_requests SET status = 'revoked', reviewed_by = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
            [reviewerId, reason || 'Revoked by Admin', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        const leave = result.rows[0];

        // Notify applicant
        await pool.query(
            `INSERT INTO notifications (recipient_id, title, message, type)
             VALUES ($1, $2, $3, $4)`,
            [
                leave.user_id,
                'Leave Revoked',
                `⚠️ Your approved leave (${new Date(leave.start_date).toLocaleDateString()} – ${new Date(leave.end_date).toLocaleDateString()}) has been REVOKED.`,
                'leave_revoked'
            ]
        );

        res.json({ message: 'Leave request revoked', leave });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
