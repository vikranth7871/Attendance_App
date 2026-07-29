import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, CheckCircle, XCircle, ChevronRight, BookOpen, Search, User,
    Lock, Clock, ShieldCheck, AlertCircle, Flame, Save, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ManualAttendance = () => {
    const { user } = useAuth();
    const [roster, setRoster] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [attendanceMap, setAttendanceMap] = useState({}); // studentId -> 'present' | 'absent' | 'leave'
    const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchRoster = async () => {
            try {
                const { data } = await axios.get('/teacher/roster');
                const subjectRoster = data.subjectRoster || [];
                setRoster(subjectRoster);
                if (subjectRoster.length > 0) {
                    setSelectedSession(subjectRoster[0]);
                }
            } catch (error) {
                console.error("Failed to fetch roster", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRoster();
    }, []);

    // Initialize local attendance map when selectedSession or date changes
    useEffect(() => {
        if (selectedSession && selectedSession.students) {
            const initial = {};
            selectedSession.students.forEach(s => {
                if (s.attendanceStatus === 'leave') {
                    initial[s._id] = 'leave';
                } else if (s.attendanceStatus === 'present' || s.attendanceStatus === 'absent') {
                    initial[s._id] = s.attendanceStatus;
                } else {
                    initial[s._id] = 'absent'; // Default unmarked to absent
                }
            });
            setAttendanceMap(initial);
        } else {
            setAttendanceMap({});
        }

        if (selectedSession && selectedSession.slots && selectedSession.slots.length > 0) {
            const activeIdx = selectedSession.slots.findIndex(s => isCurrentTimeInSlot(s.startTime, s.endTime, s.dayOfWeek));
            setSelectedSlotIndex(activeIdx !== -1 ? activeIdx : 0);
        } else {
            setSelectedSlotIndex(0);
        }
    }, [selectedSession, attendanceDate]);

    const isCurrentTimeInSlot = (startTimeStr, endTimeStr, dayOfWeek) => {
        if (!startTimeStr || !endTimeStr || !dayOfWeek) return false;
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const now = new Date();
        if (days[now.getDay()] !== dayOfWeek) return false;

        const timeToMinutes = (timeStr) => {
            const parts = timeStr.trim().split(' ');
            if (parts.length < 2) return 0;
            const [time, modifier] = parts;
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours, 10);
            minutes = parseInt(minutes, 10);
            if (modifier === 'PM' && hours !== 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
        };

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = timeToMinutes(startTimeStr) - 10;
        const endMinutes = timeToMinutes(endTimeStr) + 10;
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    };

    const currentSlot = (selectedSession?.slots && selectedSession.slots.length > 0)
        ? selectedSession.slots[selectedSlotIndex] || selectedSession.slots[0]
        : null;

    const isSlotTimeActive = (slot, selectedDate) => {
        if (!slot || !slot.startTime || !slot.endTime || !slot.dayOfWeek) return true;
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (selectedDate && selectedDate !== todayStr) return false;
        if (days[now.getDay()] !== slot.dayOfWeek) return false;

        const timeToMinutes = (timeStr) => {
            const parts = timeStr.trim().split(' ');
            if (parts.length < 2) return 0;
            const [time, modifier] = parts;
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours, 10);
            minutes = parseInt(minutes, 10);
            if (modifier === 'PM' && hours !== 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
        };

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = timeToMinutes(slot.startTime) - 10;
        const endMinutes = timeToMinutes(slot.endTime) + 10;
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    };

    const hasBypass = user?.permissions?.includes('bypassTimeRestraint') || user?.role === 'admin';
    const isSelectedSlotActive = isSlotTimeActive(currentSlot, attendanceDate);
    const canMark = isSelectedSlotActive || hasBypass;

    const filteredStudents = selectedSession?.students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const setSingleStatus = (studentId, status) => {
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleMarkAllPresent = () => {
        const next = { ...attendanceMap };
        filteredStudents.forEach(s => {
            if (s.attendanceStatus !== 'leave' && next[s._id] !== 'leave') {
                next[s._id] = 'present';
            }
        });
        setAttendanceMap(next);
    };

    const handleMarkAllAbsent = () => {
        const next = { ...attendanceMap };
        filteredStudents.forEach(s => {
            if (s.attendanceStatus !== 'leave' && next[s._id] !== 'leave') {
                next[s._id] = 'absent';
            }
        });
        setAttendanceMap(next);
    };

    const submitBulkAttendance = async () => {
        if (!canMark) {
            setError("Attendance marking is restricted outside the active slot time.");
            return;
        }

        const studentIds = Object.keys(attendanceMap);
        if (studentIds.length === 0) {
            setError("No student attendance records to submit.");
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const attendanceData = studentIds.map(id => ({
                studentId: id,
                status: attendanceMap[id] || 'absent'
            }));

            await axios.post('/attendance/manual-bulk', {
                attendanceData,
                classId: selectedSession.class?._id,
                subjectId: selectedSession.subject?._id,
                date: attendanceDate
            });

            setSuccess(`Successfully saved attendance for ${studentIds.length} students!`);
            setTimeout(() => setSuccess(null), 4000);

            // Refresh roster data to sync with backend
            const { data } = await axios.get('/teacher/roster');
            setRoster(data.subjectRoster || []);
            const currentAllocation = data.subjectRoster.find(r => r.allocationId === selectedSession.allocationId);
            if (currentAllocation) setSelectedSession(currentAllocation);

        } catch (err) {
            console.error("Bulk attendance save error:", err);
            setError(err.response?.data?.message || "Failed to submit attendance.");
        } finally {
            setSaving(false);
        }
    };

    if (!user?.permissions?.includes('manualAttendance') && !user?.permissions?.includes('markAttendance')) {
        return (
            <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                <Lock size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Access Restricted</h3>
                <p style={{ color: 'var(--text-secondary)' }}>You do not have the required permissions ('Mark Attendance' or 'Manual Attendance') to access this page.</p>
            </div>
        );
    }

    const presentCount = Object.values(attendanceMap).filter(v => v === 'present').length;
    const absentCount = Object.values(attendanceMap).filter(v => v === 'absent').length;
    const leaveCount = Object.values(attendanceMap).filter(v => v === 'leave').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
            {/* Top Bar Header & Class Picker */}
            <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Users className="text-brand-primary" size={24} /> Student Attendance Portal
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Record and manage daily class attendance for assigned subjects
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {roster.map((session) => {
                        const active = session.slots?.some(s => isSlotTimeActive(s, attendanceDate));
                        const isSelected = selectedSession?.allocationId === session.allocationId;
                        return (
                            <button
                                key={session.allocationId}
                                onClick={() => { setSelectedSession(session); setError(null); }}
                                style={{
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '0.75rem',
                                    border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    backgroundColor: isSelected ? 'linear-gradient(135deg, rgba(91, 80, 230, 0.12), rgba(99, 102, 241, 0.08))' : 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: isSelected ? '0 4px 12px rgba(91, 80, 230, 0.15)' : 'none'
                                }}
                            >
                                <BookOpen size={16} style={{ color: active ? '#10b981' : 'var(--brand-primary)' }} />
                                {session.class?.className} - {session.subject?.subjectName}
                                {active && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Notifications */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <AlertCircle size={18} /> {error}
                    </motion.div>
                )}
                {success && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '0.85rem 1.25rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <CheckCircle size={18} /> {success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Slot & Date Status Bar */}
            <div className="glass-panel" style={{
                padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                background: isSelectedSlotActive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                borderRadius: '1rem', border: '1px solid ' + (isSelectedSlotActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.6rem', borderRadius: '0.75rem', background: isSelectedSlotActive ? '#10b981' : '#ef4444', color: 'white' }}>
                            {isSelectedSlotActive ? <Clock size={22} /> : <Lock size={22} />}
                        </div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                Active Session: <span style={{ color: 'var(--brand-primary)' }}>{selectedSession?.class?.className} — {selectedSession?.subject?.subjectName}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: isSelectedSlotActive ? '#10b981' : '#ef4444', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                {isSelectedSlotActive ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={14} /> Live Slot Session: <strong>{currentSlot?.dayOfWeek} @ {currentSlot?.timeSlot || `${currentSlot?.startTime} - ${currentSlot?.endTime}`}</strong></span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Lock size={14} /> Time Window Restricted: {currentSlot?.dayOfWeek || 'Scheduled Slot'} ({currentSlot?.timeSlot || `${currentSlot?.startTime} - ${currentSlot?.endTime}`})</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Date & Slot Selectors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        {selectedSession?.slots && selectedSession.slots.length > 1 && (
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Select Slot</label>
                                <select
                                    value={selectedSlotIndex}
                                    onChange={e => setSelectedSlotIndex(Number(e.target.value))}
                                    style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600', outline: 'none' }}
                                >
                                    {selectedSession.slots.map((slot, idx) => (
                                        <option key={idx} value={idx}>
                                            {slot.dayOfWeek} • {slot.timeSlot || `${slot.startTime} - ${slot.endTime}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Attendance Date</label>
                            <input
                                type="date"
                                value={attendanceDate}
                                onChange={e => setAttendanceDate(e.target.value)}
                                style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600', outline: 'none' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.2rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Total Students</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{filteredStudents.length}</div>
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

            {/* Action Bar (Batch Controls + Search + Save) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleMarkAllPresent}
                        disabled={!canMark || filteredStudents.length === 0}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(22,163,74,0.3)',
                            background: 'rgba(22,163,74,0.1)',
                            color: '#16a34a',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            cursor: canMark ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <CheckCircle size={15} /> Mark All Present
                    </button>

                    <button
                        onClick={handleMarkAllAbsent}
                        disabled={!canMark || filteredStudents.length === 0}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(220,38,38,0.3)',
                            background: 'rgba(220,38,38,0.1)',
                            color: '#dc2626',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            cursor: canMark ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <XCircle size={15} /> Mark All Absent
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '200px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Search student..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.82rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        onClick={submitBulkAttendance}
                        disabled={saving || !canMark || filteredStudents.length === 0}
                        style={{
                            padding: '0.6rem 1.5rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: (saving || !canMark) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 15px rgba(91, 80, 230, 0.3)',
                            opacity: (saving || !canMark) ? 0.6 : 1
                        }}
                    >
                        <Save size={16} /> {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                </div>
            </div>

            {/* Student List Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                        const status = attendanceMap[student._id] || (student.attendanceStatus === 'leave' ? 'leave' : 'absent');
                        const isLeave = student.attendanceStatus === 'leave' || status === 'leave';

                        const borderColor = isLeave ? '#4f46e5' : status === 'present' ? '#16a34a' : '#dc2626';

                        return (
                            <motion.div
                                key={student._id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1rem 1.25rem',
                                    borderRadius: '12px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderLeft: `5px solid ${borderColor}`,
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}
                            >
                                {/* Left Student Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '220px' }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(91, 80, 230, 0.2), rgba(99, 102, 241, 0.1))',
                                        color: 'var(--brand-primary)',
                                        fontWeight: '800',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {student.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {student.name}
                                            <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: '600', background: 'rgba(91,80,230,0.08)', padding: '0.1rem 0.5rem', borderRadius: '6px' }}>
                                                Roll: {student.rollNumber || 'N/A'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span>{student.email}</span>
                                            <span>•</span>
                                            <span style={{ color: '#f59e0b', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <Flame size={13} color="#f59e0b" /> {student.streakCount || 0} Streak
                                            </span>
                                            {isLeave && (
                                                <span style={{ color: '#4f46e5', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(79,70,229,0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                                                    <ShieldAlert size={12} /> Approved Leave
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Interactive Status Segment Slider */}
                                <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                    <button
                                        type="button"
                                        disabled={!canMark}
                                        onClick={() => setSingleStatus(student._id, 'present')}
                                        style={{
                                            padding: '0.45rem 0.9rem',
                                            borderRadius: '7px',
                                            border: 'none',
                                            background: status === 'present' ? '#16a34a' : 'transparent',
                                            color: status === 'present' ? 'white' : 'var(--text-secondary)',
                                            fontWeight: '700',
                                            fontSize: '0.8rem',
                                            cursor: canMark ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                        }}
                                    >
                                        Present
                                    </button>

                                    <button
                                        type="button"
                                        disabled={!canMark}
                                        onClick={() => setSingleStatus(student._id, 'absent')}
                                        style={{
                                            padding: '0.45rem 0.9rem',
                                            borderRadius: '7px',
                                            border: 'none',
                                            background: status === 'absent' ? '#dc2626' : 'transparent',
                                            color: status === 'absent' ? 'white' : 'var(--text-secondary)',
                                            fontWeight: '700',
                                            fontSize: '0.8rem',
                                            cursor: canMark ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                        }}
                                    >
                                        Absent
                                    </button>

                                    <button
                                        type="button"
                                        disabled={!canMark}
                                        onClick={() => setSingleStatus(student._id, 'leave')}
                                        style={{
                                            padding: '0.45rem 0.9rem',
                                            borderRadius: '7px',
                                            border: 'none',
                                            background: status === 'leave' ? 'var(--brand-primary)' : 'transparent',
                                            color: status === 'leave' ? 'white' : 'var(--text-secondary)',
                                            fontWeight: '700',
                                            fontSize: '0.8rem',
                                            cursor: canMark ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                        }}
                                    >
                                        On Leave
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No students found for this class and search criteria.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManualAttendance;
