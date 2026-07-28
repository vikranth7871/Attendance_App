import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UserCheck, CheckCircle, XCircle, Calendar, Clock, Save, RefreshCw, AlertCircle, ShieldCheck, CalendarOff } from 'lucide-react';
import { format } from 'date-fns';

const AdminTeacherAttendance = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const [date, setDate] = useState(todayStr);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

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
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '0.6rem 1.5rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 16px rgba(79,70,229,0.3)'
                    }}
                >
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Attendance'}
                </button>
            </div>

            {/* Teacher List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading faculty roster...</div>
            ) : teachers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                    No faculty members found in system.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {teachers.map((t) => (
                        <div
                            key={t.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.25rem',
                                padding: '1.1rem 1.5rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: '14px',
                                border: '1px solid var(--border-color)',
                                borderLeft: `4px solid ${t.status === 'present' ? '#16a34a' : t.status === 'absent' ? '#dc2626' : 'var(--brand-primary)'}`,
                                flexWrap: 'wrap'
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, var(--brand-primary), #ec4899)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                flexShrink: 0
                            }}>
                                {t.name.charAt(0)}
                            </div>

                            {/* Info */}
                            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {t.name}
                                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem', borderRadius: '999px', background: 'var(--brand-primary)15', color: 'var(--brand-primary)', fontWeight: '700' }}>
                                        {t.departmentName}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {t.email}
                                    {t.onLeave && (
                                        <span style={{ marginLeft: '0.5rem', color: '#d97706', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <CalendarOff size={14} /> Approved Leave ({t.leaveReason})
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Status Buttons */}
                            <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
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
        </div>
    );
};

export default AdminTeacherAttendance;
