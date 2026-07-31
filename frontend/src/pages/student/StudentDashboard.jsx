import { Routes, Route } from 'react-router-dom';
import StudentSidebar from '../../components/student/StudentSidebar';
import { useAuth } from '../../context/AuthContext';

import HistoryPage from './HistoryPage';
import LeavePage from './LeavePage';
import SubjectsPage from './SubjectsPage';
import StudentTimetable from './StudentTimetable';
import StudentAssignments from './StudentAssignments';
import StudentResults from './StudentResults';
import QuizHub from '../quiz/QuizHub';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Activity, Calendar as CalendarIcon, Shield, Check, Menu, X, User, Mail, BookOpen, Building2, GraduationCap, Hash, ChevronDown, Flame, Trophy, Sparkles, Target, CheckCircle2, TrendingUp, AlertTriangle, TrendingDown, Sun, PlayCircle, CheckCircle, Clock } from 'lucide-react';
import NotificationDropdown from '../../components/shared/NotificationDropdown';
import ThemeToggle from '../../components/shared/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────
   Attendance Percentage Ring (SVG)
───────────────────────────────────────── */
const AttendanceRing = ({ present, total }) => {
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const radius = 60;
    const stroke = 11;
    const normalizedRadius = radius - stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // ≥90 Excellent | ≥75 Good | <75 Warning
    const tier =
        percentage >= 90 ? 'excellent' :
            percentage >= 75 ? 'good' :
                'warning';

    const TIERS = {
        excellent: {
            color: '#16a34a',
            glow: 'rgba(22,163,74,0.25)',
            bg: 'rgba(22,163,74,0.1)',
            border: 'rgba(22,163,74,0.3)',
            text: '#16a34a',
            label: 'Excellent',
        },
        good: {
            color: '#f59e0b',
            glow: 'rgba(245,158,11,0.22)',
            bg: 'rgba(245,158,11,0.1)',
            border: 'rgba(245,158,11,0.3)',
            text: '#d97706',
            label: 'Good',
        },
        warning: {
            color: '#ef4444',
            glow: 'rgba(239,68,68,0.22)',
            bg: 'rgba(239,68,68,0.1)',
            border: 'rgba(239,68,68,0.3)',
            text: '#ef4444',
            label: 'Warning',
        }
    };

    const cfg = TIERS[tier];

    // ── Smart insight calculation ──────────────────────────────
    // Classes needed to reach a target %: ceil((target*total - present) / (1 - target))
    const classesTo75 = total > 0 && percentage < 75
        ? Math.ceil((0.75 * total - present) / 0.25)
        : 0;
    const classesTo90 = total > 0 && percentage < 90
        ? Math.ceil((0.90 * total - present) / 0.10)
        : 0;

    const insights = (() => {
        if (tier === 'excellent') return [
            { icon: <Sparkles size={16} color="#16a34a" />, text: 'You are in Excellent Standing!', sub: 'Top-tier performance. Stay consistent.' },
            { icon: <Target size={16} color="#16a34a" />, text: `${present} of ${total} classes attended`, sub: `${100 - percentage}% buffer before dropping below 90%.` },
        ];
        if (tier === 'good') return [
            { icon: <CheckCircle2 size={16} color="#f59e0b" />, text: 'You are in Good Standing', sub: 'Above the 75% minimum requirement.' },
            { icon: <TrendingUp size={16} color="#f59e0b" />, text: `${classesTo90} more class${classesTo90 !== 1 ? 'es' : ''} to reach 90%`, sub: 'Aim higher for Excellent standing.' },
        ];
        // warning
        return [
            { icon: <AlertTriangle size={16} color="#ef4444" />, text: `Need ${classesTo75} more class${classesTo75 !== 1 ? 'es' : ''} to reach 75%`, sub: 'Attend all upcoming sessions urgently.' },
            { icon: <TrendingDown size={16} color="#ef4444" />, text: 'Attendance below safe threshold', sub: 'Risk of shortage — contact your coordinator.' },
        ];
    })();
    // ──────────────────────────────────────────────────────────

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.75rem 1.5rem',
            borderRadius: '0.75rem',
            border: `1px solid ${cfg.border}`,
            boxShadow: `0 0 18px ${cfg.glow}`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            transition: 'box-shadow 0.4s ease'
        }}>
            {/* Title */}
            <h3 style={{
                fontSize: '0.9rem', fontWeight: '700',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                margin: 0
            }}>
                Attendance Performance
            </h3>

            {/* SVG Ring */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
                    <circle stroke="var(--border-color)" fill="transparent" strokeWidth={stroke}
                        r={normalizedRadius} cx={radius} cy={radius} />
                    <motion.circle stroke={cfg.color} fill="transparent" strokeWidth={stroke + 4}
                        strokeDasharray={`${circumference} ${circumference}`} strokeLinecap="round"
                        r={normalizedRadius} cx={radius} cy={radius}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        style={{ opacity: 0.18, filter: 'blur(4px)' }}
                    />
                    <motion.circle stroke={cfg.color} fill="transparent" strokeWidth={stroke}
                        strokeDasharray={`${circumference} ${circumference}`} strokeLinecap="round"
                        r={normalizedRadius} cx={radius} cy={radius}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                    />
                </svg>
                <div style={{
                    position: 'absolute', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', textAlign: 'center'
                }}>
                    <motion.span
                        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                        style={{ fontSize: '1.8rem', fontWeight: '900', color: cfg.color, lineHeight: 1 }}
                    >
                        {percentage}%
                    </motion.span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '3px', letterSpacing: '0.04em' }}>
                        OVERALL
                    </span>
                </div>
            </div>

            {/* Status Badge */}
            <motion.span
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                style={{
                    padding: '0.35rem 1.1rem', borderRadius: '999px',
                    fontSize: '0.8rem', fontWeight: '800',
                    background: cfg.bg, color: cfg.text,
                    border: `1px solid ${cfg.border}`,
                    letterSpacing: '0.04em'
                }}
            >
                {cfg.label}
            </motion.span>

            {/* ── Insight Sub-Card ─────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.4 }}
                style={{
                    width: '100%',
                    borderRadius: '0.6rem',
                    border: `1px solid ${cfg.border}`,
                    background: `linear-gradient(135deg, ${cfg.bg}, transparent)`,
                    overflow: 'hidden'
                }}
            >
                {/* Sub-card header strip */}
                <div style={{
                    padding: '0.4rem 0.75rem',
                    borderBottom: `1px solid ${cfg.border}`,
                    background: `${cfg.bg}`,
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}>
                    <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: cfg.color,
                        boxShadow: `0 0 6px ${cfg.color}`
                    }} />
                    <span style={{
                        fontSize: '0.62rem', fontWeight: '800', color: cfg.text,
                        textTransform: 'uppercase', letterSpacing: '0.08em'
                    }}>
                        Performance Insights
                    </span>
                </div>

                {/* Insight rows */}
                <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {insights.map((ins, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.1 + i * 0.12, duration: 0.3 }}
                            style={{
                                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                                padding: '0.45rem 0.6rem',
                                borderRadius: '0.45rem',
                                background: 'rgba(0,0,0,0.12)',
                                border: `1px solid ${cfg.border.replace('0.3', '0.15')}`
                            }}
                        >
                            <span style={{ fontSize: '0.85rem', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>
                                {ins.icon}
                            </span>
                            <div style={{ minWidth: 0 }}>
                                <div style={{
                                    fontSize: '0.75rem', fontWeight: '700',
                                    color: cfg.text, lineHeight: '1.3'
                                }}>
                                    {ins.text}
                                </div>
                                <div style={{
                                    fontSize: '0.65rem', color: 'var(--text-secondary)',
                                    marginTop: '2px', lineHeight: '1.35'
                                }}>
                                    {ins.sub}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
            {/* ─────────────────────────────────────────────── */}
        </div>
    );
};


/* ─────────────────────────────────────────
   Profile Dropdown
───────────────────────────────────────── */
const ProfileDropdown = ({ user }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const initial = user?.name?.charAt(0)?.toUpperCase() || 'S';

    const InfoRow = ({ icon: Icon, label, value }) => {
        if (!value) return null;
        return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <Icon size={14} style={{ color: 'var(--brand-primary)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '500', marginTop: '1px' }}>{value}</div>
                </div>
            </div>
        );
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Avatar Button */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '2px',
                    background: 'none',
                    border: '2px solid var(--brand-primary)',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)'}
                onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
            >
                <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '800', fontSize: '0.9rem'
                }}>
                    {initial}
                </div>
                <ChevronDown
                    size={13}
                    style={{
                        color: 'var(--text-secondary)',
                        marginRight: '4px',
                        transition: 'transform 0.2s',
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                />
            </button>

            {/* Dropdown Card */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.18 }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 10px)',
                            right: 0,
                            width: '260px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.75rem',
                            boxShadow: 'var(--shadow-xl, 0 8px 32px rgba(0,0,0,0.25))',
                            overflow: 'hidden',
                            zIndex: 1100
                        }}
                    >
                        {/* Header banner */}
                        <div style={{
                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                            padding: '1rem 1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '900', fontSize: '1.1rem',
                                border: '2px solid rgba(255,255,255,0.4)',
                                flexShrink: 0
                            }}>
                                {initial}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: '700', color: 'white', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.name || 'Student'}
                                </div>
                                <div style={{
                                    fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)',
                                    fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em',
                                    marginTop: '2px',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'inline-block',
                                    padding: '1px 6px',
                                    borderRadius: '999px'
                                }}>
                                    {user?.role || 'Student'}
                                </div>
                            </div>
                        </div>

                        {/* Info rows */}
                        <div style={{ padding: '0.75rem 1.2rem 1rem' }}>
                            <InfoRow icon={Mail} label="Email" value={user?.email} />
                            <InfoRow
                                icon={Building2}
                                label="Department"
                                value={user?.departmentId?.departmentName || user?.departmentId?.name}
                            />
                            <InfoRow
                                icon={GraduationCap}
                                label="Class"
                                value={
                                    (user?.classId?.className || user?.classId?.name)
                                        ? `${user?.classId?.className || user?.classId?.name}${user?.section ? ' — Section ' + user.section : ''}`
                                        : user?.section ? `Section ${user.section}` : null
                                }
                            />
                                <InfoRow icon={Hash} label="Roll Number" value={user?.rollNumber} />
                            </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─────────────────────────────────────────
   Student Overview (Dashboard main content)
───────────────────────────────────────── */
const StudentOverview = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [scheduleTab, setScheduleTab] = useState('today'); // 'today' | 'tomorrow'

    const canView = user?.permissions?.includes('viewAttendance');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, subjectsRes] = await Promise.all([
                    axios.get('/student/overview').catch(() => ({ data: null })),
                    axios.get('/student/subjects').catch(() => ({ data: [] }))
                ]);
                if (statsRes && statsRes.data) setStats(statsRes.data);
                if (subjectsRes && subjectsRes.data) {
                    setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
                }
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
            }
        };
        fetchDashboardData();
    }, [user]);

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Dashboard Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Student Overview</h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'stretch' }}>
                {/* LEFT: Stats */}
                <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(99,102,241,0.3)',
                        boxShadow: '0 0 18px rgba(99,102,241,0.15)',
                        height: '100%',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                <Activity size={18} /> Attendance Stats
                            </h3>
                        </div>

                        {!canView ? (
                            <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '0.5rem', opacity: 0.6 }}>
                                <Shield size={32} style={{ marginBottom: '0.5rem', color: 'var(--text-light)' }} />
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Attendance reporting is disabled for your account.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, height: 'calc(100% - 3.5rem)' }}>
                                {/* Centered Top Card: Total Sessions with Icon */}
                                <div style={{
                                    flex: '1 1 0%',
                                    background: 'var(--bg-primary)',
                                    padding: '1.25rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justify: 'center',
                                    textAlign: 'center',
                                    gap: '0.35rem',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '50%',
                                        background: 'rgba(99,102,241,0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justify: 'center',
                                        flexShrink: 0,
                                        margin: '0 auto 0.2rem auto'
                                    }}>
                                        <BookOpen size={20} style={{ color: 'var(--brand-primary)', display: 'block', margin: 'auto' }} />
                                    </div>
                                    <div style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--brand-primary)', lineHeight: 1 }}>
                                        {stats?.totalClasses ?? 0}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        Total Sessions
                                    </div>
                                </div>

                                {/* Bottom Cards: Present, Absent, and Leave side-by-side with Icons */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.75rem', flex: '1 1 0%' }}>
                                    {/* Present Card */}
                                    <div style={{
                                        background: 'rgba(22,163,74,0.06)',
                                        padding: '1.25rem 0.5rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid rgba(22,163,74,0.25)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justify: 'center',
                                        textAlign: 'center',
                                        gap: '0.35rem'
                                    }}>
                                        <div style={{
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '50%',
                                            background: 'rgba(22,163,74,0.16)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justify: 'center',
                                            flexShrink: 0,
                                            margin: '0 auto 0.2rem auto'
                                        }}>
                                            <CheckCircle2 size={17} style={{ color: '#16a34a', display: 'block', margin: 'auto' }} />
                                        </div>
                                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#16a34a', lineHeight: 1 }}>
                                            {stats?.totalPresent ?? 0}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            Present
                                        </div>
                                    </div>

                                    {/* Absent Card */}
                                    <div style={{
                                        background: 'rgba(220,38,38,0.06)',
                                        padding: '1.25rem 0.5rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid rgba(220,38,38,0.25)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justify: 'center',
                                        textAlign: 'center',
                                        gap: '0.35rem'
                                    }}>
                                        <div style={{
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '50%',
                                            background: 'rgba(220,38,38,0.16)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justify: 'center',
                                            flexShrink: 0,
                                            margin: '0 auto 0.2rem auto'
                                        }}>
                                            <AlertTriangle size={17} style={{ color: '#dc2626', display: 'block', margin: 'auto' }} />
                                        </div>
                                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#dc2626', lineHeight: 1 }}>
                                            {stats?.totalAbsent ?? 0}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            Absent
                                        </div>
                                    </div>

                                    {/* Leave Card */}
                                    <div style={{
                                        background: 'rgba(245,158,11,0.06)',
                                        padding: '1.25rem 0.5rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid rgba(245,158,11,0.25)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justify: 'center',
                                        textAlign: 'center',
                                        gap: '0.35rem'
                                    }}>
                                        <div style={{
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '50%',
                                            background: 'rgba(245,158,11,0.16)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justify: 'center',
                                            flexShrink: 0,
                                            margin: '0 auto 0.2rem auto'
                                        }}>
                                            <Clock size={17} style={{ color: '#f59e0b', display: 'block', margin: 'auto' }} />
                                        </div>
                                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#f59e0b', lineHeight: 1 }}>
                                            {stats?.totalLeave ?? 0}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            Leave
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Attendance Performance Ring */}
                <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                    {canView && (
                        <AttendanceRing
                            present={stats?.totalPresent ?? 0}
                            total={stats?.totalClasses ?? 0}
                        />
                    )}
                </div>
            </div>

            {/* Schedule Section (Today & Tomorrow Switcher) */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <CalendarIcon size={18} className="text-brand-primary" />
                        {scheduleTab === 'today' ? `Today's Schedule (${format(new Date(), 'EEEE, MMM d')})` : `Tomorrow's Schedule (${format(new Date(Date.now() + 86400000), 'EEEE, MMM d')})`}
                    </h3>

                    {/* Today / Tomorrow Switcher Tabs */}
                    <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setScheduleTab('today')}
                            style={{
                                padding: '0.45rem 0.9rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                background: scheduleTab === 'today' ? 'var(--brand-primary)' : 'transparent',
                                color: scheduleTab === 'today' ? 'white' : 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <CalendarIcon size={14} /> Today
                        </button>
                        <button
                            onClick={() => setScheduleTab('tomorrow')}
                            style={{
                                padding: '0.45rem 0.9rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                background: scheduleTab === 'tomorrow' ? 'var(--brand-primary)' : 'transparent',
                                color: scheduleTab === 'tomorrow' ? 'white' : 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <Sun size={14} /> Tomorrow
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {(() => {
                        const targetDate = scheduleTab === 'today' ? new Date() : new Date(Date.now() + 86400000);
                        const targetDayName = format(targetDate, 'EEEE').toLowerCase();

                        const scheduledClasses = subjects.filter(s => {
                            const day = (s.dayOfWeek || s.day_of_week || '').toString().trim().toLowerCase();
                            return day === targetDayName || (day.length >= 3 && targetDayName.startsWith(day.substring(0, 3))) || (targetDayName.length >= 3 && day.startsWith(targetDayName.substring(0, 3)));
                        }).sort((a, b) => {
                            const parseTime = (timeStr) => {
                                if (!timeStr) return 0;
                                const parts = timeStr.trim().split(' ');
                                if (parts.length < 2) return 0;
                                const [t, modifier] = parts;
                                const [h, m] = t.split(':');
                                let hh = parseInt(h, 10) || 0;
                                let mm = parseInt(m, 10) || 0;
                                if (modifier === 'PM' && hh !== 12) hh += 12;
                                if (modifier === 'AM' && hh === 12) hh = 0;
                                return hh * 60 + mm;
                            };
                            return parseTime(a.startTime || a.timeSlot) - parseTime(b.startTime || b.timeSlot);
                        });

                        if (scheduledClasses.length === 0) {
                            return (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', background: 'var(--bg-primary)', borderRadius: '0.5rem', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    No scheduled classes found for {scheduleTab === 'today' ? `today (${format(new Date(), 'EEEE')})` : `tomorrow (${format(new Date(Date.now() + 86400000), 'EEEE')})`}.
                                </div>
                            );
                        }

                        return scheduledClasses.map((s, i) => {
                            const parseTime = (timeStr) => {
                                if (!timeStr) return 0;
                                const parts = timeStr.trim().split(' ');
                                if (parts.length < 2) return 0;
                                const [t, modifier] = parts;
                                const [h, m] = t.split(':');
                                let hh = parseInt(h, 10) || 0;
                                let mm = parseInt(m, 10) || 0;
                                if (modifier === 'PM' && hh !== 12) hh += 12;
                                if (modifier === 'AM' && hh === 12) hh = 0;
                                return hh * 60 + mm;
                            };

                            let statusBadge = { label: 'Tomorrow', bg: 'rgba(79, 70, 229, 0.1)', color: 'var(--brand-primary)', icon: <Clock size={12} /> };

                            if (scheduleTab === 'today') {
                                const now = new Date();
                                const curMins = now.getHours() * 60 + now.getMinutes();
                                const startMins = parseTime(s.startTime);
                                const endMins = parseTime(s.endTime);

                                statusBadge = { label: 'Upcoming', bg: 'rgba(79, 70, 229, 0.1)', color: 'var(--brand-primary)', icon: <Clock size={12} /> };
                                if (startMins > 0 && endMins > 0) {
                                    if (curMins >= startMins && curMins < endMins) {
                                        statusBadge = { label: 'Live Now', bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', icon: <PlayCircle size={12} /> };
                                    } else if (curMins >= endMins) {
                                        statusBadge = { label: 'Completed', bg: 'rgba(156, 163, 175, 0.15)', color: 'var(--text-secondary)', icon: <CheckCircle size={12} /> };
                                    }
                                }
                            }

                            return (
                                <div key={s._id || i} style={{
                                    background: 'var(--bg-primary)',
                                    padding: '1.2rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--border-color)',
                                    borderLeft: '4px solid ' + (statusBadge.label.includes('Live') ? 'var(--success)' : statusBadge.label.includes('Completed') ? 'var(--border-color)' : 'var(--brand-primary)'),
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    position: 'relative'
                                }}>
                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: statusBadge.bg, color: statusBadge.color, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        {statusBadge.icon} {statusBadge.label}
                                    </div>
                                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem', paddingRight: '5rem' }}>
                                        {s.subjectId?.subjectName || s.subjectId?.name || s.subjectName || 'Assigned Subject'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Clock size={13} /> {s.startTime ? `${s.startTime} - ${s.endTime}` : s.timeSlot} {s.roomNumber ? `(${s.roomNumber})` : ''}
                                    </div>
                                    {(s.teacherId?.name || s.teacherName) && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <User size={13} /> {s.teacherId?.name || s.teacherName}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────
   Root Dashboard Layout
───────────────────────────────────────── */
const StudentDashboard = () => {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="app-container" style={{ background: 'var(--bg-primary)' }}>
            <StudentSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <main className="dashboard-main">
                <header className="glass-panel dashboard-header">
                    <div className="flex-row-mobile">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
                                <Menu size={24} />
                            </button>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Student Portal</h1>
                        </div>
                    </div>
                    <div className="dashboard-header-actions">
                        {/* Account Level badge */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="group">
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(245, 158, 11, 0.1)',
                                color: 'var(--warning)',
                                cursor: 'help',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}>
                                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                    <Shield size={18} />
                                </motion.div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Account Level</span>
                            </div>

                            <div className="permissions-tooltip" style={{
                                position: 'fixed', top: '5rem', right: '0.75rem',
                                width: 'min(240px, calc(100vw - 1.5rem))',
                                background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '1rem',
                                boxShadow: 'var(--shadow-xl)', padding: '1rem', zIndex: 9999,
                                visibility: 'hidden', opacity: 0, transition: 'all 0.2s'
                            }}>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Student Status</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                                        <Check size={14} className="text-success" />
                                        <span style={{ fontWeight: '700' }}>Active Enrollment</span>
                                    </div>
                                </div>
                                <style>{`.group:hover .permissions-tooltip { visibility: visible !important; opacity: 1 !important; transform: translateY(5px); }`}</style>
                            </div>
                        </div>

                        <NotificationDropdown />
                        {/* Functional Profile Dropdown */}
                        <ProfileDropdown user={user} />
                    </div>
                </header>

                <div style={{ flex: 1 }}>
                    <Routes>
                        <Route path="/" element={<StudentOverview />} />
                        <Route path="/history" element={user?.permissions?.includes('viewAttendance') ? <HistoryPage /> : <StudentOverview />} />
                        <Route path="/leaves" element={<LeavePage />} />
                        <Route path="/subjects" element={<SubjectsPage />} />
                        <Route path="/assignments" element={<StudentAssignments />} />
                        <Route path="/results" element={<StudentResults />} />
                        <Route path="/timetable" element={<StudentTimetable />} />
                        <Route path="/quiz/*" element={<QuizHub />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
