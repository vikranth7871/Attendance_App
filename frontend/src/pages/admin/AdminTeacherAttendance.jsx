import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, CheckCircle, XCircle, Calendar, Clock, Save, RefreshCw, AlertCircle, ShieldCheck, CalendarOff, Download, FileSpreadsheet, X, Loader2 } from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';

const AdminTeacherAttendance = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const [date, setDate] = useState(todayStr);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    // Download Modal state
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [exportEndDate, setExportEndDate] = useState(todayStr);
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        fetchTeacherAttendance(date);
    }, [date]);

    const fetchTeacherAttendance = async (selectedDate) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/admin/teacher-attendance?date=${selectedDate}`);
            setTeachers(data.teachers || []);
        } catch (err) {
            console.error('Failed to fetch teacher attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (newDate) => {
        if (newDate !== todayStr) {
            setToast('Faculty attendance is restricted to the current day alone.');
            setTimeout(() => setToast(''), 3000);
            setDate(todayStr);
            return;
        }
        setDate(newDate);
    };

    const handleStatusChange = (teacherId, newStatus) => {
        setTeachers(prev => prev.map(t => {
            if (t.id === teacherId) {
                return { ...t, status: newStatus };
            }
            return t;
        }));
    };

    const handleRemarksChange = (teacherId, remarks) => {
        setTeachers(prev => prev.map(t => {
            if (t.id === teacherId) {
                return { ...t, remarks };
            }
            return t;
        }));
    };

    const handleMarkAllPresent = () => {
        setTeachers(prev => prev.map(t => ({
            ...t,
            status: t.onLeave ? 'leave' : 'present'
        })));
    };

    const handleMarkAllAbsent = () => {
        setTeachers(prev => prev.map(t => ({
            ...t,
            status: t.onLeave ? 'leave' : 'absent'
        })));
    };

    const handleSave = async () => {
        if (date !== todayStr) {
            setToast('Faculty attendance can only be marked for today (current day alone).');
            setTimeout(() => setToast(''), 3000);
            return;
        }

        setSaving(true);
        try {
            const records = teachers.map(t => ({
                teacherId: t.id,
                status: t.status,
                remarks: t.remarks
            }));
            await axios.post('/admin/teacher-attendance', {
                date,
                records
            });
            setToast('Teacher attendance saved successfully!');
            setTimeout(() => setToast(''), 3000);
        } catch (err) {
            console.error('Failed to save teacher attendance:', err);
            const msg = err.response?.data?.message || 'Failed to save attendance.';
            setToast(msg);
            setTimeout(() => setToast(''), 3000);
        } finally {
            setSaving(false);
        }
    };

    // Quick Date Range Preset Setters
    const setPresetRange = (type) => {
        const today = new Date();
        if (type === 'today') {
            setExportStartDate(todayStr);
            setExportEndDate(todayStr);
        } else if (type === '7days') {
            setExportStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
            setExportEndDate(todayStr);
        } else if (type === '30days') {
            setExportStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
            setExportEndDate(todayStr);
        } else if (type === 'month') {
            setExportStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
            setExportEndDate(todayStr);
        }
    };

    // Export Submit Handler
    const handleDownloadSubmit = async (e) => {
        e.preventDefault();
        setExportLoading(true);
        try {
            setToast('Generating faculty attendance report...');
            let exportData = [];

            try {
                const { data } = await axios.get(`/admin/teacher-attendance/export?startDate=${exportStartDate}&endDate=${exportEndDate}`);
                if (Array.isArray(data) && data.length > 0) {
                    exportData = data;
                }
            } catch (err) {
                console.warn('Backend export route fallback to current date:', err);
            }

            const hasTodayInExport = exportData.some(item => {
                const itemD = typeof item.date === 'string' ? item.date.split('T')[0] : '';
                return itemD === todayStr;
            });

            if (!hasTodayInExport && exportStartDate <= todayStr && exportEndDate >= todayStr) {
                const todayRows = teachers.map(t => ({
                    date: todayStr,
                    teacher_name: t.name,
                    email: t.email,
                    department_name: t.departmentName || 'N/A',
                    status: t.status,
                    remarks: t.remarks || (t.onLeave ? `Leave: ${t.leaveReason}` : '')
                }));
                exportData = [...todayRows, ...exportData];
            }

            if (exportData.length === 0) {
                alert('No attendance records found for the selected date range.');
                setExportLoading(false);
                return;
            }

            const headers = ['S.No', 'Date', 'Teacher Name', 'Email', 'Department', 'Status', 'Remarks'];
            const rows = exportData.map((item, idx) => {
                let formattedDate = item.date;
                if (!formattedDate) {
                    formattedDate = date;
                } else if (typeof formattedDate === 'string' && formattedDate.includes('T')) {
                    formattedDate = formattedDate.split('T')[0];
                }
                return [
                    idx + 1,
                    formattedDate,
                    `"${(item.teacher_name || '').replace(/"/g, '""')}"`,
                    `"${(item.email || '').replace(/"/g, '""')}"`,
                    `"${(item.department_name || '').replace(/"/g, '""')}"`,
                    `"${(item.status || '').toUpperCase()}"`,
                    `"${(item.remarks || '').replace(/"/g, '""')}"`
                ];
            });

            const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Teacher_Attendance_Report_${exportStartDate}_to_${exportEndDate}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setToast('Report CSV downloaded successfully!');
            setShowDownloadModal(false);
            setTimeout(() => setToast(''), 3000);
        } catch (error) {
            console.error('Failed to download attendance report:', error);
            alert(error.response?.data?.message || 'Failed to download report.');
        } finally {
            setExportLoading(false);
        }
    };

    const presentCount = teachers.filter(t => t.status === 'present').length;
    const absentCount = teachers.filter(t => t.status === 'absent').length;
    const leaveCount = teachers.filter(t => t.status === 'leave').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
            {/* Toast Notification */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        padding: '0.85rem 1.25rem',
                        borderRadius: '12px',
                        background: toast.includes('failed') || toast.includes('restricted') || toast.includes('only') ? '#dc2626' : '#16a34a',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        position: 'fixed',
                        top: '1.5rem',
                        right: '1.5rem',
                        zIndex: 9999
                    }}
                >
                    <CheckCircle size={18} /> {toast}
                </motion.div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <UserCheck size={24} className="text-brand-primary" /> Faculty Attendance Portal
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                        Mark daily attendance and track faculty leave records
                    </p>
                </div>

                {/* Date Picker & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                        <CheckCircle size={13} /> EOD Auto-Save Enabled
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        <ShieldCheck size={14} /> Same Day Only
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <Calendar size={16} style={{ color: 'var(--brand-primary)' }} />
                        <input
                            type="date"
                            min={todayStr}
                            max={todayStr}
                            value={date}
                            onChange={e => handleDateChange(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                                outline: 'none',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    <button
                        onClick={() => handleDateChange(todayStr)}
                        style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid var(--brand-primary)',
                            background: 'rgba(79, 70, 229, 0.1)',
                            color: 'var(--brand-primary)',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        Today
                    </button>

                    <button
                        onClick={() => setShowDownloadModal(true)}
                        style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(16,185,129,0.4)',
                            background: 'rgba(16,185,129,0.12)',
                            color: '#10b981',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                        }}
                        title="Download Teacher Attendance Report CSV"
                    >
                        <Download size={15} /> Download Report
                    </button>
                </div>
            </div>

            {/* Metrics Overview Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.2rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Total Faculty</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{teachers.length}</div>
                </div>
                <div style={{ padding: '1.2rem', background: 'rgba(22,163,74,0.08)', borderRadius: '12px', border: '1px solid rgba(22,163,74,0.25)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase' }}>Present</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#16a34a', marginTop: '0.25rem' }}>{presentCount}</div>
                </div>
                <div style={{ padding: '1.2rem', background: 'rgba(220,38,38,0.08)', borderRadius: '12px', border: '1px solid rgba(220,38,38,0.25)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase' }}>Absent</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#dc2626', marginTop: '0.25rem' }}>{absentCount}</div>
                </div>
                <div style={{ padding: '1.2rem', background: 'rgba(79,70,229,0.08)', borderRadius: '12px', border: '1px solid rgba(79,70,229,0.25)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: '700', textTransform: 'uppercase' }}>On Leave</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--brand-primary)', marginTop: '0.25rem' }}>{leaveCount}</div>
                </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={handleMarkAllPresent}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(22,163,74,0.3)',
                            background: 'rgba(22,163,74,0.1)',
                            color: '#16a34a',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <CheckCircle size={15} /> Mark All Present
                    </button>

                    <button
                        onClick={handleMarkAllAbsent}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(220,38,38,0.3)',
                            background: 'rgba(220,38,38,0.1)',
                            color: '#dc2626',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <XCircle size={15} /> Mark All Absent
                    </button>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '0.6rem 1.5rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'var(--brand-primary)',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
                    }}
                >
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Attendance'}
                </button>
            </div>

            {/* Faculty Attendance Roster List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Loading faculty list...
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {teachers.map((t, idx) => (
                        <div
                            key={t.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--bg-secondary)',
                                padding: '1rem 1.25rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                flexWrap: 'wrap',
                                gap: '1rem'
                            }}
                        >
                            {/* Teacher Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px' }}>
                                <div style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.85rem', width: '24px' }}>
                                    #{idx + 1}
                                </div>
                                <div>
                                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                        {t.name}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                        {t.departmentName} • {t.email}
                                    </div>
                                    {t.onLeave && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: '700', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <CalendarOff size={13} /> Approved Leave ({t.leaveReason})
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Remarks Input */}
                            <div style={{ flex: 1, minWidth: '200px', maxWidth: '350px' }}>
                                <input
                                    type="text"
                                    placeholder="Add optional remarks..."
                                    value={t.remarks || ''}
                                    onChange={e => handleRemarksChange(t.id, e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.45rem 0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.82rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* Status Selector Pills */}
                            <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '9px', border: '1px solid var(--border-color)' }}>
                                <button
                                    onClick={() => handleStatusChange(t.id, 'present')}
                                    style={{
                                        padding: '0.45rem 0.9rem',
                                        borderRadius: '7px',
                                        border: 'none',
                                        background: t.status === 'present' ? '#16a34a' : 'transparent',
                                        color: t.status === 'present' ? 'white' : 'var(--text-secondary)',
                                        fontWeight: '700',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Present
                                </button>
                                <button
                                    onClick={() => handleStatusChange(t.id, 'absent')}
                                    style={{
                                        padding: '0.45rem 0.9rem',
                                        borderRadius: '7px',
                                        border: 'none',
                                        background: t.status === 'absent' ? '#dc2626' : 'transparent',
                                        color: t.status === 'absent' ? 'white' : 'var(--text-secondary)',
                                        fontWeight: '700',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Absent
                                </button>
                                <button
                                    onClick={() => handleStatusChange(t.id, 'leave')}
                                    style={{
                                        padding: '0.45rem 0.9rem',
                                        borderRadius: '7px',
                                        border: 'none',
                                        background: t.status === 'leave' ? 'var(--brand-primary)' : 'transparent',
                                        color: t.status === 'leave' ? 'white' : 'var(--text-secondary)',
                                        fontWeight: '700',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    On Leave
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Date Range Selection Modal for Report Download */}
            <AnimatePresence>
                {showDownloadModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 99999,
                            background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                            style={{
                                background: 'var(--bg-primary)', padding: '1.75rem', borderRadius: '20px',
                                border: '1px solid var(--border-color)', width: '100%', maxWidth: '480px',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FileSpreadsheet size={22} style={{ color: '#10b981' }} /> Download Faculty Report
                                    </h3>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Select date range to export teacher attendance records to CSV format.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDownloadModal(false)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Quick Presets Bar */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    Quick Range Presets
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPresetRange('today')}
                                        style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Today
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPresetRange('7days')}
                                        style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Last 7 Days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPresetRange('30days')}
                                        style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Last 30 Days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPresetRange('month')}
                                        style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        This Month
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleDownloadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                            From Date
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={exportStartDate}
                                            onChange={e => setExportStartDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                            To Date
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={exportEndDate}
                                            onChange={e => setExportEndDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDownloadModal(false)}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={exportLoading}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '10px',
                                            background: '#10b981', color: 'white', border: 'none',
                                            fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                        }}
                                    >
                                        {exportLoading ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
                                        {exportLoading ? 'Exporting...' : 'Download CSV'}
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

export default AdminTeacherAttendance;
