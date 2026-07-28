import User from '../models/User.js';
import { pool } from '../config/db.js';
import Department from '../models/Department.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import SubjectAllocation from '../models/SubjectAllocation.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import SystemSetting from '../models/SystemSetting.js';

/**
 * @desc    Create a new department
 * @route   POST /api/admin/department
 * @access  Private (Admin)
 */
export const createDepartment = async (req, res) => {
    try {
        const { departmentName, name } = req.body;
        const depName = departmentName || name;
        if (!depName) {
            return res.status(400).json({ message: 'Department name is required' });
        }
        const result = await pool.query(
            'INSERT INTO departments (name) VALUES ($1) RETURNING *',
            [depName.trim()]
        );
        const d = result.rows[0];
        res.status(201).json({
            _id: String(d.id),
            id: d.id,
            departmentName: d.name,
            name: d.name
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get all departments
 * @route   GET /api/admin/department
 * @access  Private (Admin/Teacher)
 */
export const getDepartments = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM departments ORDER BY name ASC');
        const departments = result.rows.map(d => ({
            _id: String(d.id),
            id: d.id,
            departmentName: d.name,
            name: d.name,
            code: d.code
        }));
        res.json(departments);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Create a new class
 * @route   POST /api/admin/class
 * @access  Private (Admin)
 */
export const createClass = async (req, res) => {
    try {
        const { className, departmentId, section = 'A', year } = req.body;
        const result = await pool.query(
            'INSERT INTO classes (name, department_id, academic_year) VALUES ($1, $2, $3) RETURNING *',
            [className, departmentId, String(year || '')]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get all classes (optionally filtered by department)
 * @route   GET /api/admin/class
 * @access  Private (Admin/Teacher)
 */
export const getClasses = async (req, res) => {
    try {
        const { departmentId } = req.query;
        let sql = `
            SELECT c.*, d.name as department_name, d.code as department_code
            FROM classes c
            LEFT JOIN departments d ON c.department_id = d.id
        `;
        const params = [];
        if (departmentId) {
            sql += ' WHERE c.department_id = $1';
            params.push(departmentId);
        }
        sql += ' ORDER BY c.name ASC';

        const result = await pool.query(sql, params);
        const classes = result.rows.map(c => ({
            _id: String(c.id),
            id: c.id,
            className: c.name,
            name: c.name,
            academicYear: c.academic_year,
            departmentId: {
                _id: String(c.department_id),
                id: c.department_id,
                departmentName: c.department_name,
                name: c.department_name
            }
        }));
        res.json(classes);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Delete a department and cascade removal
 * @route   DELETE /api/admin/department/:id
 * @access  Private (Admin)
 */
export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Department not found' });
        }

        await pool.query('DELETE FROM classes WHERE department_id = $1', [id]);
        await pool.query('UPDATE users SET department_id = NULL WHERE department_id = $1', [id]);
        await pool.query('DELETE FROM subjects WHERE department_id = $1', [id]);

        res.json({ message: 'Department and related data cleared successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Delete a class and cascade removal
 * @route   DELETE /api/admin/class/:id
 * @access  Private (Admin)
 */
export const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM classes WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Class not found' });
        }

        await pool.query('UPDATE users SET class_id = NULL, section = NULL, roll_number = NULL WHERE class_id = $1', [id]);
        await pool.query('DELETE FROM subject_allocations WHERE class_id = $1', [id]);
        await pool.query('UPDATE users SET class_coordinator_for = NULL WHERE class_coordinator_for = $1', [id]);

        res.json({ message: 'Class and related allocations cleared successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Create a new user (Student/Teacher/Admin)
 * @route   POST /api/admin/user
 * @access  Private (Admin)
 */
export const createUser = async (req, res) => {
    try {
        const { name, email, password, role, department, departmentId, class: classInBody, classId, section, rollNumber, parentId, parentEmail } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        let finalParentId = parentId;

        // Special logic for student: automatic parent linking/creation via parentEmail
        if (role === 'student' && parentEmail) {
            let parent = await User.findOne({ email: parentEmail, role: 'parent' });
            if (parent) {
                // Update existing parent's password to match student's, as requested
                parent.password = password;
                await parent.save();
                finalParentId = parent._id;
            } else {
                // Check if the email is taken by a non-parent role
                const emailTaken = await User.findOne({ email: parentEmail });
                if (emailTaken) {
                    return res.status(400).json({ message: `The email ${parentEmail} is already taken by a ${emailTaken.role}` });
                }
                // Create new parent account
                const newParent = await User.create({
                    name: `Parent of ${name}`,
                    email: parentEmail,
                    password: password,
                    role: 'parent'
                });
                finalParentId = newParent._id;
            }
        }

        const user = await User.create({
            name, email, password, role,
            departmentId: departmentId || department, // Map incoming 'department' or 'departmentId'
            classId: classId || classInBody, // Map incoming 'class' or 'classId'
            section, rollNumber,
            parentId: finalParentId, parentEmail
        });

        const userRes = user.toObject();
        delete userRes.password;
        res.status(201).json(userRes);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Bulk create users from an array
 * @route   POST /api/admin/users/bulk
 * @access  Private (Admin)
 */
export const createUsersBulk = async (req, res) => {
    try {
        const { users } = req.body;
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: 'No users provided' });
        }

        const depCache = {};
        const classCache = {};

        const results = await Promise.allSettled(users.map(async (u, index) => {
            let { name, email, password, role, department, className, section, rollNumber, parentEmail } = u;

            if (!name || !email || !password || !role) {
                throw new Error(`Row ${index + 1}: Missing required fields (Name, Email, Password, Role)`);
            }

            const userExists = await User.findOne({ email: email.toLowerCase().trim() });
            if (userExists) {
                throw new Error(`Row ${index + 1}: User with email ${email} already exists`);
            }

            let departmentId = null;
            if (department) {
                const depNameKey = department.toLowerCase().trim();
                if (!depCache[depNameKey]) {
                    const depRes = await pool.query(
                        'SELECT id FROM departments WHERE LOWER(name) = $1 LIMIT 1',
                        [depNameKey]
                    );
                    let depId = depRes.rows[0]?.id;
                    if (!depId) {
                        const newDepRes = await pool.query(
                            'INSERT INTO departments (name) VALUES ($1) RETURNING id',
                            [department.trim()]
                        );
                        depId = newDepRes.rows[0].id;
                    }
                    depCache[depNameKey] = depId;
                }
                departmentId = depCache[depNameKey];
            }

            let classId = null;
            if (className && departmentId) {
                const classKey = `${className.toLowerCase().trim()}-${departmentId}`;
                if (!classCache[classKey]) {
                    const classRes = await pool.query(
                        'SELECT id FROM classes WHERE LOWER(name) = $1 AND department_id = $2 LIMIT 1',
                        [className.toLowerCase().trim(), departmentId]
                    );
                    let cId = classRes.rows[0]?.id;
                    if (!cId) {
                        const newClassRes = await pool.query(
                            'INSERT INTO classes (name, department_id) VALUES ($1, $2) RETURNING id',
                            [className.trim(), departmentId]
                        );
                        cId = newClassRes.rows[0].id;
                    }
                    classCache[classKey] = cId;
                }
                classId = classCache[classKey];
            }

            return User.create({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password,
                role: role.toLowerCase().trim(),
                departmentId,
                classId,
                section: section ? section.trim() : null,
                rollNumber: rollNumber ? rollNumber.trim() : null,
                parentEmail: parentEmail ? parentEmail.toLowerCase().trim() : null
            });
        }));

        const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected').map(r => r.reason.message);

        res.status(201).json({
            message: `Successfully created ${successful.length} users. Failed: ${failed.length}`,
            successfulCount: successful.length,
            errors: failed
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get all students
 * @route   GET /api/admin/students
 * @access  Private (Admin/Teacher)
 */
export const getStudents = async (req, res) => {
    try {
        const { classId } = req.query;
        const filter = { role: 'student' };
        if (classId) filter.classId = classId;
        const students = await User.find(filter).select('-password').populate('departmentId').populate('classId');
        res.json(students);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get all teachers
 * @route   GET /api/admin/teachers
 * @access  Private (Admin)
 */
export const getTeachers = async (req, res) => {
    try {
        const { departmentId } = req.query;
        let filter = { role: 'teacher' };
        if (departmentId) filter.departmentId = departmentId;

        const teachers = await User.find(filter).select('-password').populate('departmentId');
        res.json(teachers);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get all parents
 * @route   GET /api/admin/parents
 * @access  Private (Admin)
 */
export const getParents = async (req, res) => {
    try {
        const parents = await User.find({ role: 'parent' }).select('-password');
        res.json(parents);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get comprehensive user details and activity stats
 * @route   GET /api/admin/user/:id
 * @access  Private (Admin)
 */
export const getUserDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        const userRes = await pool.query(`
            SELECT u.*, d.name as department_name, c.name as class_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN classes c ON u.class_id = c.id
            WHERE u.id = $1
        `, [userId]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const u = userRes.rows[0];
        const profile = {
            _id: String(u.id),
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            rollNumber: u.roll_number,
            parentEmail: u.parent_email,
            section: u.section,
            departmentId: u.department_id ? { _id: String(u.department_id), id: u.department_id, name: u.department_name, departmentName: u.department_name } : null,
            classId: u.class_id ? { _id: String(u.class_id), id: u.class_id, name: u.class_name, className: u.class_name } : null,
            streakCount: u.streak_count || 0,
            bestStreak: u.best_streak || 0
        };

        const attRes = await pool.query('SELECT * FROM attendance WHERE student_id = $1', [userId]);
        const stats = {
            totalPresent: attRes.rows.filter(a => a.status === 'present').length,
            totalAbsent: attRes.rows.filter(a => a.status === 'absent').length,
            totalClasses: attRes.rows.length,
            history: attRes.rows
        };

        res.json({
            profile,
            stats,
            subjects: []
        });

    } catch (error) {
        console.error('Error in getUserDetails:', error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Update user details
 * @route   PUT /api/admin/user/:id
 * @access  Private (Admin)
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, role, departmentId, classId, section, rollNumber, parentEmail } = req.body;

        let hashedPassword = null;
        if (password && password.trim().length > 0) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const result = await pool.query(
            `UPDATE users 
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 password = COALESCE($3, password),
                 role = COALESCE($4, role),
                 department_id = COALESCE($5, department_id),
                 class_id = COALESCE($6, class_id),
                 section = COALESCE($7, section),
                 roll_number = COALESCE($8, roll_number),
                 parent_email = COALESCE($9, parent_email),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $10 RETURNING *`,
            [
                name || null,
                email || null,
                hashedPassword,
                role ? role.toLowerCase() : null,
                departmentId || null,
                classId || null,
                section || null,
                rollNumber || null,
                parentEmail || null,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const u = result.rows[0];
        res.json({
            _id: String(u.id),
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            rollNumber: u.roll_number,
            section: u.section
        });

    } catch (error) {
        console.error('Error in updateUser:', error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Update student details (Alias for updateUser)
 * @route   PUT /api/admin/student/:id
 * @access  Private (Admin)
 */
export const updateStudent = updateUser;

/**
 * @desc    Delete a user record (Student/Teacher/Parent)
 * @route   DELETE /api/admin/user/:id
 * @access  Private (Admin)
 */
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Additional cleanup: if teacher, remove their subject allocations
        if (user.role === 'teacher') {
            await SubjectAllocation.deleteMany({ teacherId: user._id });
        }

        // BUG-18 Fix: Cascade delete Attendance + LeaveRequest records for deleted student
        if (user.role === 'student') {
            await Attendance.deleteMany({ studentId: user._id });
            await LeaveRequest.deleteMany({ userId: user._id });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User removed successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Delete a student record (Alias for deleteUser)
 * @route   DELETE /api/admin/student/:id
 * @access  Private (Admin)
 */
export const deleteStudent = deleteUser;

/**
 * @desc    Create a new subject
 * @route   POST /api/admin/subject
 * @access  Private (Admin)
 */
export const createSubject = async (req, res) => {
    try {
        const { subjectName, departmentId, name } = req.body;
        const subName = subjectName || name;
        if (!subName) {
            return res.status(400).json({ message: 'Subject name is required' });
        }
        const result = await pool.query(
            'INSERT INTO subjects (name, department_id) VALUES ($1, $2) RETURNING *',
            [subName.trim(), departmentId || null]
        );
        const s = result.rows[0];
        res.status(201).json({
            _id: String(s.id),
            id: s.id,
            subjectName: s.name,
            name: s.name,
            departmentId: s.department_id
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Update subject details
 * @route   PUT /api/admin/subject/:id
 * @access  Private (Admin)
 */
export const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectName, departmentId, name } = req.body;
        const subName = subjectName || name;
        const result = await pool.query(
            'UPDATE subjects SET name = COALESCE($1, name), department_id = COALESCE($2, department_id), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [subName || null, departmentId || null, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        const s = result.rows[0];
        res.json({
            _id: String(s.id),
            id: s.id,
            subjectName: s.name,
            name: s.name,
            departmentId: s.department_id
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Delete a subject and its related allocations
 * @route   DELETE /api/admin/subject/:id
 * @access  Private (Admin)
 */
export const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM subjects WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        await pool.query('DELETE FROM subject_allocations WHERE subject_id = $1', [id]);

        res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getTimetableByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const timetable = await SubjectAllocation.find({ classId })
            .populate('teacherId', 'name')
            .populate('subjectId', 'subjectName departmentId');
        res.json(timetable);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Assign a teacher to a subject and class (Timetable entry)
 * @route   POST /api/admin/assign-subject
 * @access  Private (Admin)
 */
export const assignSubject = async (req, res) => {
    try {
        const { subjectId, teacherId, classId, slots, roomNumber, dayOfWeek, timeSlot, startTime, endTime } = req.body;

        if (!subjectId || !teacherId || !classId) {
            return res.status(400).json({ message: 'Subject, Teacher, and Class are required' });
        }

        const slotList = (Array.isArray(slots) && slots.length > 0)
            ? slots
            : [{ dayOfWeek, timeSlot, startTime, endTime }];

        const createdAllocations = [];

        for (const slot of slotList) {
            let sTime = slot.startTime || '';
            let eTime = slot.endTime || '';
            let dayName = slot.dayOfWeek || dayOfWeek || null;
            let slotStr = slot.timeSlot || (dayName ? `${dayName} ${sTime} - ${eTime}` : '');

            if (!sTime && slotStr && slotStr.includes('-')) {
                const parts = slotStr.split(' - ');
                sTime = parts[0]?.replace(dayName || '', '').trim();
                eTime = parts[1]?.trim();
            }

            const result = await pool.query(
                `INSERT INTO subject_allocations 
                 (teacher_id, subject_id, class_id, day_of_week, time_slot, start_time, end_time, room_number)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [
                    teacherId,
                    subjectId,
                    classId,
                    dayName,
                    slotStr,
                    sTime || null,
                    eTime || null,
                    roomNumber || null
                ]
            );
            createdAllocations.push(result.rows[0]);
        }

        res.status(201).json({
            message: `Successfully created ${createdAllocations.length} assignment slot(s)`,
            allocations: createdAllocations
        });

    } catch (error) {
        console.error('Error assigning subject:', error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Assign a teacher as a class coordinator
 * @route   POST /api/admin/assign-coordinator
 * @access  Private (Admin)
 */
export const assignClassCoordinator = async (req, res) => {
    try {
        const { teacherId, classId } = req.body;
        const result = await pool.query(
            'UPDATE users SET class_coordinator_for = $1 WHERE id = $2 AND role = \'teacher\' RETURNING *',
            [classId, teacherId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Revoke a teacher's class coordinator status
 * @route   DELETE /api/admin/revoke-coordinator/:teacherId
 * @access  Private (Admin)
 */
export const revokeClassCoordinator = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const result = await pool.query(
            'UPDATE users SET class_coordinator_for = NULL WHERE id = $1 AND role = \'teacher\' RETURNING *',
            [teacherId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const assignPermissions = async (req, res) => {
    try {
        const { department, classId, role, permissions } = req.body;
        let filter = {};
        if (role) filter.role = role;
        if (department) filter.departmentId = department;
        if (classId) filter.classId = classId;

        // Admin creates permissions for bulk users matching the scope
        const result = await User.updateMany(filter, { $set: { permissions } });
        res.json({ message: `${result.modifiedCount} users updated with new permissions` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Update a single user's permissions
 * @route   PUT /api/admin/user/:id/permissions
 * @access  Private (Admin)
 */
export const updateUserPermissions = async (req, res) => {
    try {
        const { permissions } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { permissions },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Enroll a student in a specific subject
 * @route   POST /api/admin/student/:id/enroll
 * @access  Private (Admin)
 */
export const enrollSubject = async (req, res) => {
    try {
        const { subjectId, semester, year } = req.body;
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if already enrolled
        const alreadyEnrolled = user.enrolledSubjects?.some(es => es.subject.toString() === subjectId);
        if (alreadyEnrolled) {
            return res.status(400).json({ message: 'Student is already enrolled in this subject' });
        }

        if (!user.enrolledSubjects) {
            user.enrolledSubjects = [];
        }

        user.enrolledSubjects.push({ subject: subjectId, semester, year });
        await user.save();

        const updatedUser = await User.findById(user._id)
            .select('-password')
            .populate('departmentId')
            .populate('classId')
            .populate('enrolledSubjects.subject');

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateEnrolledSubject = async (req, res) => {
    try {
        const { id, subjectId } = req.params;
        const { semester, year } = req.body;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const subjectIndex = user.enrolledSubjects.findIndex(es => es.subject.toString() === subjectId);
        if (subjectIndex === -1) {
            return res.status(404).json({ message: 'Enrolled subject not found' });
        }

        if (semester) user.enrolledSubjects[subjectIndex].semester = semester;
        if (year) user.enrolledSubjects[subjectIndex].year = year;

        await user.save();

        const updatedUser = await User.findById(user._id)
            .select('-password')
            .populate('departmentId')
            .populate('classId')
            .populate('enrolledSubjects.subject');

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const removeEnrolledSubject = async (req, res) => {
    try {
        const { id, subjectId } = req.params;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const sid = subjectId.trim();
        user.enrolledSubjects = user.enrolledSubjects.filter(es => {
            const target = es.subject?._id ? es.subject._id.toString() : es.subject?.toString();
            return target !== sid;
        });
        await user.save();

        const updatedUser = await User.findById(user._id)
            .select('-password')
            .populate('departmentId')
            .populate('classId')
            .populate('enrolledSubjects.subject');

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateSubjectAllocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectId, teacherId, classId, timeSlot, dayOfWeek, startTime, endTime, roomNumber } = req.body;

        const allocation = await SubjectAllocation.findByIdAndUpdate(id, {
            subjectId,
            teacherId,
            classId,
            timeSlot,
            dayOfWeek,
            startTime,
            endTime,
            roomNumber
        }, { new: true });

        if (!allocation) {
            return res.status(404).json({ message: 'Allocation not found' });
        }
        res.json(allocation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteSubjectAllocation = async (req, res) => {
    try {
        const { id } = req.params;
        const allocation = await SubjectAllocation.findByIdAndDelete(id);
        if (!allocation) {
            return res.status(404).json({ message: 'Allocation not found' });
        }
        res.json({ message: 'Allocation removed successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getSubjects = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, d.name as department_name, d.code as department_code
            FROM subjects s
            LEFT JOIN departments d ON s.department_id = d.id
            ORDER BY s.name ASC
        `);
        const subjects = result.rows.map(s => ({
            _id: String(s.id),
            id: s.id,
            subjectName: s.name,
            name: s.name,
            departmentId: s.department_id ? {
                _id: String(s.department_id),
                id: s.department_id,
                departmentName: s.department_name,
                name: s.department_name
            } : null
        }));
        res.json(subjects);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
/**
 * @desc    Get system-wide activity logs and counts
 * @route   GET /api/admin/system-activity
 * @access  Private (Admin)
 */
export const getSystemActivity = async (req, res) => {
    try {
        const { departmentId, startDate, endDate, search } = req.query;

        // BUG-08 Fix: Was 'department' — correct field name is 'departmentId'
        const countFilter = departmentId ? { departmentId } : {};

        const studentCount = await User.countDocuments({ role: 'student', ...countFilter });
        const teacherCount = await User.countDocuments({ role: 'teacher', ...countFilter });
        const classCount = await Class.countDocuments(departmentId ? { departmentId } : {});

        // Detailed activity filter
        let activityFilter = {};
        if (startDate || endDate) {
            activityFilter.date = {};
            if (startDate) activityFilter.date.$gte = new Date(startDate);
            if (endDate) activityFilter.date.$lte = new Date(endDate);
        }

        if (departmentId) {
            // Need to find students in that department first
            const studentsInDept = await User.find({ departmentId, role: 'student' }).select('_id');
            const studentIds = studentsInDept.map(s => s._id);
            activityFilter.studentId = { $in: studentIds };
        }

        if (search) {
            const users = await User.find({ name: new RegExp(search, 'i') }).select('_id');
            const userIds = users.map(u => u._id);
            activityFilter.$or = [
                { studentId: { $in: userIds } },
                { teacherId: { $in: userIds } }
            ];
        }

        const recentActivity = await Attendance.find(activityFilter)
            .populate('studentId', 'name rollNumber')
            .populate('teacherId', 'name')
            .populate('subjectId', 'subjectName')
            .populate('classId', 'className')
            .sort({ date: -1, createdAt: -1 })
            .limit(50);

        res.json({
            counts: {
                students: studentCount,
                teachers: teacherCount,
                classes: classCount,
            },
            activity: recentActivity
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Get aggregate dashboard stats (counts, trend, recent activity)
 * @route   GET /api/admin/dashboard-stats
 * @access  Private (Admin)
 */
export const getDashboardStats = async (req, res) => {
    try {
        const { pool } = await import('../config/db.js');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

        // 1. Basic Counts
        const counts = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE role = 'student') AS students,
                COUNT(*) FILTER (WHERE role = 'teacher') AS teachers,
                COUNT(*) FILTER (WHERE role = 'parent') AS parents
            FROM users
        `);
        const deptCount = await pool.query(`SELECT COUNT(*) FROM departments`);
        const classCount = await pool.query(`SELECT COUNT(*) FROM classes`);
        const subjCount = await pool.query(`SELECT COUNT(*) FROM subjects`);

        // 2. Today's Attendance Summary (Students)
        const todayAtt = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'present') AS present,
                COUNT(*) FILTER (WHERE status = 'absent') AS absent,
                COUNT(*) FILTER (WHERE status = 'leave') AS leave,
                COUNT(*) AS total
            FROM attendance
            WHERE date >= $1 AND date < $2
        `, [today, tomorrow]);

        // 2b. Teacher attendance summary
        const teacherCount = parseInt(counts.rows[0].teachers) || 0;
        const teacherLeave = await pool.query(`
            SELECT COUNT(*) AS cnt FROM leave_requests
            WHERE role = 'teacher' AND status = 'approved'
              AND start_date <= $1 AND end_date >= $2
        `, [tomorrow, today]);
        const teacherPresent = await pool.query(`
            SELECT COUNT(DISTINCT marked_by) AS cnt FROM attendance
            WHERE date >= $1 AND date < $2
        `, [today, tomorrow]);

        const teacherOnLeaveCount = parseInt(teacherLeave.rows[0].cnt) || 0;
        const performingTeachers = parseInt(teacherPresent.rows[0].cnt) || 0;

        const teacherSummary = {
            present: performingTeachers,
            leave: teacherOnLeaveCount,
            absent: Math.max(0, teacherCount - performingTeachers - teacherOnLeaveCount),
            total: teacherCount
        };

        // 3. 7-Day Attendance Trend (Students)
        const trendRaw = await pool.query(`
            SELECT
                TO_CHAR(date, 'YYYY-MM-DD') AS "_id",
                COUNT(*) FILTER (WHERE status = 'present') AS present,
                COUNT(*) FILTER (WHERE status = 'absent') AS absent,
                COUNT(*) FILTER (WHERE status = 'leave') AS leave
            FROM attendance
            WHERE date >= $1 AND date < $2
            GROUP BY date ORDER BY date ASC
        `, [sevenDaysAgo, tomorrow]);

        // 3b. Teacher 7-day trend
        const teacherTrendRaw = await pool.query(`
            SELECT
                TO_CHAR(date, 'YYYY-MM-DD') AS "_id",
                COUNT(DISTINCT marked_by) AS present
            FROM attendance
            WHERE date >= $1 AND date < $2
            GROUP BY date ORDER BY date ASC
        `, [sevenDaysAgo, tomorrow]);

        // 4. Recent Activities (last 5 attendance records)
        const recentRaw = await pool.query(`
            SELECT a.*, u.name AS student_name, s.name AS subject_name
            FROM attendance a
            LEFT JOIN users u ON u.id = a.student_id
            LEFT JOIN subjects s ON s.id = a.subject_id
            ORDER BY a.created_at DESC LIMIT 5
        `);

        // 5. Teacher Performance (Top 5)
        const teacherPerf = await pool.query(`
            SELECT u.id AS _id, u.name, u.email, u.avatar,
                   d.name AS department,
                   COUNT(a.id) AS "markingCount"
            FROM attendance a
            JOIN users u ON u.id = a.marked_by
            LEFT JOIN departments d ON d.id = u.department_id
            GROUP BY u.id, u.name, u.email, u.avatar, d.name
            ORDER BY "markingCount" DESC LIMIT 5
        `);

        res.json({
            counts: {
                students: parseInt(counts.rows[0].students) || 0,
                teachers: teacherCount,
                parents: parseInt(counts.rows[0].parents) || 0,
                departments: parseInt(deptCount.rows[0].count) || 0,
                classes: parseInt(classCount.rows[0].count) || 0,
                subjects: parseInt(subjCount.rows[0].count) || 0,
            },
            todayAttendance: {
                present: parseInt(todayAtt.rows[0].present) || 0,
                absent: parseInt(todayAtt.rows[0].absent) || 0,
                leave: parseInt(todayAtt.rows[0].leave) || 0,
                total: parseInt(todayAtt.rows[0].total) || 0,
            },
            teacherAttendance: teacherSummary,
            trend: trendRaw.rows,
            teacherTrend: teacherTrendRaw.rows.map(r => ({ ...r, total: teacherCount })),
            recentActivities: recentRaw.rows,
            teacherPerformance: teacherPerf.rows,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update admin profile (name, email, password, avatar, cover)
 * @route   PUT /api/admin/profile
 * @access  Private (Admin)
 */
export const updateAdminProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.avatar = req.body.avatar || user.avatar;
            user.coverImage = req.body.coverImage || user.coverImage;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                avatar: updatedUser.avatar,
                coverImage: updatedUser.coverImage,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get system settings
 * @route   GET /api/admin/settings
 * @access  Private (Admin)
 */
export const getSystemSettings = async (req, res) => {
    try {
        const settings = await SystemSetting.find({});

        // Add environment fallback for universityEmail if not in DB
        const hasUniversityEmail = settings.some(s => s.key === 'universityEmail');
        if (!hasUniversityEmail) {
            settings.push({
                key: 'universityEmail',
                value: process.env.FROM_EMAIL || process.env.SMTP_EMAIL || '',
                description: 'System Default (from Environment)'
            });
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update system settings
 * @route   PUT /api/admin/settings
 * @access  Private (Admin)
 */
export const updateSystemSettings = async (req, res) => {
    try {
        const { settings } = req.body; // Array of { key, value }

        for (const item of settings) {
            await SystemSetting.findOneAndUpdate(
                { key: item.key },
                { value: item.value },
                { upsert: true }
            );
        }

        const updatedSettings = await SystemSetting.find({});
        res.json(updatedSettings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
