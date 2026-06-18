import { GoogleGenerativeAI } from '@google/generative-ai';
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
const generateQuestionsWithAI = async ({ subject, syllabus, count = 10, difficulty = 'mixed' }) => {
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

    const result = await model.generateContent(prompt);
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
        const { subject, syllabus, count = 10, difficulty = 'mixed' } = req.body;

        if (!subject) {
            return res.status(400).json({ message: 'Subject name is required for AI generation.' });
        }

        const questions = await generateQuestionsWithAI({ subject, syllabus, count: Math.min(count, 20), difficulty });
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
            title, description, type, subjectId, semester, year,
            questions, timeLimit, passingScore, tags, syllabus,
            targetClass, targetDepartment, maxAttempts, difficulty,
            generateWithAI, aiSubject, aiCount
        } = req.body;

        let finalQuestions = questions || [];

        // If AI generation requested and no questions provided
        if (generateWithAI && finalQuestions.length === 0) {
            const subjectLabel = aiSubject || title;
            finalQuestions = await generateQuestionsWithAI({
                subject: subjectLabel,
                syllabus,
                count: aiCount || 10,
                difficulty: difficulty || 'mixed'
            });
        }

        if (finalQuestions.length === 0) {
            return res.status(400).json({ message: 'A quiz must have at least one question.' });
        }

        const quiz = await Quiz.create({
            title,
            description,
            type: type || 'practice',
            subjectId: subjectId || null,
            semester,
            year,
            questions: finalQuestions,
            timeLimit: timeLimit || 30,
            passingScore: passingScore || 80,
            isPublished: false,
            createdBy: req.user._id,
            tags: tags || [],
            syllabus: syllabus || '',
            targetClass: targetClass || null,
            targetDepartment: targetDepartment || null,
            maxAttempts: maxAttempts || 3,
            difficulty: difficulty || 'mixed'
        });

        res.status(201).json({ message: 'Quiz created successfully', quiz });
    } catch (error) {
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
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Only creator or admin can publish
        if (req.user.role !== 'admin' && quiz.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to modify this quiz' });
        }

        quiz.isPublished = !quiz.isPublished;
        await quiz.save();

        res.json({ message: `Quiz ${quiz.isPublished ? 'published' : 'unpublished'} successfully`, isPublished: quiz.isPublished });
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
        const filter = req.user.role === 'teacher'
            ? { createdBy: req.user._id }
            : {};

        const quizzes = await Quiz.find(filter)
            .populate('subjectId', 'subjectName')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        // Attach total attempt counts
        const withCounts = await Promise.all(quizzes.map(async (q) => {
            const attemptCount = await QuizAttempt.countDocuments({ quizId: q._id });
            return { ...q.toObject(), totalAttempts: attemptCount, questionCount: q.questions.length };
        }));

        res.json(withCounts);
    } catch (error) {
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

        // Get best attempt per student for this quiz
        const leaderboard = await QuizAttempt.aggregate([
            { $match: { quizId: new mongoose.Types.ObjectId(quizId) } },
            // Group by student, get best percentage + shortest time for that percentage
            {
                $sort: { percentage: -1, timeTaken: 1, completedAt: 1 }
            },
            {
                $group: {
                    _id: '$studentId',
                    bestPercentage: { $first: '$percentage' },
                    bestScore: { $first: '$score' },
                    bestTime: { $first: '$timeTaken' },
                    completedAt: { $first: '$completedAt' },
                    attemptId: { $first: '$_id' }
                }
            },
            { $sort: { bestPercentage: -1, bestTime: 1 } },
            { $limit: 50 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $project: {
                    studentId: '$_id',
                    name: '$student.name',
                    rollNumber: '$student.rollNumber',
                    percentage: '$bestPercentage',
                    score: '$bestScore',
                    timeTaken: '$bestTime',
                    completedAt: 1
                }
            }
        ]);

        // Add rank numbers
        const ranked = leaderboard.map((entry, idx) => ({
            ...entry,
            rank: idx + 1
        }));

        // Find current user's rank
        const myRank = ranked.findIndex(e => e.studentId.toString() === req.user._id.toString());

        res.json({
            leaderboard: ranked,
            myRank: myRank >= 0 ? myRank + 1 : null,
            myEntry: myRank >= 0 ? ranked[myRank] : null
        });
    } catch (error) {
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
        const attempts = await QuizAttempt.find({ studentId: req.user._id })
            .populate('quizId', 'title type subjectId passingScore timeLimit')
            .sort({ completedAt: -1 });

        res.json(attempts);
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
        const certificates = await Certificate.find({ studentId: req.user._id })
            .populate('quizId', 'title type')
            .sort({ issuedAt: -1 });

        res.json(certificates);
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
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        if (req.user.role !== 'admin' && quiz.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this quiz' });
        }

        await Quiz.findByIdAndDelete(req.params.id);
        await QuizAttempt.deleteMany({ quizId: req.params.id });
        // Note: certificates are kept even after quiz deletion (evidence of achievement)

        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
