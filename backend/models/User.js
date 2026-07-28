import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

class User {
    constructor(data) {
        if (!data) return;
        this._id = data.id;
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role;
        this.departmentId = data.department_id;
        this.classId = data.class_id;
        this.section = data.section;
        this.rollNumber = data.roll_number;
        this.parentId = data.parent_id;
        this.parentEmail = data.parent_email;
        this.permissions = data.permissions || [];
        this.classCoordinatorFor = data.class_coordinator_for;
        this.enrolledSubjects = data.enrolled_subjects || [];
        this.streakCount = data.streak_count || 0;
        this.bestStreak = data.best_streak || 0;
        this.lastAttendanceDate = data.last_attendance_date;
        this.avatar = data.avatar || '';
        this.coverImage = data.cover_image || '';
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    async matchPassword(enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
    }

    static find(query = {}) {
        const promise = (async () => {
            let sql = `
                SELECT u.*, 
                       d.name as department_name, d.code as department_code,
                       c.name as class_name
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                LEFT JOIN classes c ON u.class_id = c.id
            `;
            const keys = Object.keys(query).filter(k => query[k] !== undefined && query[k] !== null && query[k] !== '');
            const params = [];

            if (keys.length > 0) {
                sql += ' WHERE ' + keys.map((key, idx) => {
                    let col = key;
                    if (key === 'departmentId') col = 'u.department_id';
                    else if (key === 'classId') col = 'u.class_id';
                    else if (key === 'role') col = 'u.role';
                    else col = `u.${key}`;
                    params.push(query[key]);
                    return `${col} = $${idx + 1}`;
                }).join(' AND ');
            }

            sql += ' ORDER BY u.id DESC';
            const res = await pool.query(sql, params);

            return res.rows.map(row => {
                const user = new User(row);
                if (row.department_id) {
                    user.departmentId = {
                        _id: String(row.department_id),
                        id: row.department_id,
                        name: row.department_name,
                        departmentName: row.department_name,
                        code: row.department_code
                    };
                }
                if (row.class_id) {
                    user.classId = {
                        _id: String(row.class_id),
                        id: row.class_id,
                        name: row.class_name,
                        className: row.class_name
                    };
                }
                return user;
            });
        })();

        promise.select = function() { return this; };
        promise.populate = function() { return this; };
        return promise;
    }

    static findOne(query) {
        const promise = (async () => {
            let sql = 'SELECT * FROM users WHERE ';
            const keys = Object.keys(query);
            const params = [];

            sql += keys.map((key, idx) => {
                const col = key === 'parentEmail' ? 'parent_email' : key;
                params.push(query[key]);
                return `${col} = $${idx + 1}`;
            }).join(' AND ');

            sql += ' LIMIT 1';
            const res = await pool.query(sql, params);
            if (res.rows.length === 0) return null;
            return new User(res.rows[0]);
        })();

        promise.select = function() { return this; };
        promise.populate = function() { return this; };
        return promise;
    }

    static async findById(id) {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (res.rows.length === 0) return null;
        const user = new User(res.rows[0]);
        user.select = function() { return this; };
        user.populate = function() { return this; };
        return user;
    }

    static async create(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const res = await pool.query(
            `INSERT INTO users (name, email, password, role, permissions, roll_number, department_id, class_id, section, parent_email, parent_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                userData.name,
                userData.email,
                hashedPassword,
                userData.role.toLowerCase(),
                userData.permissions || [],
                userData.rollNumber || null,
                userData.departmentId || null,
                userData.classId || null,
                userData.section || null,
                userData.parentEmail || null,
                userData.parentId || null
            ]
        );
        return new User(res.rows[0]);
    }
}

export default User;
