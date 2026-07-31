import pg from 'pg';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const getConnectionString = () => {
    let conn = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (conn && conn.includes('-pooler.')) {
        conn = conn.replace('-pooler.', '.');
    }
    return conn;
};

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
            time_slot VARCHAR(100),
            status VARCHAR(50),
            marked_by INTEGER,
            method VARCHAR(50),
            location JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS time_slot VARCHAR(100);

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

        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

        CREATE TABLE IF NOT EXISTS assignments (
            id SERIAL PRIMARY KEY,
            class_id INTEGER,
            subject_id INTEGER,
            teacher_id INTEGER,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            due_date DATE,
            attachment_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS assignment_submissions (
            id SERIAL PRIMARY KEY,
            assignment_id INTEGER,
            student_id INTEGER,
            status VARCHAR(50) DEFAULT 'pending',
            submission_date TIMESTAMP,
            teacher_comments TEXT,
            grade VARCHAR(10)
        );

        CREATE TABLE IF NOT EXISTS fee_details (
            id SERIAL PRIMARY KEY,
            student_id INTEGER UNIQUE,
            total_amount NUMERIC(10,2) DEFAULT 45000.00,
            paid_amount NUMERIC(10,2) DEFAULT 30000.00,
            pending_amount NUMERIC(10,2) DEFAULT 15000.00,
            due_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days',
            status VARCHAR(50) DEFAULT 'partial'
        );

        CREATE TABLE IF NOT EXISTS fee_payments (
            id SERIAL PRIMARY KEY,
            student_id INTEGER,
            receipt_no VARCHAR(100),
            amount_paid NUMERIC(10,2),
            payment_method VARCHAR(50),
            payment_date DATE DEFAULT CURRENT_DATE,
            transaction_ref VARCHAR(100)
        );

        CREATE TABLE IF NOT EXISTS exam_schedules (
            id SERIAL PRIMARY KEY,
            class_id INTEGER,
            exam_name VARCHAR(100),
            subject_id INTEGER,
            exam_date DATE,
            time_slot VARCHAR(100),
            room_number VARCHAR(50),
            max_marks INTEGER DEFAULT 100
        );

        CREATE TABLE IF NOT EXISTS exam_results (
            id SERIAL PRIMARY KEY,
            exam_schedule_id INTEGER,
            student_id INTEGER,
            subject_id INTEGER,
            marks_obtained NUMERIC(5,2),
            grade VARCHAR(10),
            remarks TEXT
        );

        CREATE TABLE IF NOT EXISTS parent_messages (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            student_id INTEGER,
            subject VARCHAR(255),
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

        // Seed Fee Details for Student 5 (Jane Doe) and Student 3 (John Student) if not exists
        const checkFees = await pool.query('SELECT * FROM fee_details WHERE student_id IN (3, 5)');
        if (checkFees.rows.length === 0) {
            await pool.query(`
                INSERT INTO fee_details (student_id, total_amount, paid_amount, pending_amount, due_date, status)
                VALUES 
                    (5, 45000.00, 30000.00, 15000.00, CURRENT_DATE + INTERVAL '14 days', 'partial'),
                    (3, 45000.00, 45000.00, 0.00, CURRENT_DATE - INTERVAL '10 days', 'paid')
                ON CONFLICT (student_id) DO NOTHING;
            `);

            await pool.query(`
                INSERT INTO fee_payments (student_id, receipt_no, amount_paid, payment_method, payment_date, transaction_ref)
                VALUES 
                    (5, 'REC-2026-001', 30000.00, 'UPI', CURRENT_DATE - INTERVAL '30 days', 'TXN99881122'),
                    (3, 'REC-2026-002', 45000.00, 'NetBanking', CURRENT_DATE - INTERVAL '45 days', 'TXN88776655');
            `);
        }

        // Seed Sample Assignments if empty
        const checkAssignments = await pool.query('SELECT * FROM assignments LIMIT 1');
        if (checkAssignments.rows.length === 0) {
            await pool.query(`
                INSERT INTO assignments (class_id, subject_id, teacher_id, title, description, due_date, attachment_url)
                VALUES 
                    (1, 1, 2, 'Data Structures Trees & Graphs Project', 'Implement Binary Search Tree and Dijkstra Algorithm in Python.', CURRENT_DATE + INTERVAL '5 days', '/uploads/assignment_ds.pdf'),
                    (1, 2, 2, 'Database Normalization & SQL Triggers Worksheet', 'Solve 3NF normalization problem set and write PostgreSQL triggers.', CURRENT_DATE + INTERVAL '9 days', '/uploads/db_worksheet.pdf');
            `);
            
            await pool.query(`
                INSERT INTO assignment_submissions (assignment_id, student_id, status, submission_date, teacher_comments, grade)
                VALUES 
                    (1, 5, 'completed', CURRENT_DATE - INTERVAL '1 day', 'Excellent tree traversal implementation!', 'A+'),
                    (2, 5, 'pending', NULL, NULL, NULL),
                    (1, 3, 'completed', CURRENT_DATE - INTERVAL '2 days', 'Well structured SQL functions.', 'A');
            `);
        }

        // Seed Sample Exam Schedules and Exam Results if empty
        const checkExams = await pool.query('SELECT * FROM exam_schedules LIMIT 1');
        if (checkExams.rows.length === 0) {
            await pool.query(`
                INSERT INTO exam_schedules (class_id, exam_name, subject_id, exam_date, time_slot, room_number, max_marks)
                VALUES 
                    (1, 'Mid-Term Examination 2026', 1, CURRENT_DATE - INTERVAL '15 days', '10:00 AM - 12:00 PM', 'Lab 301', 100),
                    (1, 'Mid-Term Examination 2026', 2, CURRENT_DATE - INTERVAL '13 days', '02:00 PM - 04:00 PM', 'Lab 302', 100),
                    (1, 'Final Semester Examination 2026', 1, CURRENT_DATE + INTERVAL '20 days', '10:00 AM - 01:00 PM', 'Auditorium A', 100);
            `);

            await pool.query(`
                INSERT INTO exam_results (exam_schedule_id, student_id, subject_id, marks_obtained, grade, remarks)
                VALUES 
                    (1, 5, 1, 92.50, 'A+', 'Outstanding performance in algorithms'),
                    (2, 5, 2, 88.00, 'A', 'Strong SQL optimization skills'),
                    (1, 3, 1, 85.00, 'A', 'Good conceptual clarity'),
                    (2, 3, 2, 90.00, 'A+', 'Perfect database design');
            `);
        }

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
