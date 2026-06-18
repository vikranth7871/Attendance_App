import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import coordinatorRoutes from './routes/coordinatorRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import runWeeklyJob from './jobs/weeklyReportJob.js';

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) : [])
    : ['http://localhost:5173', 'http://localhost:8081', 'http://localhost:19006'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/quiz', quizRoutes);

// Start Cron Jobs
runWeeklyJob();

app.get('/api', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running on port ${PORT}`));
