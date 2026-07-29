import pg from 'pg';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const getConnectionString = () => process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

const connectionString = getConnectionString();

// Neon DB PostgreSQL connection pool
export const pool = new pg.Pool({
    connectionString,
    ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')
        ? { rejectUnauthorized: false }
        : false
});

// Handle idle client errors gracefully to avoid server crashes
pool.on('error', (err) => {
    console.error('Unexpected error on idle Neon DB client:', err.message);
});

export const query = (text, params) => pool.query(text, params);

/**
 * Automatically initializes database schema tables for Neon DB PostgreSQL if they do not exist.
 */
export const initSchema = async () => {
    const createTablesSQL = `
        CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS classes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            department_id INTEGER,
            academic_year VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            department_id INTEGER,
            class_id INTEGER,
            section VARCHAR(50),
            roll_number VARCHAR(100),
            parent_id INTEGER,
            parent_email VARCHAR(255),
            permissions TEXT[],
            class_coordinator_for INTEGER,
            enrolled_subjects JSONB DEFAULT '[]'::jsonb,
            streak_count INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            last_attendance_date TIMESTAMP,
            avatar TEXT DEFAULT '',
            cover_image TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100),
            department_id INTEGER,
            semester VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subject_allocations (
            id SERIAL PRIMARY KEY,
            teacher_id INTEGER,
            subject_id INTEGER,
            class_id INTEGER,
            section VARCHAR(50),
            academic_year VARCHAR(50),
            day_of_week VARCHAR(50),
            time_slot VARCHAR(100),
            start_time VARCHAR(50),
            end_time VARCHAR(50),
            room_number VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE subject_allocations ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(50);
        ALTER TABLE subject_allocations ADD COLUMN IF NOT EXISTS time_slot VARCHAR(100);
        ALTER TABLE subject_allocations ADD COLUMN IF NOT EXISTS start_time VARCHAR(50);
        ALTER TABLE subject_allocations ADD COLUMN IF NOT EXISTS end_time VARCHAR(50);
        ALTER TABLE subject_allocations ADD COLUMN IF NOT EXISTS room_number VARCHAR(100);

        CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            student_id INTEGER,
            subject_id INTEGER,
            class_id INTEGER,
            date DATE,
            status VARCHAR(50),
            marked_by INTEGER,
            method VARCHAR(50),
            location JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS leave_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            role VARCHAR(50),
            leave_type VARCHAR(100),
            start_date DATE,
            end_date DATE,
            reason TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            document_url TEXT,
            reviewed_by INTEGER,
            rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            recipient_id INTEGER,
            title VARCHAR(255),
            message TEXT,
            type VARCHAR(50),
            is_read BOOLEAN DEFAULT false,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS quizzes (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            creator_id INTEGER,
            class_id INTEGER,
            subject_id INTEGER,
            questions JSONB DEFAULT '[]'::jsonb,
            total_marks INTEGER,
            duration_minutes INTEGER,
            type VARCHAR(50) DEFAULT 'practice',
            passing_score INTEGER DEFAULT 80,
            time_limit INTEGER DEFAULT 30,
            max_attempts INTEGER DEFAULT 3,
            difficulty VARCHAR(50) DEFAULT 'mixed',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'practice';
        ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 80;
        ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30;
        ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3;
        ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'mixed';

        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id SERIAL PRIMARY KEY,
            quiz_id INTEGER,
            student_id INTEGER,
            answers JSONB,
            score NUMERIC,
            total_marks NUMERIC,
            percentage NUMERIC,
            duration_seconds INTEGER DEFAULT 0,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

        CREATE TABLE IF NOT EXISTS certificates (
            id SERIAL PRIMARY KEY,
            quiz_id INTEGER,
            student_id INTEGER,
            certificate_id VARCHAR(100),
            certificate_type VARCHAR(100),
            percentage NUMERIC,
            issue_date DATE,
            details JSONB,
            certificate_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS quiz_id INTEGER;
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_id VARCHAR(100);
        ALTER TABLE certificates ADD COLUMN IF NOT EXISTS percentage NUMERIC;

        CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) UNIQUE NOT NULL,
            value JSONB,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS class_coordinators (
            id SERIAL PRIMARY KEY,
            teacher_id INTEGER,
            class_id INTEGER,
            academic_year VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS teacher_attendance (
            id SERIAL PRIMARY KEY,
            teacher_id INTEGER NOT NULL,
            date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'present',
            marked_by INTEGER,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_teacher_date UNIQUE(teacher_id, date)
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            recipient_id INTEGER NOT NULL,
            title VARCHAR(255),
            message TEXT,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT false,
            link TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTablesSQL);

        // Ensure Jane Teacher (teacher_id: 2 or role: teacher) is registered as Coordinator for CS101-A (class_id: 1)
        const checkCoord = await pool.query('SELECT * FROM class_coordinators WHERE teacher_id = 2');
        if (checkCoord.rows.length === 0) {
            await pool.query('INSERT INTO class_coordinators (teacher_id, class_id) VALUES (2, 1)');
        }
        await pool.query('UPDATE users SET class_coordinator_for = 1, department_id = 1 WHERE id = 2');

        console.log('Neon DB tables schema initialized successfully');
    } catch (err) {
        console.error('Error initializing Neon DB schema:', err.message);
    }
};

const connectDB = async () => {
    try {
        if (!connectionString) {
            console.warn('DATABASE_URL is missing in .env. Please set your Neon DB PostgreSQL connection string.');
            return;
        }
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        client.release();
        console.log(`Connected to Neon DB (PostgreSQL) successfully at: ${res.rows[0].now}`);
        await initSchema();
    } catch (error) {
        console.error(`Neon DB Connection Error: ${error.message}`);
    }
};

export default connectDB;
