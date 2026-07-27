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

    static async findOne(query) {
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
            `INSERT INTO users (name, email, password, role, permissions, roll_number) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                userData.name,
                userData.email,
                hashedPassword,
                userData.role,
                userData.permissions || [],
                userData.rollNumber || null
            ]
        );
        return new User(res.rows[0]);
    }
}

export default User;
