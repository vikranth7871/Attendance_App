import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, User, Calendar, X, Loader2, Clock, CheckCircle2, XCircle,
    AlertCircle, Award, FileText, ChevronRight, BarChart3, ClipboardList,
    MapPin, GraduationCap, TrendingUp
} from 'lucide-react';

/* ─────────────────────── Subject Detail Drawer ─────────────────────── */
const SubjectDetailDrawer = ({ subjectId, subjectName, onClose }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!subjectId) return;
        const fetchDetails = async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await axios.get(`/student/subjects/${subjectId}/details`);
                setDetails(data);
            } catch (err) {
                console.error('Failed to fetch subject details:', err);
                setError('Failed to load subject details.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [subjectId]);

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const tabs = [
        { key: 'overview', label: 'Overview', icon: BarChart3 },
        { key: 'exams', label: 'Exams & Marks', icon: Award },
        { key: 'upcoming', label: 'Upcoming', icon: Clock },
        { key: 'assignments', label: 'Assignments', icon: ClipboardList },
    ];

    const att = details?.attendance || { present: 0, absent: 0, leave: 0, total: 0, percentage: 0 };
    const results = details?.results || [];
    const upcoming = details?.upcomingExams || [];
    const assignments = details?.assignments || [];
    const subject = details?.subject || {};

    const attColor = att.percentage >= 75 ? '#10b981' : att.percentage >= 50 ? '#f59e0b' : '#ef4444';

    const getGradeColor = (grade) => {
        if (!grade) return 'var(--text-secondary)';
        const g = grade.toUpperCase();
        if (g === 'A+' || g === 'A') return '#10b981';
        if (g === 'B+' || g === 'B') return '#6366f1';
        if (g === 'C+' || g === 'C') return '#f59e0b';
        return '#ef4444';
    };

    const drawerContent = (
        <>
            {/* Backdrop + Centering Wrapper */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: 'min(640px, 92vw)', maxHeight: '88vh',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '20px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0
                }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                        color: '#818cf8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <BookOpen size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {subjectName || subject.name || 'Subject Details'}
                        </h2>
                        {subject.teacher?.name && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <User size={12} /> {subject.teacher.name}
                                {subject.code && <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.4rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>{subject.code}</span>}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Tab Bar */}
                <div style={{
                    display: 'flex', gap: '0.25rem', padding: '0.75rem 1.5rem 0',
                    borderBottom: '1px solid var(--border-color)', flexShrink: 0,
                    overflowX: 'auto'
                }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '0.6rem 1rem', border: 'none', cursor: 'pointer',
                                    background: 'transparent',
                                    color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                    fontWeight: isActive ? '700' : '500',
                                    fontSize: '0.82rem',
                                    borderBottom: isActive ? '2.5px solid var(--brand-primary)' : '2.5px solid transparent',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    whiteSpace: 'nowrap', transition: 'all 0.2s',
                                    marginBottom: '-1px'
                                }}
                            >
                                <Icon size={14} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                            <Loader2 size={32} className="spin" style={{ color: 'var(--brand-primary)', margin: '0 auto 0.75rem' }} />
                            <p>Loading subject details...</p>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#ef4444' }}>
                            <AlertCircle size={32} style={{ opacity: 0.4, margin: '0 auto 0.75rem' }} />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                            >
                                {/* ─── OVERVIEW TAB ─── */}
                                {activeTab === 'overview' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {/* Attendance Ring Card */}
                                        <div style={{
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                            borderRadius: '16px', padding: '1.5rem',
                                            display: 'flex', alignItems: 'center', gap: '1.5rem'
                                        }}>
                                            {/* Ring */}
                                            <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                                                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={attColor} strokeWidth="3"
                                                        strokeDasharray={`${att.percentage * 0.974} 100`}
                                                        strokeLinecap="round"
                                                        style={{ transition: 'stroke-dasharray 0.6s ease' }}
                                                    />
                                                </svg>
                                                <div style={{
                                                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <span style={{ fontSize: '1.3rem', fontWeight: '800', color: attColor }}>{att.percentage}%</span>
                                                </div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                                                    Attendance Breakdown
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(16,185,129,0.08)', borderRadius: '8px' }}>
                                                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#10b981' }}>{att.present}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Present</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(239,68,68,0.08)', borderRadius: '8px' }}>
                                                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ef4444' }}>{att.absent}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Absent</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px' }}>
                                                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#6366f1' }}>{att.total}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Total</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Stats Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div style={{
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                borderRadius: '12px', padding: '1rem',
                                                display: 'flex', alignItems: 'center', gap: '0.75rem'
                                            }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Award size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>{results.length}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Exams Taken</div>
                                                </div>
                                            </div>
                                            <div style={{
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                borderRadius: '12px', padding: '1rem',
                                                display: 'flex', alignItems: 'center', gap: '0.75rem'
                                            }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Clock size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>{upcoming.length}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Upcoming Exams</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Schedule Slots */}
                                        {subject.slots && subject.slots.length > 0 && (
                                            <div style={{
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                borderRadius: '12px', padding: '1rem'
                                            }}>
                                                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                                    Weekly Schedule
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {[...subject.slots].sort((a, b) => {
                                                        const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
                                                        const dayDiff = (dayOrder[a.day] || 8) - (dayOrder[b.day] || 8);
                                                        if (dayDiff !== 0) return dayDiff;
                                                        return (a.startTime || '').localeCompare(b.startTime || '');
                                                    }).map((slot, i) => (
                                                        <div key={i} style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            padding: '0.6rem 0.75rem', background: 'var(--bg-primary)',
                                                            borderRadius: '8px', border: '1px solid var(--border-color)',
                                                            fontSize: '0.82rem'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <Calendar size={14} style={{ color: 'var(--brand-primary)' }} />
                                                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{slot.day}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                                                {slot.startTime && <span><Clock size={11} style={{ marginRight: '0.2rem' }} />{slot.startTime} – {slot.endTime}</span>}
                                                                {slot.room && <span><MapPin size={11} style={{ marginRight: '0.2rem' }} />{slot.room}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recent Attendance Timeline */}
                                        {att.recentHistory && att.recentHistory.length > 0 && (
                                            <div style={{
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                borderRadius: '12px', padding: '1rem'
                                            }}>
                                                <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                                    Recent Attendance
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                                    {att.recentHistory.slice(0, 20).map((h, i) => (
                                                        <div
                                                            key={i}
                                                            title={`${new Date(h.date).toLocaleDateString()} — ${h.status}`}
                                                            style={{
                                                                width: '28px', height: '28px', borderRadius: '6px',
                                                                background: h.status === 'present' ? 'rgba(16,185,129,0.15)' : h.status === 'absent' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                                                                color: h.status === 'present' ? '#10b981' : h.status === 'absent' ? '#ef4444' : '#6366f1',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.65rem', fontWeight: '700', cursor: 'default'
                                                            }}
                                                        >
                                                            {h.status === 'present' ? 'P' : h.status === 'absent' ? 'A' : 'L'}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─── EXAMS & MARKS TAB ─── */}
                                {activeTab === 'exams' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {results.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
                                                <Award size={40} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
                                                <p style={{ fontWeight: '500' }}>No exam results available yet.</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Average Score Bar */}
                                                {(() => {
                                                    const avgPct = results.length > 0
                                                        ? Math.round(results.reduce((s, r) => s + ((r.marks_obtained / (r.max_marks || 100)) * 100), 0) / results.length)
                                                        : 0;
                                                    return (
                                                        <div style={{
                                                            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                                                            border: '1px solid rgba(99,102,241,0.2)',
                                                            borderRadius: '12px', padding: '1rem',
                                                            display: 'flex', alignItems: 'center', gap: '1rem'
                                                        }}>
                                                            <TrendingUp size={22} style={{ color: '#818cf8' }} />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Average Score</div>
                                                                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)' }}>{avgPct}%</div>
                                                            </div>
                                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{results.length} exam{results.length !== 1 ? 's' : ''}</div>
                                                        </div>
                                                    );
                                                })()}

                                                {results.map((r, i) => (
                                                    <div key={r.id || i} style={{
                                                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                        borderRadius: '12px', padding: '1rem',
                                                        display: 'flex', alignItems: 'center', gap: '1rem'
                                                    }}>
                                                        <div style={{
                                                            width: '44px', height: '44px', borderRadius: '12px',
                                                            background: `${getGradeColor(r.grade)}18`,
                                                            color: getGradeColor(r.grade),
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.95rem', fontWeight: '800', flexShrink: 0
                                                        }}>
                                                            {r.grade || '—'}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {r.exam_name || 'Exam'}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                {r.exam_date && <span><Calendar size={11} style={{ marginRight: '0.15rem' }} />{new Date(r.exam_date).toLocaleDateString()}</span>}
                                                                {r.remarks && <span style={{ color: '#818cf8' }}>• {r.remarks}</span>}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                                {r.marks_obtained}<span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>/{r.max_marks || 100}</span>
                                                            </div>
                                                            <div style={{
                                                                width: '60px', height: '4px', background: 'var(--border-color)',
                                                                borderRadius: '4px', overflow: 'hidden', marginTop: '0.3rem', marginLeft: 'auto'
                                                            }}>
                                                                <div style={{
                                                                    width: `${Math.min(100, (r.marks_obtained / (r.max_marks || 100)) * 100)}%`,
                                                                    height: '100%', background: getGradeColor(r.grade),
                                                                    borderRadius: '4px', transition: 'width 0.4s'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* ─── UPCOMING EXAMS TAB ─── */}
                                {activeTab === 'upcoming' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {upcoming.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
                                                <Clock size={40} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
                                                <p style={{ fontWeight: '500' }}>No upcoming exams scheduled.</p>
                                            </div>
                                        ) : (
                                            upcoming.map((ex, i) => {
                                                const examDate = new Date(ex.exam_date);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
                                                const isUrgent = diffDays <= 3;

                                                return (
                                                    <div key={ex.id || i} style={{
                                                        background: 'var(--bg-secondary)', border: `1px solid ${isUrgent ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}`,
                                                        borderRadius: '12px', padding: '1.15rem',
                                                        borderLeft: isUrgent ? '3px solid #f59e0b' : '3px solid var(--brand-primary)'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                                                    {ex.exam_name || 'Exam'}
                                                                </div>
                                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                        <Calendar size={12} /> {examDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </span>
                                                                    {ex.time_slot && (
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                            <Clock size={12} /> {ex.time_slot}
                                                                        </span>
                                                                    )}
                                                                    {ex.room_number && (
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                            <MapPin size={12} /> Room {ex.room_number}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                <div style={{
                                                                    padding: '0.3rem 0.7rem', borderRadius: '8px',
                                                                    background: isUrgent ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.1)',
                                                                    color: isUrgent ? '#f59e0b' : '#818cf8',
                                                                    fontSize: '0.75rem', fontWeight: '700'
                                                                }}>
                                                                    {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays} days left`}
                                                                </div>
                                                                {ex.max_marks && (
                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                                                                        Max: {ex.max_marks} marks
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* ─── ASSIGNMENTS TAB ─── */}
                                {activeTab === 'assignments' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {assignments.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
                                                <ClipboardList size={40} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
                                                <p style={{ fontWeight: '500' }}>No assignments for this subject.</p>
                                            </div>
                                        ) : (
                                            assignments.map((a, i) => {
                                                const isCompleted = a.status === 'completed' || a.status === 'graded';
                                                const isPastDue = !isCompleted && a.due_date && new Date(a.due_date) < new Date();

                                                return (
                                                    <div key={a.id || i} style={{
                                                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                        borderRadius: '12px', padding: '1rem',
                                                        display: 'flex', alignItems: 'center', gap: '0.85rem'
                                                    }}>
                                                        <div style={{
                                                            width: '38px', height: '38px', borderRadius: '10px',
                                                            background: isCompleted ? 'rgba(16,185,129,0.12)' : isPastDue ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                                            color: isCompleted ? '#10b981' : isPastDue ? '#ef4444' : '#f59e0b',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                        }}>
                                                            {isCompleted ? <CheckCircle2 size={18} /> : isPastDue ? <XCircle size={18} /> : <FileText size={18} />}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {a.title}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                                                                {a.teacher_name && <span>• {a.teacher_name}</span>}
                                                            </div>
                                                        </div>
                                                        <div style={{
                                                            padding: '0.25rem 0.6rem', borderRadius: '6px',
                                                            background: isCompleted ? 'rgba(16,185,129,0.1)' : isPastDue ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                            color: isCompleted ? '#10b981' : isPastDue ? '#ef4444' : '#f59e0b',
                                                            fontSize: '0.72rem', fontWeight: '700', textTransform: 'capitalize', flexShrink: 0
                                                        }}>
                                                            {isCompleted ? 'Done' : isPastDue ? 'Overdue' : 'Pending'}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
                </motion.div>
            </motion.div>
        </>
    );

    return ReactDOM.createPortal(drawerContent, document.body);
};


/* ─────────────────────── Main Subjects Page ─────────────────────── */
const SubjectsPage = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedSubject, setSelectedSubject] = useState(null); // { id, name }

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const { data } = await axios.get('/student/subjects');
                setSubjects(data);
            } catch (err) {
                console.error('Failed to fetch subjects:', err);
                setError('Failed to load subjects. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchSubjects();
    }, []);

    const uniqueSubjectCards = React.useMemo(() => {
        const map = new Map();
        subjects.forEach(sub => {
            const subId = sub.subjectId?._id || sub.subjectId?.id || sub.subjectId || sub._id;
            if (!map.has(subId)) {
                map.set(subId, {
                    ...sub,
                    allSlots: []
                });
            }
            if (sub.dayOfWeek || sub.timeSlot || sub.startTime) {
                map.get(subId).allSlots.push(sub);
            }
        });
        return Array.from(map.values()).map(item => {
            let scheduleBadge = 'Individual Assignment';
            if (item.allSlots.length > 0) {
                const days = [...new Set(item.allSlots.map(s => s.dayOfWeek ? s.dayOfWeek.substring(0, 3) : ''))].filter(Boolean).join(', ');
                scheduleBadge = `${item.allSlots.length} Weekly Slot${item.allSlots.length > 1 ? 's' : ''} (${days})`;
            }
            return {
                ...item,
                scheduleBadge
            };
        });
    }, [subjects]);

    const handleCardClick = useCallback((subject) => {
        const subjectId = subject.subjectId?.id || subject.subjectId?._id || subject.subjectId;
        const subjectName = subject.subjectId?.subjectName || subject.subjectId?.name || 'Subject';
        setSelectedSubject({ id: subjectId, name: subjectName });
    }, []);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading subjects...</div>;
    if (error) return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>{error}</div>;

    return (
        <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>My Subjects</h1>
                <p style={{ color: 'var(--text-secondary)' }}>All subjects assigned to your class. Click a subject for detailed info.</p>
            </div>

            {subjects.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <BookOpen size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                    <p>No subjects have been assigned to your class yet.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
                    {uniqueSubjectCards.map((subject, index) => (
                        <motion.div
                            key={subject._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(99,102,241,0.15)' }}
                            className="glass-panel"
                            onClick={() => handleCardClick(subject)}
                            style={{
                                padding: '1.5rem',
                                borderTop: subject.isIndividuallyAssigned ? '4px solid #10b981' : '4px solid var(--brand-primary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.25s, transform 0.25s'
                            }}
                        >
                            {subject.isIndividuallyAssigned ? (
                                <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '1rem', fontWeight: 'bold' }}>
                                    Individual
                                </div>
                            ) : (
                                <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--brand-primary)', borderRadius: '1rem', fontWeight: 'bold' }}>
                                    Class Subject
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '0.5rem',
                                    background: subject.isIndividuallyAssigned ? 'rgba(16, 185, 129, 0.1)' : 'rgba(79, 70, 229, 0.1)',
                                    color: subject.isIndividuallyAssigned ? '#10b981' : 'var(--brand-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                                        {subject.subjectId?.subjectName || 'Unknown Subject'}
                                    </h3>
                                    {subject.scheduleBadge && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: '600', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Calendar size={13} /> {subject.scheduleBadge}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                marginTop: 'auto', padding: '0.75rem', background: 'var(--bg-primary)',
                                borderRadius: '0.5rem', border: '1px solid var(--border-color)',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                <User size={16} color="var(--text-secondary)" />
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taught By</div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                        {subject.teacherId ? subject.teacherId.name : 'Unassigned'}
                                    </div>
                                </div>
                            </div>

                            {/* Subject Attendance Breakdown */}
                            <div style={{
                                padding: '0.85rem 1rem',
                                background: 'var(--bg-primary)',
                                borderRadius: '0.6rem',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Subject Attendance
                                    </span>
                                    <span style={{
                                        fontSize: '0.85rem', fontWeight: '800',
                                        color: (subject.attendance?.percentage >= 75 || subject.attendance?.total === 0) ? '#16a34a' : '#ef4444'
                                    }}>
                                        {subject.attendance?.total > 0 ? `${subject.attendance.percentage}%` : 'No Classes Yet'}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${subject.attendance?.total > 0 ? subject.attendance.percentage : 0}%`,
                                        height: '100%',
                                        background: subject.attendance?.percentage >= 75 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                                        borderRadius: '999px',
                                        transition: 'width 0.6s ease'
                                    }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    <span>Present: <strong style={{ color: '#16a34a' }}>{subject.attendance?.present || 0}</strong></span>
                                    <span>Absent: <strong style={{ color: '#ef4444' }}>{subject.attendance?.absent || 0}</strong></span>
                                    <span>Total: <strong>{subject.attendance?.total || 0}</strong></span>
                                </div>
                            </div>

                            {/* Click hint */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                                fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.6
                            }}>
                                <span>View Details</span>
                                <ChevronRight size={12} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Subject Detail Drawer */}
            <AnimatePresence>
                {selectedSubject && (
                    <SubjectDetailDrawer
                        subjectId={selectedSubject.id}
                        subjectName={selectedSubject.name}
                        onClose={() => setSelectedSubject(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubjectsPage;
