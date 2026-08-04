import { pool } from './config/db.js';
import bcrypt from 'bcryptjs';

async function resetPasswords() {
    try {
        const passwordMap = {
            'admin@example.com': 'admin123',
            'teacher@example.com': 'teacher123',
            'velsami@gmail.com': 'teacher123',
            'student@example.com': 'student123',
            'parent@example.com': 'parent123'
        };

        for (const [email, pwd] of Object.entries(passwordMap)) {
            const hashed = await bcrypt.hash(pwd, 10);
            const upd = await pool.query("UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2) RETURNING id, name, email", [hashed, email]);
            if (upd.rows.length > 0) {
                console.log(`✅ Updated password for ${email} (${upd.rows[0].name}) -> ${pwd}`);
            }
        }

        const teachers = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'teacher' ORDER BY id ASC");
        console.log('\n📋 Active Teacher Accounts in Database:');
        teachers.rows.forEach(t => console.log(`- ${t.name} (${t.email})`));

        process.exit(0);
    } catch (e) {
        console.error('Error resetting passwords:', e.message);
        process.exit(1);
    }
}

resetPasswords();
