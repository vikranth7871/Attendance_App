import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, CheckCircle, XCircle, Award, Download, ArrowLeft,
    ChevronDown, ChevronUp, Clock, BarChart2, Star, Repeat, Medal
} from 'lucide-react';
import { downloadCertificate } from './QuizHub';

/* ─────────────────────────────────────────
   Animated Score Counter
───────────────────────────────────────── */
const ScoreCounter = ({ target, duration = 1500 }) => {
    const [value, setValue] = useState(0);
    const frameRef = useRef(null);

    useEffect(() => {
        const start = Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration]);

    return value;
};

/* ─────────────────────────────────────────
   Leaderboard View
───────────────────────────────────────── */
const LeaderboardView = ({ quizId }) => {
    const [lb, setLb] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`/quiz/${quizId}/leaderboard`)
            .then(({ data }) => setLb(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [quizId]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading leaderboard...</div>;
    if (!lb || lb.leaderboard.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No leaderboard data yet.</div>;

    const rankEmoji = ['🥇', '🥈', '🥉'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto' }}>
            {lb.leaderboard.map((entry, idx) => {
                const isMe = lb.myRank === idx + 1;
                const mins = Math.floor((entry.timeTaken || 0) / 60);
                const secs = (entry.timeTaken || 0) % 60;
                return (
                    <motion.div
                        key={entry.studentId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem', borderRadius: '10px',
                            background: isMe
                                ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))'
                                : 'var(--bg-secondary)',
                            border: `1px solid ${isMe ? 'rgba(99,102,241,0.35)' : 'var(--border-color)'}`
                        }}
                    >
                        <div style={{ fontSize: '1.25rem', width: '28px', textAlign: 'center', flexShrink: 0 }}>
                            {idx < 3 ? rankEmoji[idx] : <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>#{idx + 1}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: isMe ? '700' : '500', fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {entry.name}
                                {isMe && <span style={{ fontSize: '0.62rem', background: 'var(--brand-primary)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '999px', fontWeight: '700' }}>You</span>}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                {entry.rollNumber && `${entry.rollNumber} • `}{mins > 0 ? `${mins}m ` : ''}{secs}s
                            </div>
                        </div>
                        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: entry.percentage >= 80 ? '#16a34a' : entry.percentage >= 50 ? '#d97706' : '#dc2626', flexShrink: 0 }}>
                            {entry.percentage}%
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

/* ─────────────────────────────────────────
   Quiz Results Page
───────────────────────────────────────── */
const QuizResults = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const results = location.state?.results;
    const quiz = location.state?.quiz;

    const [expandedQ, setExpandedQ] = useState(null);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Redirect if no results data
    useEffect(() => {
        if (!results) {
            navigate('/student/quiz', { replace: true });
        }
    }, [results, navigate]);

    if (!results) return null;

    const { score, total, percentage, passed, passingScore, timeTaken, gradedAnswers, certificate, isUniversity } = results;

    const minutes = Math.floor((timeTaken || 0) / 60);
    const seconds = (timeTaken || 0) % 60;

    const scoreColor = passed ? '#16a34a' : percentage >= 50 ? '#d97706' : '#dc2626';
    const scoreGlow = passed ? 'rgba(22,163,74,0.25)' : percentage >= 50 ? 'rgba(217,119,6,0.2)' : 'rgba(220,38,38,0.2)';

    const correctCount = gradedAnswers?.filter(a => a.isCorrect).length || score;
    const wrongCount = (gradedAnswers?.length || total) - correctCount;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>

            {/* Back Button */}
            <button
                onClick={() => navigate('/student/quiz')}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'none', border: 'none', color: 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', padding: 0,
                    width: 'fit-content'
                }}
            >
                <ArrowLeft size={18} /> Back to Quiz Hub
            </button>

            {/* ── Score Card ── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                style={{
                    background: `linear-gradient(135deg, ${scoreGlow.replace('0.25', '0.06')}, ${scoreGlow.replace('0.25', '0.02')})`,
                    border: `1px solid ${scoreColor}30`,
                    borderRadius: '20px', padding: '2.5rem 2rem',
                    textAlign: 'center', position: 'relative', overflow: 'hidden'
                }}
            >
                {/* Background orbs */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: '160px', height: '160px', borderRadius: '50%', background: scoreColor, opacity: 0.05 }} />
                <div style={{ position: 'absolute', bottom: -30, left: -30, width: '120px', height: '120px', borderRadius: '50%', background: scoreColor, opacity: 0.05 }} />

                {/* Pass/Fail emoji */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: 'spring', bounce: 0.4 }}
                    style={{ fontSize: '4rem', marginBottom: '1rem' }}
                >
                    {passed ? '🎉' : percentage >= 50 ? '📚' : '😔'}
                </motion.div>

                {/* Score Circle */}
                <div style={{
                    width: '140px', height: '140px', borderRadius: '50%', margin: '0 auto 1.5rem',
                    background: `radial-gradient(circle at center, ${scoreGlow}, transparent)`,
                    border: `4px solid ${scoreColor}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 40px ${scoreGlow}`
                }}>
                    <motion.div style={{ fontSize: '2.5rem', fontWeight: '900', color: scoreColor, lineHeight: 1 }}>
                        <ScoreCounter target={percentage} />%
                    </motion.div>
                    <div style={{ fontSize: '0.7rem', color: scoreColor, fontWeight: '600', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Score
                    </div>
                </div>

                {/* Result Label */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <div style={{
                        display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '999px',
                        background: `${scoreColor}18`, border: `1px solid ${scoreColor}40`,
                        fontSize: '1rem', fontWeight: '800', color: scoreColor, marginBottom: '0.5rem'
                    }}>
                        {passed ? '✅ Passed!' : '❌ Not Passed'}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>
                        {quiz?.title}
                    </p>
                    {!passed && (
                        <p style={{ color: 'var(--text-light)', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>
                            Passing score: {passingScore}%
                        </p>
                    )}
                </motion.div>

                {/* Stats row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}
                >
                    {[
                        { icon: <CheckCircle size={16} />, label: 'Correct', value: correctCount, color: '#16a34a' },
                        { icon: <XCircle size={16} />, label: 'Wrong', value: wrongCount, color: '#dc2626' },
                        { icon: <Clock size={16} />, label: 'Time', value: `${minutes > 0 ? minutes + 'm ' : ''}${seconds}s`, color: 'var(--brand-primary)' },
                        { icon: <BarChart2 size={16} />, label: 'Total', value: total, color: 'var(--text-secondary)' }
                    ].map(s => (
                        <div key={s.label} style={{
                            padding: '0.75rem 1.25rem', borderRadius: '12px',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            textAlign: 'center', minWidth: '80px'
                        }}>
                            <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}>{s.icon}</div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                        </div>
                    ))}
                </motion.div>
            </motion.div>

            {/* ── Certificate Section (if earned) ── */}
            <AnimatePresence>
                {certificate && isUniversity && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(249,115,22,0.05))',
                            border: '1px solid rgba(245,158,11,0.3)',
                            borderRadius: '16px', padding: '1.75rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: '1.5rem'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <motion.div
                                animate={{ rotate: [0, -5, 5, -5, 0] }}
                                transition={{ delay: 0.6, duration: 0.5 }}
                                style={{ fontSize: '3rem' }}
                            >🏅</motion.div>
                            <div>
                                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
                                    Certificate Earned! 🎊
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    You scored {percentage}% — above the {passingScore}% passing threshold
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                                    ID: {certificate.certificateId}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => downloadCertificate(certificate)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.75rem 1.5rem', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                                color: 'white', border: 'none', cursor: 'pointer',
                                fontWeight: '700', fontSize: '0.9rem',
                                boxShadow: '0 4px 16px rgba(245,158,11,0.35)'
                            }}
                        >
                            <Download size={16} /> Download Certificate
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Leaderboard Toggle (university only) ── */}
            {isUniversity && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                    <button
                        onClick={() => setShowLeaderboard(s => !s)}
                        style={{
                            width: '100%', padding: '1rem 1.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '700', fontSize: '0.95rem' }}>
                            <Trophy size={20} style={{ color: '#f59e0b' }} /> Leaderboard
                        </div>
                        {showLeaderboard ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <AnimatePresence>
                        {showLeaderboard && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden', borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem' }}
                            >
                                <LeaderboardView quizId={id} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Answer Review ── */}
            {gradedAnswers && gradedAnswers.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={20} style={{ color: 'var(--brand-primary)' }} /> Answer Review
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {gradedAnswers.map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: `1px solid ${item.isCorrect ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
                                    borderLeft: `4px solid ${item.isCorrect ? '#16a34a' : '#dc2626'}`,
                                    borderRadius: '12px', overflow: 'hidden'
                                }}
                            >
                                <button
                                    onClick={() => setExpandedQ(expandedQ === idx ? null : idx)}
                                    style={{
                                        width: '100%', padding: '1rem 1.25rem',
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{ flexShrink: 0 }}>
                                        {item.isCorrect
                                            ? <CheckCircle size={20} style={{ color: '#16a34a' }} />
                                            : <XCircle size={20} style={{ color: '#dc2626' }} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Q{idx + 1}
                                        </span>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: '500', margin: '2px 0 0', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.questionText}
                                        </p>
                                    </div>
                                    {expandedQ === idx ? <ChevronUp size={16} style={{ color: 'var(--text-light)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text-light)', flexShrink: 0 }} />}
                                </button>

                                <AnimatePresence>
                                    {expandedQ === idx && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden', borderTop: '1px solid var(--border-color)', padding: '1rem 1.25rem' }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                                {item.options?.map((opt, oi) => {
                                                    const isCorrectOpt = oi === item.correctOption;
                                                    const isSelectedOpt = oi === item.selectedOption;
                                                    let bg = 'var(--bg-primary)';
                                                    let border = 'var(--border-color)';
                                                    let color = 'var(--text-secondary)';
                                                    if (isCorrectOpt) { bg = 'rgba(22,163,74,0.08)'; border = '#16a34a'; color = '#16a34a'; }
                                                    if (isSelectedOpt && !isCorrectOpt) { bg = 'rgba(220,38,38,0.08)'; border = '#dc2626'; color = '#dc2626'; }

                                                    return (
                                                        <div key={oi} style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                            padding: '0.6rem 0.9rem', borderRadius: '8px',
                                                            background: bg, border: `1px solid ${border}30`
                                                        }}>
                                                            <div style={{
                                                                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                                                border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center',
                                                                justifyContent: 'center', fontSize: '0.62rem', fontWeight: '800', color
                                                            }}>
                                                                {['A', 'B', 'C', 'D'][oi]}
                                                            </div>
                                                            <span style={{ fontSize: '0.82rem', color, fontWeight: isCorrectOpt || (isSelectedOpt && !isCorrectOpt) ? '600' : '400' }}>
                                                                {opt}
                                                            </span>
                                                            {isCorrectOpt && <CheckCircle size={14} style={{ color: '#16a34a', marginLeft: 'auto', flexShrink: 0 }} />}
                                                            {isSelectedOpt && !isCorrectOpt && <XCircle size={14} style={{ color: '#dc2626', marginLeft: 'auto', flexShrink: 0 }} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {item.explanation && (
                                                <div style={{
                                                    padding: '0.75rem', borderRadius: '8px',
                                                    background: 'rgba(99,102,241,0.06)',
                                                    border: '1px solid rgba(99,102,241,0.15)',
                                                    fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5
                                                }}>
                                                    <strong style={{ color: 'var(--brand-primary)' }}>💡 Explanation: </strong>
                                                    {item.explanation}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                    onClick={() => navigate('/student/quiz')}
                    style={{
                        flex: 1, padding: '0.9rem', borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                    }}
                >
                    <ArrowLeft size={16} /> Back to Hub
                </button>
                {!passed && (
                    <button
                        onClick={() => navigate(`/student/quiz/${id}/attempt`, { state: { quiz } })}
                        style={{
                            flex: 1, padding: '0.9rem', borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                            color: 'white', border: 'none', cursor: 'pointer',
                            fontWeight: '700', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <Repeat size={16} /> Try Again
                    </button>
                )}
            </div>
        </div>
    );
};

export default QuizResults;
