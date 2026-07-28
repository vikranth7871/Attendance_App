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
   AI Quiz Generation via Google Gemini
───────────────────────────────────────────────────────────── */
const generateQuestionsWithAI = async ({ subject, syllabus, count = 10, difficulty = 'mixed', promptBox, tags, imageBuffer, mimeType }) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in environment variables. Please add it to your .env file.');
    }

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
    
    // If an image was uploaded, attach it to the prompt parts for Gemini Vision
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

    // Extract JSON array from response (handle cases where Gemini wraps in markdown)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error('AI returned an invalid response. Please try again.');
    }

    const questions = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('AI returned no questions. Please try again.');
    }

    return questions.map(q => ({
        ...q,
        aiGenerated: true
    }));
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
        const { type } = req.query;

        const filter = { isPublished: true };
        if (type && ['practice', 'university'].includes(type)) {
            filter.type = type;
        }

        // Class/dept targeting: show quiz if no restriction OR student matches
        const quizzes = await Quiz.find(filter)
            .populate('subjectId', 'subjectName subjectCode')
            .populate('createdBy', 'name')
            .select('-questions.options.isCorrect -questions.explanation') // Security: hide correct answers
            .sort({ createdAt: -1 });

        // Filter by targeting
        const accessible = quizzes.filter(q => {
            if (student.role === 'admin' || student.role === 'teacher') return true;
            const classMatch = !q.targetClass || (student.classId && q.targetClass.toString() === student.classId.toString());
            const deptMatch = !q.targetDepartment || (student.departmentId && q.targetDepartment.toString() === student.departmentId.toString());
            return classMatch && deptMatch;
        });

        // Attach attempt info for each quiz
        const quizzesWithAttempts = await Promise.all(accessible.map(async (q) => {
            const attempts = await QuizAttempt.find({ quizId: q._id, studentId: student._id })
                .sort({ percentage: -1 })
                .limit(1);

            const totalAttempts = await QuizAttempt.countDocuments({ quizId: q._id, studentId: student._id });
            const bestAttempt = attempts[0] || null;

            return {
                ...q.toObject(),
                studentAttempts: totalAttempts,
                bestScore: bestAttempt ? bestAttempt.percentage : null,
                hasPassed: bestAttempt ? bestAttempt.passed : false,
                canAttempt: totalAttempts < q.maxAttempts,
                questionCount: q.questions.length
            };
        }));

        res.json(quizzesWithAttempts);
    } catch (error) {
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
        sql += ' ORDER BY q.created_at DESC';

        const result = await pool.query(sql, params);
        const quizzes = result.rows.map(q => ({
            _id: String(q.id),
            id: q.id,
            title: q.title,
            description: q.description,
            isPublished: q.is_active,
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
        const quiz = await Quiz.findById(req.params.id)
            .populate('subjectId', 'subjectName subjectCode')
            .populate('createdBy', 'name');

        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Check if student has already exceeded max attempts
        if (req.user.role === 'student') {
            const attemptCount = await QuizAttempt.countDocuments({
                quizId: quiz._id,
                studentId: req.user._id
            });

            if (!quiz.isPublished) {
                return res.status(403).json({ message: 'This quiz is not available yet.' });
            }

            const quizObj = quiz.toObject();
            // Strip correct answers from options
            quizObj.questions = quizObj.questions.map(q => ({
                ...q,
                options: q.options.map(o => ({ text: o.text, _id: o._id })),
                explanation: undefined // Hide explanations until results
            }));

            return res.json({
                ...quizObj,
                studentAttempts: attemptCount,
                canAttempt: attemptCount < quiz.maxAttempts
            });
        }

        // Admin/Teacher gets full quiz data
        res.json(quiz);
    } catch (error) {
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
        const quizId = req.params.id;
        const studentId = req.user._id;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        if (!quiz.isPublished) return res.status(403).json({ message: 'This quiz is not active.' });

        // Check attempt limit
        const prevAttempts = await QuizAttempt.countDocuments({ quizId, studentId });
        if (prevAttempts >= quiz.maxAttempts) {
            return res.status(403).json({ message: `Maximum ${quiz.maxAttempts} attempts reached for this quiz.` });
        }

        // ── Score Calculation ─────────────────────────────
        let correct = 0;
        const gradedAnswers = [];

        quiz.questions.forEach((question, idx) => {
            const answer = answers.find(a => a.questionIndex === idx);
            const selectedOption = answer ? answer.selectedOption : -1;
            const correctOptionIndex = question.options.findIndex(o => o.isCorrect);
            const isCorrect = selectedOption === correctOptionIndex;

            if (isCorrect) correct++;

            gradedAnswers.push({
                questionIndex: idx,
                selectedOption,
                correctOption: correctOptionIndex,
                isCorrect,
                questionText: question.questionText,
                explanation: question.explanation,
                options: question.options.map(o => o.text)
            });
        });

        const total = quiz.questions.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        const passed = percentage >= quiz.passingScore;

        // ── Save Attempt ──────────────────────────────────
        const attempt = await QuizAttempt.create({
            studentId,
            quizId,
            answers: answers || [],
            score: correct,
            percentage,
            passed,
            timeTaken: timeTaken || 0,
            completedAt: new Date(),
            semester: quiz.semester,
            year: quiz.year
        });

        // ── Generate Certificate (University quiz + passed) ──
        let certificate = null;
        if (quiz.type === 'university' && passed) {
            // Check if certificate already issued for this student + quiz
            const existingCert = await Certificate.findOne({ studentId, quizId });

            if (!existingCert) {
                // Generate unique certificate ID
                let certId;
                let isUnique = false;
                while (!isUnique) {
                    certId = generateCertificateId();
                    const existing = await Certificate.findOne({ certificateId: certId });
                    if (!existing) isUnique = true;
                }

                certificate = await Certificate.create({
                    studentId,
                    quizId,
                    attemptId: attempt._id,
                    certificateId: certId,
                    score: correct,
                    percentage,
                    studentName: req.user.name,
                    quizTitle: quiz.title,
                    subjectName: quiz.subjectId?.subjectName || ''
                });
            } else {
                certificate = existingCert;
            }
        }

        res.status(201).json({
            message: 'Quiz submitted successfully',
            attemptId: attempt._id,
            score: correct,
            total,
            percentage,
            passed,
            passingScore: quiz.passingScore,
            timeTaken,
            gradedAnswers, // Full review with correct answers now revealed
            certificate,
            isUniversity: quiz.type === 'university'
        });
    } catch (error) {
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
            LEFT JOIN users u ON qa.student_id = u.id
            WHERE qa.quiz_id = $1
            ORDER BY qa.percentage DESC, qa.created_at ASC
        `, [quizId]);

        const leaderboard = result.rows.map((row, idx) => ({
            studentId: String(row.student_id),
            name: row.student_name || 'Student',
            rollNumber: row.roll_number || '-',
            percentage: parseFloat(row.percentage) || 0,
            score: row.score || 0,
            timeTaken: row.duration_seconds || 0,
            rank: idx + 1
        }));

        const myRankIdx = leaderboard.findIndex(e => e.studentId === String(currentUserId));

        res.json({
            leaderboard,
            myRank: myRankIdx >= 0 ? myRankIdx + 1 : null,
            myEntry: myRankIdx >= 0 ? leaderboard[myRankIdx] : null
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
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

        res.json(result.rows);
    } catch (error) {
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
