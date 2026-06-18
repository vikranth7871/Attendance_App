import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, AlertTriangle, Send, X, Brain } from 'lucide-react';

/* ─────────────────────────────────────────
   Timer Component
───────────────────────────────────────── */
const Timer = ({ totalSeconds, onExpire }) => {
    const [remaining, setRemaining] = useState(totalSeconds);
    const intervalRef = useRef(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    onExpire();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [onExpire]);

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const pct = (remaining / totalSeconds) * 100;
    const isWarning = remaining < 120; // last 2 minutes
    const isDanger = remaining < 30;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 1rem', borderRadius: '12px',
            background: isDanger ? 'rgba(220,38,38,0.12)' : isWarning ? 'rgba(217,119,6,0.1)' : 'var(--bg-secondary)',
            border: `1px solid ${isDanger ? 'rgba(220,38,38,0.4)' : isWarning ? 'rgba(217,119,6,0.3)' : 'var(--border-color)'}`,
            transition: 'all 0.3s'
        }}>
            <motion.div
                animate={isDanger ? { scale: [1, 1.15, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.8 }}
            >
                <Clock size={18} style={{ color: isDanger ? '#dc2626' : isWarning ? '#d97706' : 'var(--brand-primary)' }} />
            </motion.div>
            <div>
                <div style={{
                    fontWeight: '800', fontSize: '1.1rem', fontFamily: 'monospace',
                    color: isDanger ? '#dc2626' : isWarning ? '#d97706' : 'var(--text-primary)'
                }}>
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div style={{ width: '60px', height: '3px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '2px' }}>
                    <motion.div
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1 }}
                        style={{
                            height: '100%', borderRadius: '2px',
                            background: isDanger ? '#dc2626' : isWarning ? '#d97706' : 'var(--brand-primary)'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────
   QuizAttempt — Full-screen overlay
───────────────────────────────────────── */
const QuizAttempt = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState(location.state?.quiz || null);
    const [loading, setLoading] = useState(!location.state?.quiz);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionIndex: selectedOption }
    const [flagged, setFlagged] = useState(new Set());
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [startTime] = useState(Date.now());
    const [error, setError] = useState('');

    // Fetch quiz if not passed via state
    useEffect(() => {
        if (!quiz) {
            const fetchQuiz = async () => {
                try {
                    const { data } = await axios.get(`/quiz/${id}`);
                    if (!data.canAttempt) {
                        navigate('/student/quiz', { replace: true });
                        return;
                    }
                    setQuiz(data);
                } catch (err) {
                    setError('Failed to load quiz.');
                } finally {
                    setLoading(false);
                }
            };
            fetchQuiz();
        }
    }, [id, quiz, navigate]);

    const handleSelect = (questionIndex, optionIndex) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
    };

    const handleFlag = (idx) => {
        setFlagged(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const handleSubmit = useCallback(async () => {
        setSubmitting(true);
        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        const answersArray = Object.entries(answers).map(([qi, si]) => ({
            questionIndex: parseInt(qi),
            selectedOption: si
        }));

        try {
            const { data } = await axios.post(`/quiz/${id}/attempt`, {
                answers: answersArray,
                timeTaken
            });
            navigate(`/student/quiz/${id}/results`, { state: { results: data, quiz }, replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Submission failed. Please try again.');
            setSubmitting(false);
            setShowConfirm(false);
        }
    }, [answers, id, navigate, quiz, startTime]);

    if (loading) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '1rem'
            }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Brain size={40} style={{ color: 'var(--brand-primary)' }} />
                </motion.div>
                <p style={{ color: 'var(--text-secondary)' }}>Loading quiz...</p>
            </div>
        );
    }

    if (error && !quiz) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '1rem'
            }}>
                <AlertTriangle size={40} style={{ color: '#dc2626' }} />
                <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{error}</p>
                <button onClick={() => navigate('/student/quiz')} style={{
                    padding: '0.75rem 1.5rem', borderRadius: '10px',
                    background: 'var(--brand-primary)', color: 'white',
                    border: 'none', cursor: 'pointer', fontWeight: '600'
                }}>Back to Quiz Hub</button>
            </div>
        );
    }

    if (!quiz) return null;

    const questions = quiz.questions || [];
    const totalQ = questions.length;
    const answeredCount = Object.keys(answers).length;
    const currentQuestion = questions[currentQ];
    const isUniversity = quiz.type === 'university';

    const getQStatus = (idx) => {
        if (flagged.has(idx)) return 'flagged';
        if (answers[idx] !== undefined) return 'answered';
        if (idx === currentQ) return 'current';
        return 'unanswered';
    };

    const statusColors = {
        answered: { bg: 'var(--brand-primary)', color: 'white', border: 'var(--brand-primary)' },
        current: { bg: 'rgba(99,102,241,0.15)', color: 'var(--brand-primary)', border: 'var(--brand-primary)' },
        flagged: { bg: 'rgba(245,158,11,0.15)', color: '#d97706', border: '#d97706' },
        unanswered: { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border-color)' }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'var(--bg-primary)',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'Outfit, sans-serif'
        }}>
            {/* ── Top Bar ── */}
            <div style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '1rem', flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Brain size={18} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {quiz.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Question {currentQ + 1} of {totalQ} • {answeredCount} answered
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isUniversity && quiz.timeLimit && (
                        <Timer totalSeconds={quiz.timeLimit * 60} onExpire={handleSubmit} />
                    )}
                    <button
                        onClick={() => setShowConfirm(true)}
                        style={{
                            padding: '0.5rem 1.25rem', borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                            color: 'white', border: 'none', cursor: 'pointer',
                            fontWeight: '600', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', gap: '0.4rem'
                        }}
                    >
                        <Send size={14} /> Submit
                    </button>
                </div>
            </div>

            {/* ── Progress Bar ── */}
            <div style={{ height: '4px', background: 'var(--border-color)' }}>
                <motion.div
                    animate={{ width: `${(answeredCount / totalQ) * 100}%` }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))' }}
                    transition={{ duration: 0.4 }}
                />
            </div>

            {/* ── Main Content ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Question Area */}
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', maxWidth: '760px', margin: '0 auto', width: '100%' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQ}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Question number + flag */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.35rem 0.9rem', borderRadius: '999px',
                                    background: 'linear-gradient(135deg, var(--brand-primary)20, var(--brand-secondary)10)',
                                    border: '1px solid var(--brand-primary)30'
                                }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--brand-primary)' }}>
                                        Q{currentQ + 1}
                                    </span>
                                    {currentQuestion?.difficulty && (
                                        <span style={{
                                            fontSize: '0.62rem', fontWeight: '700', textTransform: 'uppercase',
                                            color: currentQuestion.difficulty === 'hard' ? '#dc2626' :
                                                currentQuestion.difficulty === 'medium' ? '#d97706' : '#16a34a'
                                        }}>• {currentQuestion.difficulty}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleFlag(currentQ)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        padding: '0.4rem 0.75rem', borderRadius: '8px', border: 'none',
                                        background: flagged.has(currentQ) ? 'rgba(245,158,11,0.15)' : 'var(--bg-secondary)',
                                        color: flagged.has(currentQ) ? '#d97706' : 'var(--text-secondary)',
                                        cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600'
                                    }}
                                >
                                    <Flag size={14} /> {flagged.has(currentQ) ? 'Flagged' : 'Flag'}
                                </button>
                            </div>

                            {/* Question Text */}
                            <div style={{
                                background: 'var(--bg-secondary)', borderRadius: '16px',
                                padding: '1.75rem', marginBottom: '1.5rem',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                            }}>
                                <p style={{
                                    fontSize: '1.05rem', fontWeight: '500',
                                    color: 'var(--text-primary)', lineHeight: 1.7, margin: 0
                                }}>
                                    {currentQuestion?.questionText}
                                </p>
                            </div>

                            {/* Options */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {currentQuestion?.options?.map((option, optIdx) => {
                                    const isSelected = answers[currentQ] === optIdx;
                                    const labels = ['A', 'B', 'C', 'D'];
                                    return (
                                        <motion.button
                                            key={optIdx}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => handleSelect(currentQ, optIdx)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '1rem 1.25rem', borderRadius: '12px',
                                                border: `2px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                                                background: isSelected
                                                    ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))'
                                                    : 'var(--bg-secondary)',
                                                cursor: 'pointer', textAlign: 'left', width: '100%',
                                                transition: 'all 0.18s', color: 'var(--text-primary)'
                                            }}
                                        >
                                            <div style={{
                                                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                                background: isSelected
                                                    ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))'
                                                    : 'var(--bg-primary)',
                                                border: `2px solid ${isSelected ? 'transparent' : 'var(--border-color)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: '800', fontSize: '0.85rem',
                                                color: isSelected ? 'white' : 'var(--text-secondary)',
                                                transition: 'all 0.18s'
                                            }}>
                                                {isSelected ? <CheckCircle size={16} /> : labels[optIdx]}
                                            </div>
                                            <span style={{
                                                fontSize: '0.9rem', fontWeight: isSelected ? '600' : '400',
                                                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                lineHeight: 1.5
                                            }}>
                                                {option.text}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingBottom: '2rem' }}>
                        <button
                            onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                            disabled={currentQ === 0}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.65rem 1.25rem', borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                background: currentQ === 0 ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                                color: currentQ === 0 ? 'var(--text-light)' : 'var(--text-primary)',
                                cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
                                fontWeight: '600', fontSize: '0.85rem'
                            }}
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                            {currentQ + 1} / {totalQ}
                        </span>

                        {currentQ < totalQ - 1 ? (
                            <button
                                onClick={() => setCurrentQ(q => Math.min(totalQ - 1, q + 1))}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.65rem 1.25rem', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                    color: 'white', border: 'none', cursor: 'pointer',
                                    fontWeight: '600', fontSize: '0.85rem'
                                }}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowConfirm(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.65rem 1.25rem', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                                    color: 'white', border: 'none', cursor: 'pointer',
                                    fontWeight: '600', fontSize: '0.85rem'
                                }}
                            >
                                <Send size={15} /> Submit Quiz
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Right Panel: Question Navigator ── */}
                <div style={{
                    width: '240px', borderLeft: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)', padding: '1.5rem',
                    overflowY: 'auto', flexShrink: 0,
                    display: 'none' // hidden on mobile, shown on larger screens via CSS
                }}
                    className="quiz-navigator"
                >
                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                        Question Map
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                        {[
                            { color: 'var(--brand-primary)', label: 'Answered' },
                            { color: '#d97706', label: 'Flagged' },
                            { color: 'var(--border-color)', label: 'Unanswered' }
                        ].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: l.color }} />
                                {l.label}
                            </div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                        {questions.map((_, idx) => {
                            const status = getQStatus(idx);
                            const cfg = statusColors[status];
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentQ(idx)}
                                    style={{
                                        aspectRatio: '1', borderRadius: '6px',
                                        background: cfg.bg, color: cfg.color,
                                        border: `1.5px solid ${cfg.border}`,
                                        cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Progress</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--brand-primary)' }}>
                            {answeredCount}/{totalQ}
                        </div>
                        <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '0.5rem' }}>
                            <div style={{
                                width: `${(answeredCount / totalQ) * 100}%`,
                                height: '100%', borderRadius: '2px',
                                background: 'var(--brand-primary)', transition: 'width 0.3s'
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Confirm Submit Modal ── */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => !submitting && setShowConfirm(false)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 10000,
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'var(--bg-secondary)', borderRadius: '20px',
                                padding: '2rem', maxWidth: '400px', width: '100%',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                                    {answeredCount === totalQ ? '✅' : '⚠️'}
                                </div>
                                <h3 style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                    Submit Quiz?
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                                    You've answered <strong style={{ color: 'var(--brand-primary)' }}>{answeredCount}</strong> of{' '}
                                    <strong>{totalQ}</strong> questions.
                                    {answeredCount < totalQ && (
                                        <span style={{ color: '#d97706', display: 'block', marginTop: '0.25rem' }}>
                                            ⚠️ {totalQ - answeredCount} question{totalQ - answeredCount !== 1 ? 's' : ''} unanswered.
                                        </span>
                                    )}
                                </p>
                                {error && (
                                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(220,38,38,0.1)', borderRadius: '8px', color: '#dc2626', fontSize: '0.8rem' }}>
                                        {error}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    disabled={submitting}
                                    style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '10px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                        cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem'
                                    }}
                                >
                                    Review
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '10px',
                                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                        color: 'white', border: 'none', cursor: submitting ? 'wait' : 'pointer',
                                        fontWeight: '700', fontSize: '0.9rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? (
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                                            <Brain size={16} />
                                        </motion.div>
                                    ) : <Send size={15} />}
                                    {submitting ? 'Submitting…' : 'Confirm Submit'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigator style — show on desktop */}
            <style>{`
                @media (min-width: 768px) {
                    .quiz-navigator { display: block !important; }
                }
            `}</style>
        </div>
    );
};

export default QuizAttempt;
