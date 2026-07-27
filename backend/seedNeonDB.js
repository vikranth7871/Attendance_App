import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool, initSchema } from './config/db.js';

dotenv.config();

const seedUsers = async () => {
    try {
        await initSchema();

        const defaultUsers = [
            {
                name: 'System Admin',
                email: 'admin@example.com',
                password: 'admin123',
                role: 'admin',
                permissions: ['manageSystem', 'manageStudents', 'viewReports', 'markAttendance', 'manualAttendance', 'editAttendance']
            },
            {
                name: 'Jane Teacher',
                email: 'teacher@example.com',
                password: 'teacher123',
                role: 'teacher',
                permissions: ['markAttendance', 'manualAttendance', 'viewAttendance']
            },
            {
                name: 'John Student',
                email: 'student@example.com',
                password: 'student123',
                role: 'student',
                rollNumber: 'STU001',
                permissions: ['viewAttendance', 'applyLeave']
            }
        ];

        for (const user of defaultUsers) {
            const existing = await pool.query('SELECT * FROM users WHERE email = $1', [user.email]);
            if (existing.rows.length === 0) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await pool.query(
                    `INSERT INTO users (name, email, password, role, permissions, roll_number) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        user.name,
                        user.email,
                        hashedPassword,
                        user.role,
                        user.permissions,
                        user.rollNumber || null
                    ]
                );
                console.log(`Seeded user: ${user.email} (${user.role})`);
            } else {
                console.log(`User already exists: ${user.email}`);
            }
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err.message);
        process.exit(1);
    }
};

seedUsers();
