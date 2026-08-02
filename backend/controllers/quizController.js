import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool } from '../config/db.js';
import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Certificate from '../models/Certificate.js';
import User from '../models/User.js';

/* ─────────────────────────────────────────────────────────────
   Helper: Generate unique certificate ID
   Format: CERT-YYYY-XXXXXXX (7 alphanumeric chars)
───────────────────────────────────────────────────────────── */
const generateCertificateId = () => {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 7; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CERT-${year}-${random}`;
};

/* ─────────────────────────────────────────────────────────────
   Array Shuffler (Fisher-Yates Shuffle)
───────────────────────────────────────────────────────────── */
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/* ─────────────────────────────────────────────────────────────
   Fallback Quiz Generator (when GEMINI_API_KEY is not configured)
───────────────────────────────────────────────────────────── */
const generateFallbackQuestions = ({ subject, syllabus, count = 10, difficulty = 'mixed' }) => {
    const qCount = parseInt(count, 10) || 10;
    const questions = [];
    const subjName = subject || 'General Subject';

    const templates = [
        {
            q: `What is the primary role of ${subjName} in modern computing systems?`,
            opts: [
                { text: `Providing structured protocols and computational frameworks`, isCorrect: true },
                { text: `Replacing physical hardware components`, isCorrect: false },
                { text: `Bypassing standard security controls`, isCorrect: false },
                { text: `Eliminating latency completely`, isCorrect: false }
            ],
            exp: `${subjName} defines core standards and algorithmic models for efficient execution.`
        },
        {
            q: `Which layer or architecture concept is most fundamental to ${subjName}?`,
            opts: [
                { text: `Modular abstraction and standardized interface contracts`, isCorrect: true },
                { text: `Direct assembly instruction mapping`, isCorrect: false },
                { text: `Unencrypted plain-text communication`, isCorrect: false },
                { text: `Single-threaded execution constraint`, isCorrect: false }
            ],
            exp: `Abstraction allows modular development and interoperability in ${subjName}.`
        },
        {
            q: `In ${subjName}${syllabus ? ` (${syllabus.slice(0, 35)}...)` : ''}, what is the main purpose of validation and error handling?`,
            opts: [
                { text: `Ensuring data integrity and preventing system failures`, isCorrect: true },
                { text: `Increasing unnecessary memory consumption`, isCorrect: false },
                { text: `Slowing down execution cycles`, isCorrect: false },
                { text: `Restricting user access permissions`, isCorrect: false }
            ],
            exp: `Validation and verification guarantee robustness and system stability.`
        },
        {
            q: `Which metric is commonly evaluated when analyzing ${subjName} performance?`,
            opts: [
                { text: `Throughput, latency, and resource utilization efficiency`, isCorrect: true },
                { text: `Display monitor refresh rate`, isCorrect: false },
                { text: `File storage size on disk only`, isCorrect: false },
                { text: `Keyboard typing speed`, isCorrect: false }
            ],
            exp: `Performance metrics quantify execution speed, throughput, and efficiency.`
        },
        {
            q: `What best practice is recommended when engineering solutions in ${subjName}?`,
            opts: [
                { text: `Adhering to separation of concerns and security principles`, isCorrect: true },
                { text: `Hardcoding dynamic parameters in main routines`, isCorrect: false },
                { text: `Ignoring boundary cases and edge inputs`, isCorrect: false },
                { text: `Disabling system logging`, isCorrect: false }
            ],
            exp: `Clean architectural boundaries enhance maintainability, security, and scalability.`
        }
    ];

    for (let i = 0; i < qCount; i++) {
        const tpl = templates[i % templates.length];
        const diff = difficulty === 'mixed' ? (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard') : difficulty;
        
        // Shuffle options so correct answer is randomly placed across A, B, C, D
        const shuffledOpts = shuffleArray(tpl.opts).map((o, idx) => ({
            _id: `opt_${i}_${idx}`,
            text: o.text,
            isCorrect: o.isCorrect
        }));

        questions.push({
            questionText: i >= templates.length ? `[Question ${i + 1}] Select the correct core principle regarding ${subjName}.` : tpl.q,
            options: shuffledOpts,
            explanation: tpl.exp,
            difficulty: diff,
            aiGenerated: true
        });
    }

    return questions;
};

/* ─────────────────────────────────────────────────────────────
   AI Quiz Generation via Google Gemini
───────────────────────────────────────────────────────────── */
const generateQuestionsWithAI = async ({ subject, syllabus, count = 10, difficulty = 'mixed', promptBox, tags, imageBuffer, mimeType }) => {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_') || process.env.GEMINI_API_KEY.trim() === '') {
        console.warn(`[AI Generator] GEMINI_API_KEY is not set in backend/.env. Using fallback generator for "${subject}".`);
        return generateFallbackQuestions({ subject, syllabus, count, difficulty });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const difficultyInstruction = difficulty === 'mixed'
            ? 'Mix the difficulty: roughly 30% easy, 40% medium, 30% hard.'
            : `All questions should be ${difficulty} difficulty.`;

        const prompt = `You are an expert educational quiz generator for university students.

Generate exactly ${count} multiple-choice questions about "${subject}".
${syllabus ? `Base the questions on this syllabus/topics:\n${syllabus}` : ''}
${promptBox ? `\nAdditional Instructions from User:\n${promptBox}` : ''}
${tags && tags.length > 0 ? `\nTags / Focus Areas:\n${tags.join(', ')}` : ''}

Requirements:
- Each question must have exactly 4 answer options
- Only ONE option should be correct (isCorrect: true)
- Randomize the placement of the correct answer across options A, B, C, and D
- Include a clear, concise explanation for why the correct answer is right
- ${difficultyInstruction}
- Questions should test conceptual understanding, not just facts
- Make questions practical and relevant to university-level study
- Avoid ambiguous or trick questions

Return ONLY a valid JSON array. No markdown, no code blocks, just the raw JSON array:
[
  {
    "questionText": "Your question here?",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "explanation": "Brief explanation of why Option B is correct.",
    "difficulty": "easy|medium|hard"
  }
]`;

        const parts = [prompt];
        
        if (imageBuffer && mimeType) {
            parts.push({
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType
                }
            });
        }

        const result = await model.generateContent(parts);
        const text = result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('AI returned an invalid response. Please try again.');
        }

        const questions = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('AI returned no questions. Please try again.');
        }

        return questions.map(q => ({
            ...q,
            options: shuffleArray(q.options || []),
            aiGenerated: true
        }));
    } catch (error) {
        console.error('[AI Generator Error]:', error.message);
        console.warn(`[AI Generator] Falling back to structured question generator for "${subject}".`);
        return generateFallbackQuestions({ subject, syllabus, count, difficulty });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Generate AI questions (preview before saving)
   @route  POST /api/quiz/generate-ai
   @access Admin, Teacher
───────────────────────────────────────────────────────────── */
export const generateAIQuestions = async (req, res) => {
    try {
        const { subject, syllabus, count = 10, difficulty = 'mixed', promptBox } = req.body;
        
        // Tags might be sent as a stringified array if FormData is used
        let tags = [];
        if (req.body.tags) {
            try {
                tags = JSON.parse(req.body.tags);
            } catch (e) {
                tags = Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags];
            }
        }

        if (!subject) {
            return res.status(400).json({ message: 'Subject name is required for AI generation.' });
        }

        const imageBuffer = req.file ? req.file.buffer : null;
        const mimeType = req.file ? req.file.mimetype : null;

        const questions = await generateQuestionsWithAI({ 
            subject, syllabus, count: Math.min(count, 20), difficulty, promptBox, tags, imageBuffer, mimeType 
        });
        res.json({ questions, count: questions.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Create a new quiz
   @route  POST /api/quiz/create
   @access Admin, Teacher
───────────────────────────────────────────────────────────── */
export const createQuiz = async (req, res) => {
    try {
        const {
            title, description, type, subjectId,
            questions, timeLimit, passingScore, maxAttempts, difficulty,
            generateWithAI, aiSubject, aiCount
        } = req.body;

        const userId = req.user.id || req.user._id;
        let finalQuestions = questions || [];

        if (generateWithAI && finalQuestions.length === 0) {
            const subjectLabel = aiSubject || title;
            finalQuestions = await generateQuestionsWithAI({
                subject: subjectLabel,
                count: aiCount || 10,
                difficulty: difficulty || 'mixed'
            });
        }

        if (!finalQuestions || finalQuestions.length === 0) {
            return res.status(400).json({ message: 'A quiz must have at least one question.' });
        }

        const result = await pool.query(
            `INSERT INTO quizzes 
             (title, description, type, subject_id, creator_id, questions, time_limit, passing_score, max_attempts, difficulty, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false) RETURNING *`,
            [
                title,
                description || null,
                type || 'practice',
                subjectId || null,
                userId,
                JSON.stringify(finalQuestions),
                timeLimit || 30,
                passingScore || 80,
                maxAttempts || 1,
                difficulty || 'mixed'
            ]
        );

        const q = result.rows[0];
        res.status(201).json({
            message: 'Quiz created successfully',
            quiz: {
                _id: String(q.id),
                id: q.id,
                title: q.title,
                description: q.description,
                isPublished: q.is_active,
                questions: q.questions
            }
        });
    } catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Publish / unpublish a quiz
   @route  PUT /api/quiz/:id/publish
   @access Admin, Teacher
───────────────────────────────────────────────────────────── */
export const togglePublishQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE quizzes SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        const quiz = result.rows[0];

        // ── Send notifications to ALL students when quiz is published ──
        if (quiz.is_active) {
            try {
                const allStudents = await pool.query(
                    `SELECT id, name FROM users WHERE role = 'student'`
                );

                const quizType = quiz.type === 'university' ? '🎓 University Quiz' : '📝 Practice Quiz';
                const title = `${quizType} Available: ${quiz.title}`;
                const message = `A new quiz "${quiz.title}" has been published. Head to Quiz Arena to attempt it!`;

                await Promise.all(allStudents.rows.map(student =>
                    pool.query(
                        `INSERT INTO notifications (recipient_id, title, message, type, link)
                         VALUES ($1, $2, $3, 'info', '/student/quiz')`,
                        [student.id, title, message]
                    )
                ));

                console.log(`[Quiz Publish] Sent notifications to ${allStudents.rows.length} students for quiz "${quiz.title}"`);
            } catch (notifErr) {
                console.error('[Quiz Publish] Non-blocking notification error:', notifErr.message);
            }
        }

        res.json({
            message: `Quiz ${quiz.is_active ? 'published' : 'unpublished'} successfully`,
            isPublished: quiz.is_active
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Get all published quizzes (for students)
   @route  GET /api/quiz
   @access Student, Teacher, Admin
───────────────────────────────────────────────────────────── */
export const getQuizzes = async (req, res) => {
    try {
        const student = req.user;
        const studentId = student.id || student._id;
        const { type } = req.query;

        let sql = `
            SELECT q.*, s.name as subject_name, u.name as creator_name
            FROM quizzes q
            LEFT JOIN subjects s ON q.subject_id = s.id
            LEFT JOIN users u ON q.creator_id = u.id
            WHERE (q.is_active = true OR q.is_active IS NULL)
        `;
        const params = [];

        if (type) {
            params.push(type);
            sql += ` AND (q.type = $${params.length} OR ($${params.length} = 'university' AND (q.type = 'university' OR q.type = 'official')) OR ($${params.length} = 'practice' AND (q.type = 'practice' OR q.type IS NULL)))`;
        }

        sql += ' ORDER BY q.id DESC';

        const result = await pool.query(sql, params);

        const quizzesWithAttempts = await Promise.all(result.rows.map(async (q) => {
            const attemptsRes = await pool.query(
                `SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2 ORDER BY percentage DESC LIMIT 1`,
                [q.id, studentId]
            );
            const totalAttemptsRes = await pool.query(
                `SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2`,
                [q.id, studentId]
            );

            const totalAttempts = parseInt(totalAttemptsRes.rows[0]?.count || 0, 10);
            const bestAttempt = attemptsRes.rows[0] || null;
            const maxAttempts = q.max_attempts || 3;
            const passingScore = q.passing_score || 80;
            const questions = Array.isArray(q.questions) ? q.questions : [];

            return {
                _id: String(q.id),
                id: q.id,
                title: q.title,
                description: q.description || '',
                type: q.type || 'practice',
                subjectId: q.subject_id ? { _id: String(q.subject_id), id: q.subject_id, subjectName: q.subject_name } : null,
                createdBy: { _id: String(q.creator_id), name: q.creator_name },
                timeLimit: q.time_limit || 30,
                passingScore,
                isPublished: q.is_active ?? true,
                maxAttempts,
                studentAttempts: totalAttempts,
                bestScore: bestAttempt ? parseFloat(bestAttempt.percentage) : null,
                hasPassed: bestAttempt ? parseFloat(bestAttempt.percentage) >= passingScore : false,
                canAttempt: totalAttempts < maxAttempts,
                questionCount: questions.length,
                questions: questions.map(question => ({
                    ...question,
                    options: (question.options || []).map(opt => ({ text: opt.text, _id: opt._id }))
                }))
            };
        }));

        res.json(quizzesWithAttempts);
    } catch (error) {
        console.error('Error fetching student quizzes:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Get all quizzes for admin/teacher management
   @route  GET /api/quiz/manage
   @access Admin, Teacher
───────────────────────────────────────────────────────────── */
export const getManageQuizzes = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        let sql = `
            SELECT q.*, s.name as subject_name, u.name as creator_name
            FROM quizzes q
            LEFT JOIN subjects s ON q.subject_id = s.id
            LEFT JOIN users u ON q.creator_id = u.id
        `;
        const params = [];
        if (req.user.role === 'teacher') {
            sql += ' WHERE q.creator_id = $1';
            params.push(userId);
        }
        sql += ' ORDER BY q.id DESC';

        const result = await pool.query(sql, params);
        const quizzes = result.rows.map(q => ({
            _id: String(q.id),
            id: q.id,
            title: q.title,
            description: q.description,
            isPublished: q.is_active ?? true,
            type: q.type || 'practice',
            subjectId: q.subject_id ? { _id: String(q.subject_id), id: q.subject_id, subjectName: q.subject_name } : null,
            createdBy: { _id: String(q.creator_id), name: q.creator_name },
            totalAttempts: 0,
            questionCount: Array.isArray(q.questions) ? q.questions.length : 0,
            questions: q.questions || []
        }));

        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching manage quizzes:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Get a single quiz by ID (correct answers hidden for students)
   @route  GET /api/quiz/:id
   @access Authenticated
───────────────────────────────────────────────────────────── */
export const getQuizById = async (req, res) => {
    try {
        const quizId = parseInt(req.params.id, 10) || req.params.id;
        const studentId = req.user.id || req.user._id;

        const result = await pool.query(`
            SELECT q.*, s.name as subject_name, u.name as creator_name
            FROM quizzes q
            LEFT JOIN subjects s ON q.subject_id = s.id
            LEFT JOIN users u ON q.creator_id = u.id
            WHERE q.id = $1
        `, [quizId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        const q = result.rows[0];
        const maxAttempts = q.max_attempts || 3;
        const questions = Array.isArray(q.questions) ? q.questions : [];

        if (req.user.role === 'student') {
            const countRes = await pool.query(
                `SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2`,
                [q.id, studentId]
            );
            const attemptCount = parseInt(countRes.rows[0]?.count || 0, 10);

            if (q.is_active === false) {
                return res.status(403).json({ message: 'This quiz is not available yet.' });
            }

            const strippedQuestions = questions.map(question => ({
                ...question,
                options: (question.options || []).map(o => ({ text: o.text, _id: o._id })),
                explanation: undefined
            }));

            return res.json({
                _id: String(q.id),
                id: q.id,
                title: q.title,
                description: q.description || '',
                type: q.type || 'practice',
                subjectId: q.subject_id ? { _id: String(q.subject_id), id: q.subject_id, subjectName: q.subject_name } : null,
                createdBy: { _id: String(q.creator_id), name: q.creator_name },
                timeLimit: q.time_limit || 30,
                passingScore: q.passing_score || 80,
                isPublished: q.is_active ?? true,
                maxAttempts,
                questions: strippedQuestions,
                studentAttempts: attemptCount,
                canAttempt: attemptCount < maxAttempts
            });
        }

        res.json({
            _id: String(q.id),
            id: q.id,
            title: q.title,
            description: q.description || '',
            type: q.type || 'practice',
            subjectId: q.subject_id ? { _id: String(q.subject_id), id: q.subject_id, subjectName: q.subject_name } : null,
            createdBy: { _id: String(q.creator_id), name: q.creator_name },
            timeLimit: q.time_limit || 30,
            passingScore: q.passing_score || 80,
            isPublished: q.is_active ?? true,
            maxAttempts,
            questions
        });
    } catch (error) {
        console.error('Error in getQuizById:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Submit a quiz attempt and get results
   @route  POST /api/quiz/:id/attempt
   @access Student
───────────────────────────────────────────────────────────── */
export const submitAttempt = async (req, res) => {
    try {
        const { answers, timeTaken } = req.body;
        const quizId = parseInt(req.params.id, 10) || req.params.id;
        const studentId = req.user.id || req.user._id;

        const qRes = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
        if (qRes.rows.length === 0) return res.status(404).json({ message: 'Quiz not found' });
        const quiz = qRes.rows[0];

        if (quiz.is_active === false) return res.status(403).json({ message: 'This quiz is not active.' });

        const maxAttempts = quiz.max_attempts || 3;
        const prevRes = await pool.query(
            'SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
            [quizId, studentId]
        );
        const prevAttempts = parseInt(prevRes.rows[0]?.count || 0, 10);

        if (prevAttempts >= maxAttempts) {
            return res.status(403).json({ message: `Maximum ${maxAttempts} attempts reached for this quiz.` });
        }

        let correct = 0;
        const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
        const gradedAnswers = [];

        questions.forEach((question, idx) => {
            const answer = (answers || []).find(a => a.questionIndex === idx);
            const selectedOption = answer ? answer.selectedOption : -1;
            const correctOptionIndex = (question.options || []).findIndex(o => o.isCorrect);
            const isCorrect = selectedOption === correctOptionIndex;

            if (isCorrect) correct++;

            gradedAnswers.push({
                questionIndex: idx,
                selectedOption,
                correctOption: correctOptionIndex,
                isCorrect,
                questionText: question.questionText,
                explanation: question.explanation || '',
                options: (question.options || []).map(o => o.text)
            });
        });

        const total = questions.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        const passingScore = quiz.passing_score || 80;
        const passed = percentage >= passingScore;

        const durationSecs = parseInt(timeTaken, 10) || 0;

        const attemptRes = await pool.query(
            `INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, total_marks, percentage, duration_seconds)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [quizId, studentId, JSON.stringify(answers || []), correct, total, percentage, durationSecs]
        );
        const attempt = attemptRes.rows[0];

        let certificate = null;
        if ((quiz.type === 'university' || quiz.type === 'official') && passed) {
            const certRes = await pool.query(
                'SELECT * FROM certificates WHERE quiz_id = $1 AND student_id = $2 LIMIT 1',
                [quizId, studentId]
            );

            if (certRes.rows.length === 0) {
                const certId = generateCertificateId();
                const subjRes = await pool.query('SELECT name FROM subjects WHERE id = $1', [quiz.subject_id]);
                const subjectName = subjRes.rows[0]?.name || '';

                const newCert = await pool.query(
                    `INSERT INTO certificates (quiz_id, student_id, certificate_id, certificate_type, percentage, issue_date, details)
                     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6) RETURNING *`,
                    [
                        quizId,
                        studentId,
                        certId,
                        'Merit Certificate',
                        percentage,
                        JSON.stringify({ studentName: req.user.name, quizTitle: quiz.title, subjectName })
                    ]
                );
                certificate = newCert.rows[0];
            } else {
                certificate = certRes.rows[0];
            }
        }

        res.json({
            attemptId: String(attempt.id),
            score: correct,
            totalQuestions: total,
            percentage,
            passed,
            timeTaken: durationSecs,
            gradedAnswers,
            certificate,
            message: passed ? 'Congratulations! You passed the quiz.' : 'Quiz completed. Keep practicing!'
        });
    } catch (error) {
        console.error('Error submitting quiz attempt:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Get leaderboard for a quiz
   @route  GET /api/quiz/:id/leaderboard
   @access Authenticated
───────────────────────────────────────────────────────────── */
export const getLeaderboard = async (req, res) => {
    try {
        const quizId = req.params.id;
        const currentUserId = req.user.id || req.user._id;

        const result = await pool.query(`
            SELECT qa.*, u.name as student_name, u.roll_number
            FROM quiz_attempts qa
            LEFT JOIN users u ON u.id = qa.student_id
            WHERE qa.quiz_id = $1
            ORDER BY qa.student_id, qa.created_at ASC
        `, [quizId]);

        // Calculate attempt number per student chronologically
        const studentAttemptCounts = {};
        const rowsWithAttemptNum = result.rows.map(row => {
            const sId = String(row.student_id);
            studentAttemptCounts[sId] = (studentAttemptCounts[sId] || 0) + 1;
            return {
                ...row,
                attemptNumber: studentAttemptCounts[sId]
            };
        });

        // Sort by percentage DESC, duration ASC for ranking
        rowsWithAttemptNum.sort((a, b) => {
            if (parseFloat(b.percentage) !== parseFloat(a.percentage)) {
                return parseFloat(b.percentage) - parseFloat(a.percentage);
            }
            const secsA = parseInt(a.duration_seconds || a.duration || 0, 10);
            const secsB = parseInt(b.duration_seconds || b.duration || 0, 10);
            return secsA - secsB;
        });

        const leaderboard = rowsWithAttemptNum.map((row, idx) => {
            const secs = parseInt(row.duration_seconds || row.duration || 0, 10);
            return {
                attemptId: String(row.id),
                studentId: String(row.student_id),
                name: row.student_name || 'Student',
                rollNumber: row.roll_number || '-',
                percentage: parseFloat(row.percentage) || 0,
                score: row.score || 0,
                timeTaken: secs,
                duration_seconds: secs,
                attemptNumber: row.attemptNumber || 1,
                createdAt: row.created_at,
                rank: idx + 1
            };
        });

        const myRankIdx = leaderboard.findIndex(e => e.studentId === String(currentUserId));

        res.json({
            leaderboard,
            myRank: myRankIdx >= 0 ? myRankIdx + 1 : null,
            myEntry: myRankIdx >= 0 ? leaderboard[myRankIdx] : null
        });
    } catch (error) {
        console.error('Error fetching quiz leaderboard:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Get all my quiz attempts
   @route  GET /api/quiz/my-attempts
   @access Student
───────────────────────────────────────────────────────────── */
export const getMyAttempts = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await pool.query(`
            SELECT qa.*, q.title as quiz_title, q.type as quiz_type, q.passing_score
            FROM quiz_attempts qa
            LEFT JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.student_id = $1
            ORDER BY qa.created_at DESC
        `, [userId]);

        const attempts = result.rows.map(row => {
            const pct = parseFloat(row.percentage) || 0;
            const passingScore = row.passing_score || 80;
            const isPassed = pct >= passingScore;
            return {
                id: row.id,
                _id: String(row.id),
                quizId: { id: row.quiz_id, title: row.quiz_title || 'Quiz' },
                quiz_title: row.quiz_title || 'Quiz',
                score: parseInt(row.score || 0, 10),
                total_marks: parseInt(row.total_marks || 0, 10),
                percentage: pct,
                passed: isPassed,
                passing_score: passingScore,
                duration_seconds: parseInt(row.duration_seconds || 0, 10),
                timeTaken: parseInt(row.duration_seconds || 0, 10),
                completedAt: row.submitted_at || row.created_at || new Date().toISOString(),
                createdAt: row.created_at || new Date().toISOString()
            };
        });

        res.json(attempts);
    } catch (error) {
        console.error('Error in getMyAttempts:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Get all my certificates
   @route  GET /api/quiz/my-certificates
   @access Student
───────────────────────────────────────────────────────────── */
export const getMyCertificates = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const result = await pool.query(`
            SELECT c.*, q.title as quiz_title, q.type as quiz_type
            FROM certificates c
            LEFT JOIN quizzes q ON c.quiz_id = q.id
            WHERE c.student_id = $1
            ORDER BY c.created_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Delete a quiz (admin or creator)
   @route  DELETE /api/quiz/:id
   @access Admin, Teacher
───────────────────────────────────────────────────────────── */
export const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM quizzes WHERE id = $1', [id]);
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Update an existing quiz (admin or teacher)
   @route  PUT /api/quiz/:id
   @access Admin, Teacher
───────────────────────────────────────────────────────────── */
export const updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, description, type, subjectId,
            questions, timeLimit, passingScore, maxAttempts, difficulty
        } = req.body;

        if (!questions || questions.length === 0) {
            return res.status(400).json({ message: 'A quiz must have at least one question.' });
        }

        const result = await pool.query(
            `UPDATE quizzes 
             SET title = $1, description = $2, type = $3, subject_id = $4,
                 questions = $5, time_limit = $6, passing_score = $7, max_attempts = $8, difficulty = $9
             WHERE id = $10 RETURNING *`,
            [
                title,
                description || null,
                type || 'practice',
                subjectId || null,
                JSON.stringify(questions),
                timeLimit || 30,
                passingScore || 80,
                maxAttempts || 1,
                difficulty || 'mixed',
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        res.json({
            message: 'Quiz updated successfully',
            quiz: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating quiz:', error);
        res.status(500).json({ message: error.message });
    }
};

/* ─────────────────────────────────────────────────────────────
   @desc   Get certificates for a specific quiz (Admin/Teacher)
   @route  GET /api/quiz/:id/certificates
   @access Admin, Teacher
───────────────────────────────────────────────────────────── */
export const getQuizCertificates = async (req, res) => {
    try {
        const quizId = req.params.id;
        const result = await pool.query(`
            SELECT c.*, u.name as student_name, u.roll_number, u.email
            FROM certificates c
            LEFT JOIN users u ON c.student_id = u.id
            WHERE c.quiz_id = $1
            ORDER BY c.created_at DESC
        `, [quizId]);

        const certificates = result.rows.map(row => ({
            _id: String(row.id),
            id: row.id,
            certificateId: row.certificate_id || `CERT-${row.id}`,
            percentage: row.percentage || 100,
            studentId: {
                _id: String(row.student_id),
                name: row.student_name,
                rollNumber: row.roll_number,
                email: row.email
            }
        }));

        res.json(certificates);
    } catch (error) {
        console.error('Error fetching quiz certificates:', error);
        res.status(500).json({ message: error.message });
    }
};
