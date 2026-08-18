import { pool } from '../config/db.js';

export const globalSearch = async (req, res) => {
    try {
        const { q, type } = req.query;
        if (!q || !q.trim()) return res.status(400).json({ message: 'Search query is required' });

        const searchPattern = `%${q.trim()}%`;
        const results = {
            students: [],
            teachers: [],
            classes: [],
            subjects: [],
            departments: []
        };

        // 1. Students
        if (!type || type === 'student') {
            const studentsRes = await pool.query(`
                SELECT u.id, u.name, u.email, u.roll_number as "rollNumber",
                       c.class_name as "className", c.section,
                       d.department_name as "departmentName"
                FROM users u
                LEFT JOIN classes c ON u.class_id = c.id
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.role = 'student'
                  AND (u.name ILIKE $1 OR u.email ILIKE $1 OR u.roll_number ILIKE $1 OR d.department_name ILIKE $1 OR c.class_name ILIKE $1)
                ORDER BY u.name ASC
                LIMIT 6
            `, [searchPattern]);
            results.students = studentsRes.rows;
        }

        // 2. Teachers
        if (!type || type === 'teacher') {
            const teachersRes = await pool.query(`
                SELECT u.id, u.name, u.email,
                       d.department_name as "departmentName"
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.role = 'teacher'
                  AND (u.name ILIKE $1 OR u.email ILIKE $1 OR d.department_name ILIKE $1)
                ORDER BY u.name ASC
                LIMIT 6
            `, [searchPattern]);
            results.teachers = teachersRes.rows;
        }

        // 3. Classes
        if (!type || type === 'class') {
            const classesRes = await pool.query(`
                SELECT c.id, c.class_name as "className", c.section,
                       d.department_name as "departmentName"
                FROM classes c
                LEFT JOIN departments d ON c.department_id = d.id
                WHERE c.class_name ILIKE $1 OR c.section ILIKE $1 OR d.department_name ILIKE $1
                ORDER BY c.class_name ASC
                LIMIT 6
            `, [searchPattern]);
            results.classes = classesRes.rows;
        }

        // 4. Subjects
        if (!type || type === 'subject') {
            const subjectsRes = await pool.query(`
                SELECT s.id, s.subject_name as "subjectName", s.subject_code as "subjectCode",
                       d.department_name as "departmentName"
                FROM subjects s
                LEFT JOIN departments d ON s.department_id = d.id
                WHERE s.subject_name ILIKE $1 OR s.subject_code ILIKE $1 OR d.department_name ILIKE $1
                ORDER BY s.subject_name ASC
                LIMIT 6
            `, [searchPattern]);
            results.subjects = subjectsRes.rows;
        }

        // 5. Departments
        if (!type || type === 'department') {
            const deptRes = await pool.query(`
                SELECT d.id, d.department_name as "departmentName", d.code
                FROM departments d
                WHERE d.department_name ILIKE $1 OR d.code ILIKE $1
                ORDER BY d.department_name ASC
                LIMIT 6
            `, [searchPattern]);
            results.departments = deptRes.rows;
        }

        res.json(results);
    } catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({ message: error.message });
    }
};

