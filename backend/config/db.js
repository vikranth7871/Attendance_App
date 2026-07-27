import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

// Neon DB PostgreSQL connection pool
export const pool = new pg.Pool({
    connectionString,
    ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')
        ? { rejectUnauthorized: false }
        : false
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

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
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id SERIAL PRIMARY KEY,
            quiz_id INTEGER,
            student_id INTEGER,
            answers JSONB,
            score NUMERIC,
            total_marks NUMERIC,
            percentage NUMERIC,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS certificates (
            id SERIAL PRIMARY KEY,
            student_id INTEGER,
            certificate_type VARCHAR(100),
            issue_date DATE,
            details JSONB,
            certificate_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) UNIQUE NOT NULL,
            value JSONB,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTablesSQL);
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
