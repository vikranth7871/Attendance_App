import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, NavLink, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Trophy, BookOpen, Clock, Star, Zap, Award, ChevronRight,
    Play, BarChart2, Medal, CheckCircle, XCircle, Download, Eye,
    Filter, Search, Sparkles, Target, TrendingUp, RefreshCw, Lock, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import QuizAttempt from './QuizAttempt';
import QuizResults from './QuizResults';

/* ─────────────────────────────────────────
   Difficulty Badge
───────────────────────────────────────── */
const DifficultyBadge = ({ difficulty }) => {
    const map = {
        easy: { color: '#16a34a', bg: 'rgba(22,163,74,0.12)', label: 'Easy' },
        medium: { color: '#d97706', bg: 'rgba(217,119,6,0.12)', label: 'Medium' },
        hard: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Hard' },
        mixed: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', label: 'Mixed' }
    };
    const cfg = map[difficulty] || map.mixed;
    return (
        <span style={{
            fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase',
            letterSpacing: '0.06em', padding: '0.2rem 0.55rem', borderRadius: '999px',
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`
        }}>{cfg.label}</span>
    );
};

/* ─────────────────────────────────────────
   Quiz Card
───────────────────────────────────────── */
const QuizCard = ({ quiz, onStart, idx }) => {
    const canAttempt = quiz.canAttempt;
    const hasPassed = quiz.hasPassed;
    const bestScore = quiz.bestScore;
    const isUniversity = quiz.type === 'university';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            style={{
                background: 'var(--bg-secondary)',
                border: `1px solid ${hasPassed ? 'rgba(22,163,74,0.3)' : isUniversity ? 'rgba(99,102,241,0.25)' : 'var(--border-color)'}`,
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
            }}
            whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}
        >
            {/* University badge */}
            {isUniversity && (
                <div style={{
                    position: 'absolute', top: 0, right: 0,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: 'white', fontSize: '0.6rem', fontWeight: '800',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '0.25rem 0.75rem', borderRadius: '0 16px 0 12px'
                }}>🏛 University</div>
            )}

            {/* Passed badge */}
            {hasPassed && (
                <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: 'rgba(22,163,74,0.15)', color: '#16a34a',
                    border: '1px solid rgba(22,163,74,0.3)',
                    fontSize: '0.6rem', fontWeight: '800', padding: '0.2rem 0.5rem',
                    borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '3px'
                }}>
                    <CheckCircle size={10} /> Passed
                </div>
            )}

            {/* Header */}
            <div style={{ paddingTop: hasPassed ? '1.2rem' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: isUniversity
                            ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                            : 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {isUniversity ? <Trophy size={22} color="white" /> : <Brain size={22} color="white" />}
                    </div>
                    <DifficultyBadge difficulty={quiz.difficulty} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem', lineHeight: 1.3 }}>
                    {quiz.title}
                </h3>
                {quiz.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {quiz.description.length > 80 ? quiz.description.slice(0, 80) + '…' : quiz.description}
                    </p>
                )}
            </div>

            {/* Subject tag */}
            {quiz.subjectId?.subjectName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={13} style={{ color: 'var(--brand-primary)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', fontWeight: '600' }}>
                        {quiz.subjectId.subjectName}
                    </span>
                </div>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {[
                    { icon: <BookOpen size={13} />, label: `${quiz.questionCount} Qs` },
                    ...(isUniversity ? [{ icon: <Clock size={13} />, label: `${quiz.timeLimit}m` }] : []),
                    { icon: <RefreshCw size={13} />, label: `${quiz.studentAttempts}/${quiz.maxAttempts} tries` }
                ].map((s, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '500'
                    }}>
                        <span style={{ color: 'var(--text-light)' }}>{s.icon}</span>
                        {s.label}
                    </div>
                ))}
            </div>

            {/* Best score bar */}
            {bestScore !== null && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        <span>Best Score</span>
                        <span style={{ fontWeight: '700', color: bestScore >= quiz.passingScore ? '#16a34a' : '#dc2626' }}>
                            {bestScore}%
                        </span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${bestScore}%` }}
                            transition={{ delay: idx * 0.06 + 0.3, duration: 0.6 }}
                            style={{
                                height: '100%', borderRadius: '3px',
                                background: bestScore >= quiz.passingScore
                                    ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                    : 'linear-gradient(90deg, #dc2626, #f87171)'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* CTA Button */}
            <button
                onClick={() => canAttempt && onStart(quiz)}
                disabled={!canAttempt}
                style={{
                    width: '100%', padding: '0.65rem',
                    background: !canAttempt
                        ? 'var(--bg-primary)'
                        : 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                    color: !canAttempt ? 'var(--text-light)' : 'white',
                    border: `1px solid ${!canAttempt ? 'var(--border-color)' : 'transparent'}`,
                    borderRadius: '10px', fontWeight: '600', fontSize: '0.85rem',
                    cursor: canAttempt ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'all 0.2s'
                }}
            >
                {!canAttempt ? (
                    <><Lock size={15} /> Attempts Exhausted</>
                ) : (
                    <><Play size={15} /> {quiz.studentAttempts === 0 ? 'Start Quiz' : 'Retry Quiz'}</>
                )}
            </button>
        </motion.div>
    );
};

/* ─────────────────────────────────────────
   Results History Row
───────────────────────────────────────── */
const AttemptRow = ({ attempt, idx }) => {
    const passed = attempt.passed;
    const date = new Date(attempt.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const minutes = Math.floor((attempt.timeTaken || 0) / 60);
    const seconds = (attempt.timeTaken || 0) % 60;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: `1px solid ${passed ? 'rgba(22,163,74,0.2)' : 'var(--border-color)'}`,
                borderLeft: `4px solid ${passed ? '#16a34a' : '#dc2626'}`
            }}
        >
            <div style={{ fontSize: '1.5rem' }}>{passed ? '✅' : '❌'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {attempt.quizId?.title || 'Quiz'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {date} • {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
                </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: passed ? '#16a34a' : '#dc2626' }}>
                    {attempt.percentage}%
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>
                    {attempt.score}/{attempt.quizId?.questions?.length || '?'} correct
                </div>
            </div>
        </motion.div>
    );
};

/* ─────────────────────────────────────────
   Certificate Card
───────────────────────────────────────── */
const CertificateCard = ({ cert, idx, onDownload }) => {
    const date = new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.08 }}
            style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '16px', padding: '1.5rem',
                position: 'relative', overflow: 'hidden'
            }}
        >
            {/* Decorative orb */}
            <div style={{
                position: 'absolute', top: -20, right: -20,
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                opacity: 0.08
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Award size={24} color="white" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {cert.quizTitle}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Issued: {date}</div>
                </div>
                <div style={{
                    fontSize: '1.1rem', fontWeight: '800',
                    color: '#16a34a', flexShrink: 0
                }}>{cert.percentage}%</div>
            </div>

            <div style={{
                background: 'rgba(0,0,0,0.1)', borderRadius: '8px',
                padding: '0.5rem 0.75rem', fontSize: '0.65rem',
                color: 'var(--text-secondary)', fontFamily: 'monospace',
                marginBottom: '1rem', letterSpacing: '0.05em'
            }}>
                🏅 {cert.certificateId}
            </div>

            <button
                onClick={() => onDownload(cert)}
                style={{
                    width: '100%', padding: '0.55rem', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                    color: 'white', border: 'none', fontWeight: '600',
                    fontSize: '0.8rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}
            >
                <Download size={14} /> Download Certificate
            </button>
        </motion.div>
    );
};

/* ─────────────────────────────────────────
   Certificate Canvas Generator
───────────────────────────────────────── */
export const downloadCertificate = (cert) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 850);
    bgGrad.addColorStop(0, '#0f0c29');
    bgGrad.addColorStop(0.5, '#1a1545');
    bgGrad.addColorStop(1, '#0f0c29');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 850);

    // Border frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 1152, 802);
    ctx.strokeStyle = 'rgba(245,158,11,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, 1128, 778);

    // Corner decorations
    const corners = [[50, 50], [1150, 50], [50, 800], [1150, 800]];
    corners.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
    });

    // Header gradient strip
    const headerGrad = ctx.createLinearGradient(0, 80, 1200, 80);
    headerGrad.addColorStop(0, 'transparent');
    headerGrad.addColorStop(0.3, 'rgba(245,158,11,0.08)');
    headerGrad.addColorStop(0.7, 'rgba(245,158,11,0.08)');
    headerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 80, 1200, 120);

    // iAttend label
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText('iAttend Learning Platform', 600, 115);

    // Trophy emoji text
    ctx.font = '52px Arial';
    ctx.fillText('🏆', 600, 175);

    // Certificate of Achievement
    ctx.font = 'bold 48px Arial';
    const titleGrad = ctx.createLinearGradient(300, 200, 900, 230);
    titleGrad.addColorStop(0, '#f59e0b');
    titleGrad.addColorStop(0.5, '#fbbf24');
    titleGrad.addColorStop(1, '#f97316');
    ctx.fillStyle = titleGrad;
    ctx.fillText('CERTIFICATE OF ACHIEVEMENT', 600, 230);

    // Subtitle
    ctx.font = '20px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('This is to certify that', 600, 290);

    // Student Name
    ctx.font = 'bold 56px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cert.studentName || 'Student', 600, 365);

    // Divider line
    const lineGrad = ctx.createLinearGradient(250, 390, 950, 390);
    lineGrad.addColorStop(0, 'transparent');
    lineGrad.addColorStop(0.3, '#f59e0b');
    lineGrad.addColorStop(0.7, '#f59e0b');
    lineGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(250, 395); ctx.lineTo(950, 395); ctx.stroke();

    // Achievement text
    ctx.font = '20px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('has successfully completed the university quiz', 600, 440);

    // Quiz Title
    ctx.font = 'bold 34px Arial';
    ctx.fillStyle = '#a5b4fc';
    const qTitle = cert.quizTitle || 'University Quiz';
    ctx.fillText(qTitle.length > 50 ? qTitle.slice(0, 50) + '…' : qTitle, 600, 495);

    // Score box
    const boxX = 400, boxY = 530, boxW = 400, boxH = 80;
    const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY);
    boxGrad.addColorStop(0, 'rgba(22,163,74,0.15)');
    boxGrad.addColorStop(1, 'rgba(22,163,74,0.05)');
    ctx.fillStyle = boxGrad;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(22,163,74,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 38px Arial';
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`Score: ${cert.percentage}%`, 600, 582);

    // Certificate ID
    ctx.font = '15px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(`Certificate ID: ${cert.certificateId}`, 600, 650);

    // Date
    const issueDate = new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`Issued on: ${issueDate}`, 600, 690);

    // Signature line
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(450, 750); ctx.lineTo(750, 750); ctx.stroke();
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Authorized by iAttend Platform', 600, 775);

    // Download
    const link = document.createElement('a');
    link.download = `${cert.certificateId}.png`;
    link.href = canvas.toDataURL('image/png', 0.95);
    link.click();
};

/* ─────────────────────────────────────────
   Main QuizHub Component
───────────────────────────────────────── */
const QuizHubMain = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('practice');
    const [quizzes, setQuizzes] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const tabs = [
        { id: 'practice', label: 'Practice Quizzes', icon: <Brain size={16} /> },
        { id: 'university', label: 'University Quizzes', icon: <Trophy size={16} /> },
        { id: 'results', label: 'My Results', icon: <BarChart2 size={16} /> },
        { id: 'certificates', label: 'Certificates', icon: <Award size={16} /> }
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [quizRes, attemptRes, certRes] = await Promise.all([
                    axios.get('/quiz'),
                    axios.get('/quiz/my-attempts'),
                    axios.get('/quiz/my-certificates')
                ]);
                setQuizzes(quizRes.data);
                setAttempts(attemptRes.data);
                setCertificates(certRes.data);
            } catch (err) {
                console.error('Failed to fetch quiz data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtered = quizzes.filter(q => {
        const matchType = q.type === activeTab || (activeTab !== 'practice' && activeTab !== 'university');
        const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) ||
            (q.subjectId?.subjectName || '').toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
    });

    const practiceQuizzes = quizzes.filter(q => q.type === 'practice');
    const universityQuizzes = quizzes.filter(q => q.type === 'university');
    const passedCount = attempts.filter(a => a.passed).length;

    const handleStart = (quiz) => {
        navigate(`/student/quiz/${quiz._id}/attempt`, { state: { quiz } });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Header ── */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '20px', padding: '2rem',
                position: 'relative', overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute', top: -40, right: -40,
                    width: '180px', height: '180px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                    opacity: 0.07
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Brain size={26} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                                    Quiz Arena
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    Test your knowledge, earn certifications
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Available', value: quizzes.length, icon: <BookOpen size={18} />, color: '#6366f1' },
                            { label: 'Attempts', value: attempts.length, icon: <Target size={18} />, color: '#f59e0b' },
                            { label: 'Passed', value: passedCount, icon: <CheckCircle size={18} />, color: '#16a34a' },
                            { label: 'Certificates', value: certificates.length, icon: <Award size={18} />, color: '#f97316' }
                        ].map(s => (
                            <div key={s.label} style={{
                                textAlign: 'center', padding: '0.75rem 1.25rem',
                                background: 'var(--bg-secondary)', borderRadius: '12px',
                                border: `1px solid ${s.color}25`, minWidth: '80px'
                            }}>
                                <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}>{s.icon}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: '0.62rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: '12px', gap: '0.2rem', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1rem', borderRadius: '9px', border: 'none',
                                background: activeTab === tab.id
                                    ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))'
                                    : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.icon} {tab.label}
                            {tab.id === 'university' && universityQuizzes.length > 0 && (
                                <span style={{
                                    background: activeTab === 'university' ? 'rgba(255,255,255,0.25)' : 'var(--brand-primary)',
                                    color: 'white', borderRadius: '999px', fontSize: '0.6rem',
                                    padding: '0.1rem 0.4rem', fontWeight: '800'
                                }}>{universityQuizzes.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search */}
                {(activeTab === 'practice' || activeTab === 'university') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.5rem 0.75rem' }}>
                        <Search size={15} style={{ color: 'var(--text-light)' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search quizzes..."
                            style={{
                                background: 'none', border: 'none', outline: 'none',
                                color: 'var(--text-primary)', fontSize: '0.85rem', width: '160px'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}
                    >
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: '1rem' }}>
                            <Brain size={36} style={{ color: 'var(--brand-primary)' }} />
                        </motion.div>
                        <p>Loading Quiz Arena...</p>
                    </motion.div>
                ) : (
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

                        {/* Practice + University Tabs */}
                        {(activeTab === 'practice' || activeTab === 'university') && (
                            <>
                                {filtered.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center', padding: '4rem',
                                        background: 'var(--bg-secondary)', borderRadius: '16px',
                                        border: '1px dashed var(--border-color)'
                                    }}>
                                        <Brain size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                        <p style={{ color: 'var(--text-secondary)' }}>
                                            {search ? `No quizzes match "${search}"` : 'No quizzes available yet. Check back soon!'}
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                                        {filtered.map((quiz, idx) => (
                                            <QuizCard key={quiz._id} quiz={quiz} onStart={handleStart} idx={idx} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Results Tab */}
                        {activeTab === 'results' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {attempts.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                                        <BarChart2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                        <p style={{ color: 'var(--text-secondary)' }}>No quiz attempts yet. Take your first quiz!</p>
                                    </div>
                                ) : (
                                    attempts.map((attempt, idx) => (
                                        <AttemptRow key={attempt._id} attempt={attempt} idx={idx} />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Certificates Tab */}
                        {activeTab === 'certificates' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                                {certificates.length === 0 ? (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                                        <Award size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                        <p style={{ color: 'var(--text-secondary)' }}>No certificates yet. Pass a university quiz with 80%+ to earn one!</p>
                                    </div>
                                ) : (
                                    certificates.map((cert, idx) => (
                                        <CertificateCard key={cert._id} cert={cert} idx={idx} onDownload={downloadCertificate} />
                                    ))
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─────────────────────────────────────────
   Root QuizHub with nested routes
───────────────────────────────────────── */
const QuizHub = () => {
    return (
        <Routes>
            <Route path="/" element={<QuizHubMain />} />
            <Route path="/:id/attempt" element={<QuizAttempt />} />
            <Route path="/:id/results" element={<QuizResults />} />
        </Routes>
    );
};

export default QuizHub;
