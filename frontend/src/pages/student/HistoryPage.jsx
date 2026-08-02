import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import { CalendarDays, RotateCcw, Filter } from 'lucide-react';

const HistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('ALL');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await axios.get('/student/overview');
                setHistory(data.history || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const subjectOptions = useMemo(() => {
        const names = new Set();
        (history || []).forEach(h => {
            const name = h.subjectId?.subjectName || 'Unknown Subject';
            names.add(name);
        });
        return Array.from(names);
    }, [history]);

    /* ── Client-side date and subject filtering ── */
    const filtered = useMemo(() => {
        return history.filter(record => {
            const subName = record.subjectId?.subjectName || 'Unknown Subject';
            if (selectedSubject !== 'ALL' && subName !== selectedSubject) return false;

            if (!startDate && !endDate) return true;
            const recordDate = new Date(record.date);
            if (startDate && endDate) {
                return isWithinInterval(recordDate, {
                    start: startOfDay(parseISO(startDate)),
                    end: endOfDay(parseISO(endDate))
                });
            }
            if (startDate) return recordDate >= startOfDay(parseISO(startDate));
            if (endDate) return recordDate <= endOfDay(parseISO(endDate));
            return true;
        });
    }, [history, startDate, endDate, selectedSubject]);

    const totalFiltered = filtered.length;
    const presentFiltered = filtered.filter(r => r.status === 'present').length;
    const absentFiltered = filtered.filter(r => r.status === 'absent').length;
    const leaveFiltered = filtered.filter(r => r.status === 'leave').length;
    const attendancePct = totalFiltered > 0 ? Math.round((presentFiltered / totalFiltered) * 100) : 0;
    const pctColor = attendancePct >= 75 ? '#10b981' : attendancePct >= 60 ? '#f59e0b' : '#ef4444';
    const isFiltering = startDate || endDate || selectedSubject !== 'ALL';

    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        setSelectedSubject('ALL');
    };

    return (
        <motion.div
            className="glass-panel animate-fade-in"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '2rem' }}
        >
            {/* Page Title */}
            <h2 style={{
                fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem',
                color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
                <CalendarDays size={20} /> Attendance History
            </h2>

            {/* ── Date-Range Filter Bar ── */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'flex-end',
                marginBottom: '1.5rem',
                padding: '1rem 1.25rem',
                background: 'var(--bg-primary)',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)'
            }}>
                <Filter size={16} style={{ color: 'var(--brand-primary)', marginBottom: '2px', flexShrink: 0 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        From Date
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        max={endDate || undefined}
                        onChange={e => setStartDate(e.target.value)}
                        style={{
                            padding: '0.45rem 0.65rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        To Date
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={e => setEndDate(e.target.value)}
                        style={{
                            padding: '0.45rem 0.65rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Filter by Subject
                    </label>
                    <select
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                        style={{
                            padding: '0.45rem 0.65rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="ALL">All Subjects</option>
                        {subjectOptions.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>

                {isFiltering && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleReset}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.45rem 0.85rem',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#dc2626',
                            border: '1px solid rgba(239,68,68,0.25)',
                            borderRadius: '0.5rem',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            alignSelf: 'flex-end'
                        }}
                    >
                        <RotateCcw size={13} /> Reset
                    </motion.button>
                )}

                {/* Attendance Percentage Badge — always visible */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* % pill */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.45rem 1rem', borderRadius: '999px',
                        background: `${pctColor}18`,
                        border: `1.5px solid ${pctColor}50`
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', position: 'relative',
                            background: `conic-gradient(${pctColor} ${attendancePct * 3.6}deg, var(--border-color) 0deg)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.5rem', fontWeight: '800', color: pctColor }}>{attendancePct}%</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: '800', color: pctColor, lineHeight: 1 }}>{attendancePct}%</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attendance</div>
                        </div>
                    </div>

                    {/* Summary chips */}
                    <SummaryChip label="Total" value={totalFiltered} color="var(--brand-primary)" />
                    <SummaryChip label="Present" value={presentFiltered} color="#16a34a" />
                    <SummaryChip label="Absent" value={absentFiltered} color="#dc2626" />
                    {leaveFiltered > 0 && <SummaryChip label="Leave" value={leaveFiltered} color="var(--brand-primary)" />}
                </div>
            </div>

            {/* ── Active-filter notice ── */}
            {isFiltering && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                        marginBottom: '1rem',
                        padding: '0.6rem 1rem',
                        background: 'rgba(99,102,241,0.08)',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(99,102,241,0.2)',
                        fontSize: '0.8rem',
                        color: 'var(--brand-primary)',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <CalendarDays size={14} />
                    Showing {totalFiltered} record{totalFiltered !== 1 ? 's' : ''}
                    {startDate && ` from ${format(parseISO(startDate), 'MMM d, yyyy')}`}
                    {endDate && ` to ${format(parseISO(endDate), 'MMM d, yyyy')}`}
                </motion.div>
            )}

            {/* ── Table ── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Loading attendance records…
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Date</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Subject</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Session & Time Slot</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Status</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((record, index) => {
                                const methodLabel =
                                    record.method === 'auto_absent' ? 'Auto-Absent (System)' :
                                    record.method === 'auto_leave' ? 'Auto-Leave (System)' :
                                    record.method === 'qr' ? 'QR Code Scan' : 'Manual Marking';

                                const statusStyle =
                                    record.status === 'present' ? { bg: 'rgba(22,163,74,0.15)', color: '#16a34a', border: 'rgba(22,163,74,0.3)', label: 'Present' } :
                                    record.status === 'leave' ? { bg: 'rgba(79,70,229,0.15)', color: 'var(--brand-primary)', border: 'rgba(79,70,229,0.3)', label: 'On Leave' } :
                                    { bg: 'rgba(220,38,38,0.15)', color: '#dc2626', border: 'rgba(220,38,38,0.3)', label: 'Absent' };

                                return (
                                    <motion.tr
                                        key={record._id || index}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        style={{ borderBottom: '1px solid var(--border-color)' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                                            {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                            {record.subjectId?.subjectName || 'Unknown Subject'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: '700',
                                                    color: 'var(--brand-primary)',
                                                    background: 'rgba(99,102,241,0.08)',
                                                    padding: '0.15rem 0.5rem',
                                                    borderRadius: '6px',
                                                    display: 'inline-block',
                                                    width: 'fit-content'
                                                }}>
                                                    {record.timeSlot || record.time || 'Scheduled Session'}
                                                </span>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                    Room: {record.roomNumber || 'C5-05'} • {record.teacherName || 'Instructor'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <span style={{
                                                padding: '0.3rem 0.75rem',
                                                borderRadius: '1rem',
                                                fontSize: '0.78rem',
                                                fontWeight: '800',
                                                background: statusStyle.bg,
                                                color: statusStyle.color,
                                                border: `1px solid ${statusStyle.border}`,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em'
                                            }}>
                                                {statusStyle.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                            {methodLabel}
                                        </td>
                                    </motion.tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.875rem' }}>
                                        {isFiltering
                                            ? 'No records found for the selected filters.'
                                            : 'No attendance records found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    );
};

const SummaryChip = ({ label, value, color }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.3rem 0.6rem',
        borderRadius: '999px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        fontSize: '0.75rem'
    }}>
        <span style={{ fontWeight: '800', color }}>{value}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
);

export default HistoryPage;
