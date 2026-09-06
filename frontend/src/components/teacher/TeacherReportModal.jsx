import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileBarChart2, Download, Filter, Loader2, AlertCircle,
    CheckCircle2, XCircle, MinusCircle, Users, BookOpen, X
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
                                    <option key={c._id || c.id} value={c._id || c.id}>{c.label || c.name}</option>
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
                                    <option key={s._id || s.id} value={s._id || s.id}>{s.label || s.name}</option>
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

export default TeacherReportModal;

