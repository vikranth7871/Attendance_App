import LeaveRequest from '../models/LeaveRequest.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import cloudinary from '../config/cloudinary.js';

/**
 * @desc    Apply for a new leave
 * @route   POST /api/leave/apply
 * @access  Private (Student/Teacher)
 */
export const applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason, extensionFor } = req.body;
        
        // Handle Cloudinary upload
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

        if (extensionFor && leaveType !== 'Medical') {
            return res.status(400).json({ message: 'Only Medical leaves can be extended.' });
        }

        // Calculate duration
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // 1. Strict 3-day rule
        const isSpecialCase = ['Medical', 'Emergency'].includes(leaveType);
        if (diffDays > 3) {
            if (!isSpecialCase) {
                return res.status(400).json({ message: 'Standard leaves (Casual/Other) cannot exceed 3 days. Please contact your coordinator for special permission.' });
            }
            if (!req.file) {
                return res.status(400).json({ message: `For ${leaveType} leave exceeding 3 days, uploading a supporting document (Medical Certificate/Proof) is mandatory.` });
            }
        }

        // 2. 18-day semester limit (Jan-Jun / Jul-Dec)
        const now = new Date(startDate);
        let semStart, semEnd;
        if (now.getMonth() < 6) { // Jan - Jun
            semStart = new Date(now.getFullYear(), 0, 1);
            semEnd = new Date(now.getFullYear(), 5, 30);
        } else { // Jul - Dec
            semStart = new Date(now.getFullYear(), 6, 1);
            semEnd = new Date(now.getFullYear(), 11, 31);
        }

        const existingLeaves = await LeaveRequest.find({
            userId: req.user._id,
            status: 'approved',
            startDate: { $gte: semStart, $lte: semEnd }
        });

        const totalApprovedDays = existingLeaves.reduce((total, leave) => {
            const s = new Date(leave.startDate);
            const e = new Date(leave.endDate);
            const d = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
            return total + d;
        }, 0);

        if (totalApprovedDays + diffDays > 18) {
            return res.status(400).json({ 
                message: `Semester leave limit exceeded. You have already taken ${totalApprovedDays} days this semester. Total allowed is 18 days.` 
            });
        }

        const leave = await LeaveRequest.create({
            userId: req.user._id,
            role: req.user.role,
            leaveType: leaveType || 'Casual',
            startDate,
            endDate,
            reason,
            documentUrl,
            extensionFor: extensionFor || undefined
        });
        res.status(201).json({ message: 'Leave application submitted successfully', leave });

        // Notify the class coordinator (if student applying and classId is set)
        if (req.user.role === 'student' && req.user.classId) {
            const coordinator = await User.findOne({
                role: 'teacher',
                classCoordinatorFor: req.user.classId
            });

            if (coordinator) {
                await Notification.create({
                    userId: coordinator._id,
                    message: `📋 New leave request from ${req.user.name} (${new Date(startDate).toLocaleDateString()} – ${new Date(endDate).toLocaleDateString()}): "${reason.substring(0, 60)}${reason.length > 60 ? '…' : ''}"`,
                    type: 'leave_request',
                    link: '/teacher/leaves'
                });
            }
        }
    } catch (error) {
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
        const leaves = await LeaveRequest.find({ userId: req.user._id }).sort({ createdAt: -1 });
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
        // Find the class this teacher is coordinator for
        if (!req.user.classCoordinatorFor) {
            return res.status(403).json({ message: 'You are not assigned as a class coordinator' });
        }

        const classId = req.user.classCoordinatorFor;

        // Find all students in this class
        const students = await User.find({ classId: classId, role: 'student' }).select('_id');
        const studentIds = students.map(s => s._id);

        // Fetch leave requests for these students
        const leaves = await LeaveRequest.find({
            userId: { $in: studentIds }
        }).populate({
            path: 'userId',
            select: 'name rollNumber email departmentId section',
            populate: { path: 'departmentId', select: 'departmentName name' }
        }).sort({ createdAt: -1 });

        res.json(leaves);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Approve a leave request
 * @route   PUT /api/leave/approve/:id
 * @access  Private (Coordinator/Admin)
 */
export const approveLeave = async (req, res) => {
    try {
        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: 'Leave request not found' });

        if (leave.status !== 'pending') {
            return res.status(400).json({ message: `Leave request is already ${leave.status}` });
        }

        leave.status = 'approved';
        leave.approvedBy = req.user._id;
        await leave.save();

        // Mark attendance as 'leave' for the student
        const student = await User.findById(leave.userId).populate('enrolledSubjects.subject');

        if (student && student.role === 'student') {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const currentDate = new Date(d);
                currentDate.setHours(0, 0, 0, 0);

                // For each subject the student is enrolled in, create a leave record
                for (const enrollment of student.enrolledSubjects) {
                    await Attendance.findOneAndUpdate(
                        {
                            studentId: student._id,
                            subjectId: enrollment.subject._id,
                            date: {
                                $gte: currentDate,
                                $lt: new Date(new Date(currentDate).setDate(currentDate.getDate() + 1))
                            }
                        },
                        {
                            studentId: student._id,
                            teacherId: req.user._id,
                            classId: student.classId,
                            subjectId: enrollment.subject._id,
                            date: currentDate,
                            time: '00:00:00',
                            method: 'manual',
                            status: 'leave'
                        },
                        { upsert: true, new: true }
                    );
                }
            }
        }

        res.json({ message: 'Leave approved and attendance adjusted', leave });

        // Notify student: approved
        await Notification.create({
            userId: leave.userId,
            message: `✅ Your leave request (${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}) has been APPROVED by your coordinator.`,
            type: 'leave_approved',
            link: '/student/leaves'
        });

        // Notify parent: approved
        if (student && student.parentId) {
            await Notification.create({
                userId: student.parentId,
                message: `✅ Leave request for ${student.name} (${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}) has been APPROVED.`,
                type: 'leave_approved',
                link: '/parent/leaves'
            });
        }
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
        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: 'Leave request not found' });

        leave.status = 'rejected';
        leave.approvedBy = req.user._id;
        await leave.save();
        res.json({ message: 'Leave request rejected', leave });

        // Notify student: rejected
        await Notification.create({
            userId: leave.userId,
            message: `❌ Your leave request (${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}) has been REJECTED by your coordinator.`,
            type: 'leave_rejected',
            link: '/student/leaves'
        });

        // Notify parent: rejected
        const student = await User.findById(leave.userId);
        if (student && student.parentId) {
            await Notification.create({
                userId: student.parentId,
                message: `❌ Leave request for ${student.name} (${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}) has been REJECTED.`,
                type: 'leave_rejected',
                link: '/parent/leaves'
            });
        }
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
        const { reason } = req.body;
        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: 'Leave request not found' });

        if (leave.status !== 'approved') {
            return res.status(400).json({ message: 'Only approved leaves can be revoked' });
        }

        leave.status = 'revoked';
        leave.revokedBy = req.user._id;
        leave.revocationReason = reason || 'Revoked by coordinator';
        await leave.save();

        // Remove the 'leave' attendance records
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);

        await Attendance.deleteMany({
            studentId: leave.userId,
            status: 'leave',
            date: {
                $gte: new Date(start.setHours(0, 0, 0, 0)),
                $lte: new Date(end.setHours(23, 59, 59, 999))
            }
        });

        res.json({ message: 'Leave revoked and attendance records cleared', leave });

        // Notify student: revoked
        await Notification.create({
            userId: leave.userId,
            message: `⚠️ Your approved leave (${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}) has been REVOKED. Reason: ${leave.revocationReason}`,
            type: 'leave_revoked',
            link: '/student/leaves'
        });

        // Notify parent: revoked
        const student = await User.findById(leave.userId);
        if (student && student.parentId) {
            await Notification.create({
                userId: student.parentId,
                message: `⚠️ Approved leave for ${student.name} (${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}) has been REVOKED.`,
                type: 'leave_revoked',
                link: '/parent/leaves'
            });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
