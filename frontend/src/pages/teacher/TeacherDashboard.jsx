import { Routes, Route } from 'react-router-dom';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Clock, Users, Shield, Check, X, Menu,
    Mail, Building2, GraduationCap, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    FileBarChart2, Download, Filter, Loader2, AlertCircle,
    CheckCircle2, XCircle, MinusCircle, Calendar, Search, User, Building, ShieldAlert, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TeacherSidebar from '../../components/teacher/TeacherSidebar';
import DocumentModal from '../../components/shared/DocumentModal';

import ManualAttendance from './ManualAttendance';
import NotificationDropdown from '../../components/shared/NotificationDropdown';
import ThemeToggle from '../../components/shared/ThemeToggle';
import TimetableGrid from '../../components/shared/TimetableGrid';
import ClassRoster from './ClassRoster';
import TeacherQuizManage from './TeacherQuizManage';
import TeacherApplyLeave from './TeacherApplyLeave';
import TeacherAssignments from './TeacherAssignments';
import TeacherExams from './TeacherExams';
import TeacherMessages from './TeacherMessages';

/* ──────────────────────────────────────────
   Teacher Profile Dropdown
────────────────────────────────────────── */
const TeacherProfileDropdown = ({ user }) => {
    const [open, setOpen] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [loadedOnce, setLoadedOnce] = useState(false);
    const ref = useRef(null);

    // Fetch subjects lazily on first open
    useEffect(() => {
        if (open && !loadedOnce) {
            axios.get('/teacher/subjects')
                .then(({ data }) => { setSubjects(data); setLoadedOnce(true); })
                .catch(() => setLoadedOnce(true));
        }
    }, [open, loadedOnce]);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const initial = user?.name?.charAt(0)?.toUpperCase() || 'T';
    const isCoordinator = !!user?.classCoordinatorFor;

    // Unique classes teaching: "Subject – ClassName Section"
    const teachingRows = subjects.reduce((acc, s) => {
        const subName = s.subjectId?.subjectName || 'Unknown Subject';
        const cls = s.classId;
        const clsLabel = cls ? `${cls.className}${cls.section ? ' – ' + cls.section : ''}` : 'Unknown Class';
        const key = `${subName}|${clsLabel}`;
        if (!acc.find(x => x.key === key)) acc.push({ key, subName, clsLabel });
        return acc;
    }, []);

    // Find coordinator class name from subjects (if it matches)
    const coordClass = subjects.find(
        s => s.classId?._id?.toString() === user?.classCoordinatorFor?.toString()
    )?.classId;
    const coordLabel = coordClass
        ? `${coordClass.className}${coordClass.section ? ' – ' + coordClass.section : ''}`
        : isCoordinator ? 'Class Coordinator' : null;

    const InfoRow = ({ icon: Icon, label, value }) => {
        if (!value) return null;
        return (
            <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)'
            }}>
                <Icon size={14} style={{ color: 'var(--brand-secondary)', marginTop: '2px', flexShrink: 0 }} />
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
                id="teacher-profile-btn"
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '2px', background: 'none',
                    border: '2px solid var(--brand-secondary)',
                    borderRadius: '50px', cursor: 'pointer',
                    transition: 'box-shadow 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.25)'}
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
                        color: 'var(--text-secondary)', marginRight: '4px',
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
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                            width: '270px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.75rem',
                            boxShadow: 'var(--shadow-xl, 0 8px 32px rgba(0,0,0,0.30))',
                            overflow: 'hidden', zIndex: 1100
                        }}
                    >
                        {/* Header banner */}
                        <div style={{
                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                            padding: '1rem 1.2rem', display: 'flex',
                            alignItems: 'center', gap: '0.75rem'
                        }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '900', fontSize: '1.1rem',
                                border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0
                            }}>
                                {initial}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: '700', color: 'white', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.name || 'Teacher'}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        fontSize: '0.65rem', color: 'rgba(255,255,255,0.85)',
                                        fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em',
                                        background: 'rgba(255,255,255,0.15)',
                                        padding: '1px 7px', borderRadius: '999px'
                                    }}>
                                        {user?.role || 'Teacher'}
                                    </span>
                                    {isCoordinator && (
                                        <span style={{
                                            fontSize: '0.65rem', color: 'rgba(255,255,255,0.9)',
                                            fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em',
                                            background: 'rgba(16,185,129,0.35)',
                                            border: '1px solid rgba(16,185,129,0.5)',
                                            padding: '1px 7px', borderRadius: '999px'
                                        }}>
                                            Coordinator
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info rows */}
                        <div style={{ padding: '0.75rem 1.2rem 1rem' }}>
                            <InfoRow icon={Mail} label="Email" value={user?.email} />
                            <InfoRow
                                icon={Building2} label="Department"
                                value={user?.departmentId?.departmentName || user?.departmentId?.name}
                            />

                            {/* Teaching Classes */}
                            {teachingRows.length > 0 && (
                                <div style={{
                                    padding: '0.5rem 0',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <BookOpen size={14} style={{ color: 'var(--brand-secondary)', flexShrink: 0, marginTop: '2px' }} />
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Teaching
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1.4rem' }}>
                                        {teachingRows.map(r => (
                                            <div key={r.key} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                                                <span style={{ color: 'var(--brand-secondary)', fontWeight: '600' }}>{r.subName}</span>
                                                <span style={{ color: 'var(--text-secondary)' }}> · {r.clsLabel}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Coordinator class */}
                            {coordLabel && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', paddingTop: '0.5rem' }}>
                                    <GraduationCap size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Coordinator For
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600', marginTop: '1px' }}>
                                            {coordLabel}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


/* ──────────────────────────────────────────
   Report Modal
────────────────────────────────────────── */
const ReportModal = ({ onClose }) => {
    const [filterData, setFilterData] = useState({ classes: [], subjects: [] });
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [report, setReport] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtersLoading, setFiltersLoading] = useState(true);
    const [error, setError] = useState('');
    const [fetched, setFetched] = useState(false);

    // Load filter options (all classes & subjects the teacher teaches)
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const { data } = await axios.get('/teacher/report');
                setFilterData({ classes: data.classes || [], subjects: data.subjects || [] });
                setReport(data.report || []);
                setFetched(true);
            } catch (err) {
                setError('Failed to load report data.');
            } finally {
                setFiltersLoading(false);
            }
        };
        loadFilters();
    }, []);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (selectedClass) params.classId = selectedClass;
            if (selectedSubject) params.subjectId = selectedSubject;
            const { data } = await axios.get('/teacher/report', { params });
            setReport(data.report || []);
            setFetched(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch report.');
        } finally {
            setLoading(false);
        }
    }, [selectedClass, selectedSubject]);

    const downloadCSV = () => {
        if (!report.length) return;
        const headers = ['Student Name', 'Roll Number', 'Class', 'Subject', 'Total Classes', 'Present', 'Absent', 'Leave', 'Attendance %'];
        const rows = report.map(r => [
            `"${r.studentName}"`,
            `"${r.rollNumber}"`,
            `"${r.className}"`,
            `"${r.subjectName}"`,
            r.total, r.present, r.absent, r.leave,
            `${r.percentage}%`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const datePart = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `attendance_report_${datePart}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getPctColor = (pct) => {
        const p = parseFloat(pct);
        if (p >= 75) return '#16a34a';
        if (p >= 50) return '#d97706';
        return '#dc2626';
    };

    const getPctBg = (pct) => {
        const p = parseFloat(pct);
        if (p >= 75) return 'rgba(22,163,74,0.1)';
        if (p >= 50) return 'rgba(217,119,6,0.1)';
        return 'rgba(220,38,38,0.1)';
    };

    return (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 2000,
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}
            >
                <motion.div
                    key="modal"
                    initial={{ opacity: 0, scale: 0.94, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 24 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: '900px',
                        maxHeight: '90vh',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '1rem',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                    {/* Modal Header */}
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FileBarChart2 size={20} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                    Attendance Report
                                </h2>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    Filter by class or subject, then download as CSV
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                                borderRadius: '8px', padding: '0.4rem', cursor: 'pointer',
                                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#dc2626'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Filters */}
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end',
                        flexShrink: 0,
                        background: 'var(--bg-primary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600' }}>
                            <Filter size={14} /> Filters
                        </div>

                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Class
                            </label>
                            <select
                                id="report-class-filter"
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                                disabled={filtersLoading}
                                style={{
                                    width: '100%', padding: '0.5rem 0.75rem',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px', color: 'var(--text-primary)',
                                    fontSize: '0.85rem', cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="">All Classes</option>
                                {filterData.classes.map(c => (
                                    <option key={c._id} value={c._id}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Subject
                            </label>
                            <select
                                id="report-subject-filter"
                                value={selectedSubject}
                                onChange={e => setSelectedSubject(e.target.value)}
                                disabled={filtersLoading}
                                style={{
                                    width: '100%', padding: '0.5rem 0.75rem',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px', color: 'var(--text-primary)',
                                    fontSize: '0.85rem', cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="">All Subjects</option>
                                {filterData.subjects.map(s => (
                                    <option key={s._id} value={s._id}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            id="report-apply-filter-btn"
                            onClick={fetchReport}
                            disabled={loading}
                            style={{
                                padding: '0.5rem 1.25rem',
                                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                color: 'white', border: 'none', borderRadius: '8px',
                                fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
                                alignSelf: 'flex-end'
                            }}
                        >
                            {loading ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
                            Apply
                        </button>

                        {fetched && report.length > 0 && (
                            <button
                                id="report-download-csv-btn"
                                onClick={downloadCSV}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    background: 'rgba(22,163,74,0.12)',
                                    color: '#16a34a',
                                    border: '1px solid rgba(22,163,74,0.3)',
                                    borderRadius: '8px', fontWeight: '600',
                                    fontSize: '0.85rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    transition: 'all 0.2s', alignSelf: 'flex-end'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.2)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.12)'; }}
                            >
                                <Download size={14} />
                                Download CSV
                            </button>
                        )}
                    </div>

                    {/* Content Area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem 1.5rem' }}>
                        {/* Error */}
                        {error && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                padding: '0.75rem 1rem',
                                background: 'rgba(220,38,38,0.08)',
                                border: '1px solid rgba(220,38,38,0.25)',
                                borderRadius: '8px', marginBottom: '1rem',
                                color: '#dc2626', fontSize: '0.85rem'
                            }}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        {/* Loading */}
                        {(loading || filtersLoading) && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: 'var(--text-secondary)' }}>
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                    <Loader2 size={32} style={{ color: 'var(--brand-primary)' }} />
                                </motion.div>
                                <span style={{ fontSize: '0.85rem' }}>Loading report data…</span>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !filtersLoading && fetched && report.length === 0 && !error && (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'center', padding: '4rem', gap: '1rem',
                                color: 'var(--text-secondary)', textAlign: 'center'
                            }}>
                                <FileBarChart2 size={48} style={{ opacity: 0.2 }} />
                                <p style={{ fontSize: '0.9rem' }}>No attendance records found for the selected filters.</p>
                                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Try adjusting the class or subject filter.</p>
                            </div>
                        )}

                        {/* Summary Stats Bar */}
                        {!loading && !filtersLoading && report.length > 0 && (() => {
                            const totals = report.reduce((acc, r) => ({
                                total: acc.total + r.total,
                                present: acc.present + r.present,
                                absent: acc.absent + r.absent,
                                leave: acc.leave + r.leave,
                            }), { total: 0, present: 0, absent: 0, leave: 0 });
                            const avgPct = totals.total > 0 ? ((totals.present / totals.total) * 100).toFixed(1) : '0.0';

                            return (
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                    gap: '0.75rem', marginBottom: '1.25rem'
                                }}>
                                    {[
                                        { label: 'Students', value: report.length, icon: <Users size={16} />, color: 'var(--brand-primary)', bg: 'rgba(99,102,241,0.1)' },
                                        { label: 'Total Classes', value: totals.total, icon: <BookOpen size={16} />, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                                        { label: 'Present', value: totals.present, icon: <CheckCircle2 size={16} />, color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
                                        { label: 'Absent', value: totals.absent, icon: <XCircle size={16} />, color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
                                        { label: 'Avg Attendance', value: `${avgPct}%`, icon: <MinusCircle size={16} />, color: getPctColor(avgPct), bg: getPctBg(avgPct) },
                                    ].map(stat => (
                                        <div key={stat.label} style={{
                                            background: stat.bg,
                                            border: `1px solid ${stat.color}30`,
                                            borderRadius: '10px', padding: '0.75rem 1rem',
                                            display: 'flex', alignItems: 'center', gap: '0.6rem'
                                        }}>
                                            <div style={{ color: stat.color }}>{stat.icon}</div>
                                            <div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        {/* Data Table */}
                        {!loading && !filtersLoading && report.length > 0 && (
                            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-primary)' }}>
                                            {['#', 'Student', 'Roll No.', 'Class', 'Subject', 'Total', 'Present', 'Absent', 'Leave', 'Attendance %'].map(h => (
                                                <th key={h} style={{
                                                    padding: '0.7rem 0.9rem', textAlign: 'left',
                                                    fontWeight: '700', fontSize: '0.7rem',
                                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                                    color: 'var(--text-secondary)',
                                                    borderBottom: '2px solid var(--border-color)',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.map((row, idx) => (
                                            <motion.tr
                                                key={idx}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03, duration: 0.18 }}
                                                style={{
                                                    borderBottom: '1px solid var(--border-color)',
                                                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                                                }}
                                                onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                                                onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                                            >
                                                <td style={{ padding: '0.65rem 0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{idx + 1}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row.studentName}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{row.rollNumber}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.className}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', color: 'var(--brand-secondary, #8b5cf6)', fontWeight: '600', whiteSpace: 'nowrap' }}>{row.subjectName}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', fontWeight: '700' }}>{row.total}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', color: '#16a34a', fontWeight: '700' }}>{row.present}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', color: '#dc2626', fontWeight: '700' }}>{row.absent}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center', color: '#d97706', fontWeight: '700' }}>{row.leave}</td>
                                                <td style={{ padding: '0.65rem 0.9rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                        padding: '0.25rem 0.6rem', borderRadius: '999px',
                                                        background: getPctBg(row.percentage),
                                                        color: getPctColor(row.percentage),
                                                        fontWeight: '800', fontSize: '0.78rem'
                                                    }}>
                                                        {row.percentage}%
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

/* ──────────────────────────────────────────
   Teacher Timetable (main route view)
────────────────────────────────────────── */
const TeacherTimetable = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const timetableRef = useRef(null);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const { data } = await axios.get('/teacher/subjects');
                setSubjects(data);
            } catch (error) {
                console.error("Failed to fetch teacher subjects", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubjects();
    }, []);

    const handleDownloadTimetable = async () => {
        if (!timetableRef.current || downloading) return;
        setDownloading(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(timetableRef.current, {
                backgroundColor: '#1a1a2e',
                scale: 2,
                useCORS: true,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `timetable_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to download timetable:', err);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your schedule...</div>;

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Dashboard Header & Animated Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Teacher Schedule</h2>
                <motion.button
                    id="download-timetable-btn"
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(91, 80, 230, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownloadTimetable}
                    disabled={downloading}
                    style={{
                        position: 'relative',
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: downloading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        overflow: 'hidden',
                        boxShadow: '0 4px 15px rgba(91, 80, 230, 0.3)',
                        opacity: downloading ? 0.7 : 1
                    }}
                >
                    <motion.div
                        animate={{ x: ['-200%', '300%'] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                        style={{
                            position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
                            background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.5), transparent)',
                            transform: 'skewX(-20deg)', zIndex: 1
                        }}
                    />
                    <Download size={18} style={{ zIndex: 2, position: 'relative' }} />
                    <span style={{ zIndex: 2, position: 'relative' }}>{downloading ? 'Downloading...' : 'Download Timetable'}</span>
                </motion.button>
            </div>

            {subjects.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                    <p style={{ color: 'var(--text-secondary)' }}>You haven't been assigned any subjects yet.</p>
                </div>
            ) : (
                <div ref={timetableRef}>
                    <TimetableGrid subjects={subjects} hideTeacher={true} />
                </div>
            )}
        </div>
    );
};

/* ──────────────────────────────────────────
   Student Quick Info Dropdown
────────────────────────────────────────── */
const StudentQuickInfo = ({ student }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);
    const popupRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                popupRef.current && !popupRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleToggle = () => {
        if (!isOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const popupWidth = 260;
            // Flip left if too close to right edge
            const left = rect.right + popupWidth > window.innerWidth
                ? rect.right - popupWidth
                : rect.left;
            setPopupPos({
                top: rect.bottom + window.scrollY + 8,
                left: Math.max(8, left + window.scrollX)
            });
        }
        setIsOpen(prev => !prev);
    };

    if (!student) return null;

    const popup = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={popupRef}
                    initial={{ opacity: 0, scale: 0.95, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 6 }}
                    transition={{ duration: 0.15 }}
                    style={{
                        position: 'absolute',
                        top: popupPos.top,
                        left: popupPos.left,
                        zIndex: 9999,
                        width: 'min(260px, calc(100vw - 16px))',
                        background: 'var(--bg-secondary)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1.2rem',
                        boxShadow: '0 20px 40px -8px rgba(0,0,0,0.25), 0 8px 16px -4px rgba(0,0,0,0.1)',
                        color: 'var(--text-primary)'
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', marginBottom: '0.2rem' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--brand-primary)', marginBottom: '2px' }}>{student.name}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Roll: {student.rollNumber}</p>
                        </div>
                        {[
                            { label: 'Email', value: student.email, icon: <Mail size={12} /> },
                            { label: 'Department', value: student.departmentId?.departmentName || student.departmentId?.name || 'N/A', icon: <Building2 size={12} /> },
                            { label: 'Section', value: student.section || 'N/A', icon: <Users size={12} /> }
                        ].map((info, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                                <div style={{ color: 'var(--brand-primary)', marginTop: '2px' }}>{info.icon}</div>
                                <div>
                                    <span style={{ color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.05em' }}>{info.label}</span>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: '500', wordBreak: 'break-all' }}>{info.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
                ref={btnRef}
                onClick={handleToggle}
                style={{
                    background: isOpen ? 'var(--brand-primary)' : 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '50%', width: '22px', height: '22px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: isOpen ? 'white' : 'var(--brand-primary)',
                    marginLeft: '0.6rem', transition: 'all 0.2s',
                    boxShadow: isOpen ? '0 0 10px rgba(99,102,241,0.4)' : 'none'
                }}
                title="Student Info"
            >
                <AlertCircle size={13} />
            </button>
            {ReactDOM.createPortal(popup, document.body)}
        </div>
    );
};

/* ──────────────────────────────────────────
   Leave Approvals (Replicated from Teacher Leave Management Template)
────────────────────────────────────────── */
const LeaveApprovals = () => {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [actionLoading, setActionLoading] = useState(null);
    const [actionModal, setActionModal] = useState(null); // { id: string, type: 'reject' | 'revoke', studentName: string }
    const [actionReason, setActionReason] = useState('');
    const [previewDoc, setPreviewDoc] = useState(null);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/leave/coordinator/all');
            setLeaves(data);
        } catch (error) {
            console.error("Failed to fetch leaves", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    // Reset page to 1 when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, searchQuery, pageSize]);

    const handleApprove = async (id) => {
        setActionLoading(id);
        try {
            await axios.put(`/leave/approve/${id}`);
            fetchLeaves();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to approve leave');
        } finally {
            setActionLoading(null);
        }
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        if (!actionModal) return;
        const { id, type } = actionModal;

        setActionLoading(id);
        try {
            if (type === 'reject') {
                await axios.put(`/leave/reject/${id}`, { reason: actionReason || 'Rejected by Coordinator' });
            } else {
                await axios.put(`/leave/revoke/${id}`, { reason: actionReason || 'Revoked by Coordinator' });
            }
            setActionModal(null);
            setActionReason('');
            fetchLeaves();
        } catch (error) {
            alert(error.response?.data?.message || `Failed to ${type} leave`);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredLeaves = leaves.filter(l => {
        const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
        const name = l.userId?.name || '';
        const roll = l.userId?.rollNumber || '';
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              roll.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (l.reason && l.reason.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    // Pagination calculations
    const totalCount = filteredLeaves.length;
    const effectivePageSize = pageSize === 'all' ? (totalCount || 1) : parseInt(pageSize, 10);
    const totalPages = Math.ceil(totalCount / effectivePageSize) || 1;
    const startIndex = (currentPage - 1) * effectivePageSize;
    const endIndex = Math.min(startIndex + effectivePageSize, totalCount);
    const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);

    // Summary counts
    const countTotal = leaves.length;
    const countPending = leaves.filter(l => l.status === 'pending').length;
    const countApproved = leaves.filter(l => l.status === 'approved').length;
    const countRejected = leaves.filter(l => l.status === 'rejected' || l.status === 'revoked').length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.78rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13} /> Approved</span>;
            case 'rejected':
                return <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.78rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={13} /> Rejected</span>;
            case 'revoked':
                return <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.78rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={13} /> Revoked</span>;
            default:
                return <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', fontSize: '0.78rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> Pending</span>;
        }
    };

    const calculateDays = (start, end) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return isNaN(diffDays) ? 1 : diffDays;
    };

    const coordClass = user?.coordinatorClassName || 'CS101-A';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
            <DocumentModal url={previewDoc} onClose={() => setPreviewDoc(null)} />

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.65rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Calendar size={28} style={{ color: 'var(--brand-primary)' }} /> Class Leave Approvals ({coordClass} Coordinator)
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
                        Review, approve, or reject student leave requests submitted for your coordinated class ({coordClass}).
                    </p>
                </div>
            </div>

            {/* Analytics Counter Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Total Requests</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>{countTotal}</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Pending Review</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f59e0b' }}>{countPending}</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Approved</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>{countApproved}</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <XCircle size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Rejected / Revoked</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ef4444' }}>{countRejected}</div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search by student name, roll number, or reason..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
                    {['all', 'pending', 'approved', 'rejected', 'revoked'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '10px', textTransform: 'capitalize',
                                fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', border: 'none',
                                background: filterStatus === status ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                                color: filterStatus === status ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Data Table View */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <Loader2 size={32} className="spin" style={{ color: 'var(--brand-primary)', margin: '0 auto 0.5rem' }} />
                    <p>Loading student leave applications...</p>
                </div>
            ) : filteredLeaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <h3>No student leave requests found</h3>
                    <p style={{ fontSize: '0.9rem' }}>There are no applications matching your search or filter.</p>
                </div>
            ) : (
                /* High Density Interactive Data Table View */
                <div className="glass-panel" style={{ padding: '0.75rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.4rem', textAlign: 'left', fontSize: '0.88rem' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '0.6rem 0.8rem', width: '30px' }}>#</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Student</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Type</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Duration & Dates</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Reason</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Document</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLeaves.map((leave, idx) => {
                                const rowId = leave._id || leave.id;
                                const isExpanded = expandedRowId === rowId;
                                const days = calculateDays(leave.startDate, leave.endDate);

                                const docUrl = leave.documentUrl ? leave.documentUrl.trim() : null;
                                let finalDocUrl = null;
                                if (docUrl) {
                                    const isAbsolute = /^https?:\/\//i.test(docUrl) || docUrl.startsWith('data:');
                                    const apiBase = (import.meta.env.VITE_API_URL || axios.defaults.baseURL || '').replace('/api', '').replace(/\/$/, '');
                                    finalDocUrl = isAbsolute ? docUrl : `${apiBase}/${docUrl.replace(/^\//, '')}`;
                                }

                                return (
                                    <React.Fragment key={rowId}>
                                        <tr
                                            style={{
                                                background: isExpanded ? 'rgba(99,102,241,0.06)' : 'var(--bg-secondary)',
                                                borderRadius: '10px', transition: 'background 0.2s',
                                                borderLeft: isExpanded ? '3px solid var(--brand-primary)' : '3px solid transparent'
                                            }}
                                        >
                                            <td style={{ padding: '0.75rem 0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                {startIndex + idx + 1}
                                            </td>

                                            <td style={{ padding: '0.75rem 0.8rem' }}>
                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    {leave.userId?.name || 'Student'}
                                                    <StudentQuickInfo student={leave.userId} />
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    Roll: {leave.userId?.rollNumber || 'N/A'}
                                                </div>
                                            </td>

                                            <td style={{ padding: '0.75rem 0.8rem' }}>
                                                <span style={{
                                                    fontSize: '0.75rem', fontWeight: '600', padding: '0.2rem 0.55rem', borderRadius: '6px',
                                                    background: leave.leaveType === 'Medical' ? 'rgba(239,68,68,0.1)' : leave.leaveType === 'Emergency' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                                                    color: leave.leaveType === 'Medical' ? '#ef4444' : leave.leaveType === 'Emergency' ? '#f59e0b' : '#6366f1'
                                                }}>
                                                    {leave.leaveType || 'General'}
                                                </span>
                                            </td>

                                            <td style={{ padding: '0.75rem 0.8rem' }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                                                </div>
                                                <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                                    <span style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                        {days} {days === 1 ? 'day' : 'days'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td style={{ padding: '0.75rem 0.8rem', maxWidth: '220px' }}>
                                                <div style={{
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    color: 'var(--text-primary)', fontSize: '0.85rem'
                                                }} title={leave.reason}>
                                                    {leave.reason}
                                                </div>
                                            </td>

                                            <td style={{ padding: '0.75rem 0.8rem' }}>
                                                {finalDocUrl ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewDoc(finalDocUrl)}
                                                        style={{
                                                            padding: '0.3rem 0.6rem', borderRadius: '6px',
                                                            background: 'rgba(91, 80, 230, 0.1)', border: '1px solid rgba(91, 80, 230, 0.25)',
                                                            color: 'var(--brand-primary)', fontWeight: '600', fontSize: '0.75rem',
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                        }}
                                                        title="View Supporting Document"
                                                    >
                                                        <FileText size={13} /> View Doc
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6 }}>No Doc</span>
                                                )}
                                            </td>

                                            <td style={{ padding: '0.75rem 0.8rem' }}>
                                                <div>
                                                    {getStatusBadge(leave.status)}
                                                    {leave.rejectionReason && (leave.status === 'rejected' || leave.status === 'revoked') && (
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.rejectionReason}>
                                                            "{leave.rejectionReason}"
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                                    {leave.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(rowId)}
                                                                disabled={actionLoading === rowId}
                                                                style={{
                                                                    padding: '0.35rem 0.65rem', borderRadius: '6px',
                                                                    background: 'rgba(16,185,129,0.15)', color: '#10b981',
                                                                    border: 'none', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                                }}
                                                                title="Approve Leave"
                                                            >
                                                                <Check size={14} /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setActionModal({ id: rowId, type: 'reject', studentName: leave.userId?.name || 'Student' });
                                                                    setActionReason('');
                                                                }}
                                                                disabled={actionLoading === rowId}
                                                                style={{
                                                                    padding: '0.35rem 0.65rem', borderRadius: '6px',
                                                                    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                                                    border: 'none', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                                }}
                                                                title="Reject Leave"
                                                            >
                                                                <X size={14} /> Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    {leave.status === 'approved' && (
                                                        <button
                                                            onClick={() => {
                                                                setActionModal({ id: rowId, type: 'revoke', studentName: leave.userId?.name || 'Student' });
                                                                setActionReason('');
                                                            }}
                                                            disabled={actionLoading === rowId}
                                                            style={{
                                                                padding: '0.35rem 0.65rem', borderRadius: '6px',
                                                                background: 'rgba(245,158,11,0.15)', color: '#d97706',
                                                                border: '1px solid rgba(245,158,11,0.3)', fontWeight: '600', fontSize: '0.78rem',
                                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                            }}
                                                            title="Revoke Leave"
                                                        >
                                                            <ShieldAlert size={14} /> Revoke
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => setExpandedRowId(isExpanded ? null : rowId)}
                                                        style={{
                                                            padding: '0.35rem', borderRadius: '6px',
                                                            background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                                            color: 'var(--text-secondary)', cursor: 'pointer'
                                                        }}
                                                        title={isExpanded ? 'Collapse Details' : 'Expand Details'}
                                                    >
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row Panel */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={8} style={{ padding: '0 0.8rem 0.8rem 0.8rem' }}>
                                                    <div style={{
                                                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                                        borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
                                                    }}>
                                                        <div>
                                                            <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Reason for Leave:</strong>
                                                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                                                {leave.reason}
                                                            </p>
                                                        </div>

                                                        {leave.rejectionReason && (
                                                            <div style={{
                                                                padding: '0.75rem', borderRadius: '8px',
                                                                background: leave.status === 'rejected' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                                                                border: `1px solid ${leave.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                                                display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
                                                            }}>
                                                                <AlertCircle size={16} style={{ color: leave.status === 'rejected' ? '#ef4444' : '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
                                                                <div>
                                                                    <strong style={{ fontSize: '0.78rem', color: leave.status === 'rejected' ? '#ef4444' : '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                                                                        {leave.status === 'rejected' ? 'Rejection Remarks' : 'Revocation Remarks'}:
                                                                    </strong>
                                                                    <p style={{ margin: '0.15rem 0 0 0', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: '500' }}>
                                                                        "{leave.rejectionReason}"
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {finalDocUrl && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewDoc(finalDocUrl)}
                                                                    style={{
                                                                        padding: '0.45rem 0.85rem', borderRadius: '8px',
                                                                        background: 'rgba(91, 80, 230, 0.1)', border: '1px solid rgba(91, 80, 230, 0.3)',
                                                                        color: 'var(--brand-primary)', fontWeight: '600', fontSize: '0.82rem',
                                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                                                    }}
                                                                >
                                                                    <FileText size={15} /> View Full Document Preview
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls Bar */}
            {filteredLeaves.length > 0 && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
                    background: 'var(--bg-primary)', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>Showing <strong>{totalCount === 0 ? 0 : startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalCount}</strong> applications</span>
                        <span>•</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={e => setPageSize(e.target.value)}
                                style={{
                                    padding: '0.3rem 0.5rem', borderRadius: '6px', background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                                }}
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                    </div>

                    {/* Page Numbers Navigation */}
                    {pageSize !== 'all' && totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem'
                                }}
                            >
                                <ChevronLeft size={14} /> Prev
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    style={{
                                        padding: '0.4rem 0.7rem', borderRadius: '6px', border: 'none',
                                        background: currentPage === page ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                                        color: currentPage === page ? 'white' : 'var(--text-primary)',
                                        fontWeight: currentPage === page ? '700' : '500', fontSize: '0.85rem', cursor: 'pointer'
                                    }}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem'
                                }}
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Action Reasoning Modal (Reject / Revoke) */}
            <AnimatePresence>
                {actionModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                            style={{ background: 'var(--bg-primary)', padding: '1.75rem', borderRadius: '16px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    background: actionModal.type === 'reject' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: actionModal.type === 'reject' ? '#ef4444' : '#f59e0b',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {actionModal.type === 'reject' ? <XCircle size={22} /> : <ShieldAlert size={22} />}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                                        {actionModal.type === 'reject' ? 'Reject Leave Application' : 'Revoke Approved Leave'}
                                    </h3>
                                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                                        Applicant: <strong>{actionModal.studentName}</strong>
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                        {actionModal.type === 'reject' ? 'Reason for Rejection' : 'Reason for Revocation'} <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={actionReason}
                                        onChange={e => setActionReason(e.target.value)}
                                        placeholder={actionModal.type === 'reject' ? "Provide reason (e.g. Invalid document, exam on same day, limit exceeded)..." : "Provide reason for revoking (e.g. Found conflict with mandatory assessment)..."}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem', lineHeight: '1.4' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setActionModal(null)}
                                        style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading === actionModal.id}
                                        style={{
                                            padding: '0.65rem 1.25rem', borderRadius: '8px',
                                            background: actionModal.type === 'reject' ? '#ef4444' : '#f59e0b',
                                            color: 'white', border: 'none', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer'
                                        }}
                                    >
                                        {actionLoading === actionModal.id ? 'Processing...' : actionModal.type === 'reject' ? 'Confirm Rejection' : 'Confirm Revocation'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ──────────────────────────────────────────
   Root Dashboard Layout
────────────────────────────────────────── */
const TeacherDashboard = () => {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="app-container" style={{ background: 'var(--bg-primary)' }}>
            <TeacherSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <main className="dashboard-main">

                <header className="glass-panel dashboard-header">
                    <div className="flex-row-mobile">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
                                <Menu size={24} />
                            </button>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Educator Overview</h1>
                        </div>
                    </div>
                    <div className="dashboard-header-actions">
                        {/* System Status / Permissions Badge */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="group">
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(79, 70, 229, 0.1)',
                                color: 'var(--brand-primary)',
                                cursor: 'help',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}>
                                <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                                    <Shield size={18} />
                                </motion.div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>System Status</span>
                            </div>

                            {/* Floating Permissions Info */}
                            <div className="permissions-tooltip" style={{
                                position: 'fixed', top: '5rem', right: '0.75rem',
                                width: 'min(260px, calc(100vw - 1.5rem))',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '1rem',
                                boxShadow: 'var(--shadow-xl)',
                                padding: '1rem', zIndex: 1000,
                                visibility: 'hidden', opacity: 0, transition: 'all 0.2s'
                            }}>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Your Active Permissions</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {[
                                        { id: 'viewAttendance', label: 'View Reports & Roster' },
                                        { id: 'markAttendance', label: 'Standard Marking' },
                                        { id: 'manualAttendance', label: 'Manual Attendance Override' },
                                        { id: 'editAttendance', label: 'Edit Existing Records' },
                                        { id: 'deleteAttendance', label: 'Delete Records' },
                                        { id: 'exportAttendance', label: 'Export Documents' },
                                        { id: 'bypassTimeRestraint', label: 'Anytime Attendance Override', special: true }
                                    ].map(p => {
                                        const has = user?.permissions?.includes(p.id);
                                        return (
                                            <div key={p.id} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                fontSize: '0.75rem',
                                                color: has ? 'var(--text-primary)' : 'var(--text-light)',
                                                opacity: has ? 1 : 0.5
                                            }}>
                                                {has ? <Check size={14} className="text-success" /> : <X size={14} className="text-danger" />}
                                                <span style={{ fontWeight: has ? '700' : '400' }}>{p.label}</span>
                                                {p.special && has && <span style={{ padding: '0.1rem 0.3rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '4px', fontSize: '0.6rem' }}>Unlimited</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <style>{`.group:hover .permissions-tooltip { visibility: visible !important; opacity: 1 !important; transform: translateY(5px); }`}</style>
                            </div>
                        </div>

                        <NotificationDropdown />

                        {/* ← Functional Profile Dropdown (replaces static avatar) */}
                        <TeacherProfileDropdown user={user} />
                    </div>
                </header>

                <div style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '100vw' }}>
                    <Routes>
                        <Route path="/" element={<TeacherTimetable />} />
                        <Route path="/manual" element={<ManualAttendance />} />
                        <Route path="/leaves" element={<LeaveApprovals />} />
                        <Route path="/apply-leave" element={<TeacherApplyLeave />} />
                        <Route path="/roster" element={<ClassRoster />} />
                        <Route path="/assignments" element={<TeacherAssignments />} />
                        <Route path="/exams" element={<TeacherExams />} />
                        <Route path="/messages" element={<TeacherMessages />} />
                        <Route path="/quizzes" element={<TeacherQuizManage />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default TeacherDashboard;
