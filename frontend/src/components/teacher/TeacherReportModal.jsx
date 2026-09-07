import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileBarChart2, Download, Filter, Loader2, AlertCircle,
    CheckCircle2, XCircle, MinusCircle, Users, BookOpen, X, RefreshCw
} from 'lucide-react';

const TeacherReportModal = ({ onClose }) => {
    const [filterData, setFilterData] = useState({ classes: [], subjects: [] });
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [report, setReport] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtersLoading, setFiltersLoading] = useState(true);
    const [error, setError] = useState('');
    const [fetched, setFetched] = useState(false);

    // Prevent body scrolling when the modal is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    // Dismiss on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Load filter options (all classes & subjects the teacher teaches)
    const loadFilters = useCallback(async () => {
        setFiltersLoading(true);
        setError('');
        try {
            const { data } = await axios.get('/teacher/report');
            setFilterData({ classes: data.classes || [], subjects: data.subjects || [] });
            setReport(data.report || []);
            setFetched(true);
        } catch (err) {
            console.error('Error loading report filters:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to load report data.';
            setError(msg);
        } finally {
            setFiltersLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFilters();
    }, [loadFilters]);

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

    // Calculate aggregate totals for the summary cards
    const totals = useMemo(() => {
        return (report || []).reduce((acc, r) => ({
            total: acc.total + (Number(r.total) || 0),
            present: acc.present + (Number(r.present) || 0),
            absent: acc.absent + (Number(r.absent) || 0),
            leave: acc.leave + (Number(r.leave) || 0),
        }), { total: 0, present: 0, absent: 0, leave: 0 });
    }, [report]);

    const avgPct = useMemo(() => {
        return totals.total > 0 ? ((totals.present / totals.total) * 100).toFixed(1) : '0.0';
    }, [totals]);

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="report-portal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 99999,
                    background: 'rgba(0, 0, 0, 0.78)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.25rem',
                    boxSizing: 'border-box'
                }}
            >
                <motion.div
                    key="report-portal-dialog"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: '100%',
                        maxWidth: '1020px',
                        height: 'min(88vh, 760px)',
                        maxHeight: '90vh',
                        background: 'var(--bg-secondary, #1a1a2e)',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                        borderRadius: '16px',
                        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                >
                    {/* 1. PINNED MODAL HEADER */}
                    <div style={{
                        padding: '1.15rem 1.5rem',
                        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(139,92,246,0.08))',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, var(--brand-primary, #6366f1), var(--brand-secondary, #8b5cf6))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                                flexShrink: 0
                            }}>
                                <FileBarChart2 size={22} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                                    Attendance Report
                                </h2>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                                    Filter by class or subject, review student metrics, and download CSV
                                </p>
                            </div>
                        </div>

                        <button
                            id="report-modal-close-icon-btn"
                            onClick={onClose}
                            title="Close modal (Esc)"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                                borderRadius: '10px',
                                padding: '0.45rem',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                                e.currentTarget.style.color = '#ef4444';
                                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border-color, rgba(255,255,255,0.1))';
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* 2. PINNED FILTERS BAR */}
                    <div style={{
                        padding: '0.9rem 1.5rem',
                        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                        display: 'flex',
                        gap: '0.85rem',
                        flexWrap: 'wrap',
                        alignItems: 'flex-end',
                        flexShrink: 0,
                        background: 'var(--bg-primary, #131320)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: '700', paddingBottom: '0.35rem' }}>
                            <Filter size={15} /> Filters:
                        </div>

                        <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Class Section
                            </label>
                            <select
                                id="report-class-filter"
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                                disabled={filtersLoading}
                                style={{
                                    width: '100%',
                                    padding: '0.55rem 0.85rem',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="">All Classes</option>
                                {filterData.classes.map(c => (
                                    <option key={c._id || c.id} value={c._id || c.id}>{c.label || c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Subject Course
                            </label>
                            <select
                                id="report-subject-filter"
                                value={selectedSubject}
                                onChange={e => setSelectedSubject(e.target.value)}
                                disabled={filtersLoading}
                                style={{
                                    width: '100%',
                                    padding: '0.55rem 0.85rem',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="">All Subjects</option>
                                {filterData.subjects.map(s => (
                                    <option key={s._id || s.id} value={s._id || s.id}>{s.label || s.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            id="report-apply-filter-btn"
                            onClick={fetchReport}
                            disabled={loading}
                            style={{
                                padding: '0.55rem 1.25rem',
                                background: 'linear-gradient(135deg, var(--brand-primary, #6366f1), var(--brand-secondary, #8b5cf6))',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                opacity: loading ? 0.7 : 1,
                                transition: 'all 0.2s',
                                alignSelf: 'flex-end',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
                            }}
                        >
                            {loading ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
                            Apply
                        </button>

                        {fetched && report.length > 0 && (
                            <button
                                id="report-download-csv-top-btn"
                                onClick={downloadCSV}
                                style={{
                                    padding: '0.55rem 1.15rem',
                                    background: 'rgba(22,163,74,0.12)',
                                    color: '#16a34a',
                                    border: '1px solid rgba(22,163,74,0.35)',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    transition: 'all 0.2s',
                                    alignSelf: 'flex-end'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.22)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.12)'; }}
                            >
                                <Download size={14} />
                                Download CSV
                            </button>
                        )}
                    </div>

                    {/* 3. SCROLLABLE CONTENT BODY */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        minHeight: 0,
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                    }}>
                        {/* Error Alert */}
                        {error && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                padding: '0.85rem 1.25rem',
                                background: 'rgba(220,38,38,0.08)',
                                border: '1px solid rgba(220,38,38,0.25)',
                                borderRadius: '10px',
                                color: '#dc2626',
                                fontSize: '0.85rem',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <AlertCircle size={17} style={{ flexShrink: 0 }} />
                                    <span>{error}</span>
                                </div>
                                <button
                                    id="report-modal-retry-btn"
                                    onClick={loadFilters}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: '8px',
                                        background: 'rgba(220,38,38,0.15)',
                                        color: '#dc2626',
                                        border: '1px solid rgba(220,38,38,0.3)',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(220,38,38,0.25)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(220,38,38,0.15)'}
                                >
                                    <RefreshCw size={13} /> Retry
                                </button>
                            </div>
                        )}

                        {/* Loading State */}
                        {(loading || filtersLoading) && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4rem 1rem',
                                gap: '1rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                    <Loader2 size={36} style={{ color: 'var(--brand-primary)' }} />
                                </motion.div>
                                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Gathering attendance analytics...</span>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !filtersLoading && fetched && report.length === 0 && !error && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4rem 1rem',
                                gap: '1rem',
                                color: 'var(--text-secondary)',
                                textAlign: 'center'
                            }}>
                                <FileBarChart2 size={48} style={{ opacity: 0.2 }} />
                                <p style={{ fontSize: '0.95rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                                    No attendance records found for the selected filters.
                                </p>
                                <p style={{ fontSize: '0.82rem', opacity: 0.7, margin: 0 }}>
                                    Try selecting "All Classes" or "All Subjects" to view full data.
                                </p>
                            </div>
                        )}

                        {/* Summary Metrics Bar */}
                        {!loading && !filtersLoading && report.length > 0 && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '0.75rem',
                                flexShrink: 0
                            }}>
                                {[
                                    { label: 'Students', value: report.length, icon: <Users size={16} />, color: 'var(--brand-primary, #6366f1)', bg: 'rgba(99,102,241,0.1)' },
                                    { label: 'Total Classes', value: totals.total, icon: <BookOpen size={16} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                                    { label: 'Present', value: totals.present, icon: <CheckCircle2 size={16} />, color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
                                    { label: 'Absent', value: totals.absent, icon: <XCircle size={16} />, color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
                                    { label: 'Avg Attendance', value: `${avgPct}%`, icon: <MinusCircle size={16} />, color: getPctColor(avgPct), bg: getPctBg(avgPct) },
                                ].map(stat => (
                                    <div key={stat.label} style={{
                                        background: stat.bg,
                                        border: `1px solid ${stat.color}35`,
                                        borderRadius: '12px',
                                        padding: '0.85rem 1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem'
                                    }}>
                                        <div style={{ color: stat.color, flexShrink: 0 }}>{stat.icon}</div>
                                        <div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: stat.color, lineHeight: 1.1 }}>{stat.value}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                                                {stat.label}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Attendance Table */}
                        {!loading && !filtersLoading && report.length > 0 && (
                            <div style={{
                                overflowX: 'auto',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                                background: 'var(--bg-secondary)'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary, #131320)' }}>
                                        <tr>
                                            {[
                                                { label: '#', align: 'center' },
                                                { label: 'Student', align: 'left' },
                                                { label: 'Roll No.', align: 'left' },
                                                { label: 'Class', align: 'left' },
                                                { label: 'Subject', align: 'left' },
                                                { label: 'Total', align: 'center' },
                                                { label: 'Present', align: 'center' },
                                                { label: 'Absent', align: 'center' },
                                                { label: 'Leave', align: 'center' },
                                                { label: 'Attendance %', align: 'center' }
                                            ].map(col => (
                                                <th key={col.label} style={{
                                                    padding: '0.75rem 0.9rem',
                                                    textAlign: col.align,
                                                    fontWeight: '700',
                                                    fontSize: '0.7rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    color: 'var(--text-secondary)',
                                                    borderBottom: '2px solid var(--border-color, rgba(255,255,255,0.1))',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.map((row, idx) => (
                                            <tr
                                                key={`${row.studentName}-${row.rollNumber}-${idx}`}
                                                style={{
                                                    borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                                                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                                                }}
                                                onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.07)'}
                                                onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                                            >
                                                <td style={{ padding: '0.7rem 0.9rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'center' }}>
                                                    {idx + 1}
                                                </td>
                                                <td style={{ padding: '0.7rem 0.9rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                    {row.studentName}
                                                </td>
                                                <td style={{ padding: '0.7rem 0.9rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                    {row.rollNumber}
                                                </td>
                                                <td style={{ padding: '0.7rem 0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                    {row.className}
                                                </td>
                                                <td style={{ padding: '0.7rem 0.9rem', color: 'var(--brand-secondary, #8b5cf6)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                    {row.subjectName}
                                                </td>
                                                <td style={{ padding: '0.7rem 0.9rem', textAlign: 'center', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {row.total}
                                                </td>
                                                <td style={{ padding: '0.7rem 0.9rem', textAlign: 'center', color: '#16a34a', fontWeight: '700' }}>
                                                    {row.present}
                                                </td>
                                                <td style={{ padding: '0.7rem 0.9rem', textAlign: 'center', color: '#dc2626', fontWeight: '700' }}>
                                                    {row.absent}
                                                </td>
                                                <td style={{ padding: '0.7rem 0.9rem', textAlign: 'center', color: '#d97706', fontWeight: '700' }}>
                                                    {row.leave}
                                                </td>
                                                <td style={{ padding: '0.7rem 0.9rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.25rem 0.65rem',
                                                        borderRadius: '999px',
                                                        background: getPctBg(row.percentage),
                                                        color: getPctColor(row.percentage),
                                                        fontWeight: '800',
                                                        fontSize: '0.78rem'
                                                    }}>
                                                        {row.percentage}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* 4. PINNED MODAL FOOTER */}
                    <div style={{
                        padding: '0.85rem 1.5rem',
                        borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                        background: 'var(--bg-primary, #131320)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0,
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                    }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {report.length > 0 ? (
                                <span>Showing <strong>{report.length}</strong> student attendance records</span>
                            ) : (
                                <span>No records loaded</span>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            {report.length > 0 && (
                                <button
                                    id="report-download-csv-bottom-btn"
                                    onClick={downloadCSV}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.55rem 1.15rem',
                                        borderRadius: '8px',
                                        background: 'rgba(22,163,74,0.12)',
                                        color: '#16a34a',
                                        border: '1px solid rgba(22,163,74,0.3)',
                                        fontWeight: '700',
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(22,163,74,0.2)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(22,163,74,0.12)'}
                                >
                                    <Download size={14} /> Download CSV
                                </button>
                            )}

                            <button
                                id="report-modal-close-bottom-btn"
                                onClick={onClose}
                                style={{
                                    padding: '0.55rem 1.25rem',
                                    borderRadius: '8px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    fontWeight: '600',
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
                                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default TeacherReportModal;

