import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle, XCircle, ChevronRight, BookOpen, Search, User, Lock, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ManualAttendance = () => {
    const { user } = useAuth();
    const [roster, setRoster] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [attendedStudents, setAttendedStudents] = useState({}); // Local staging state
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
                if (subjectRoster.length > 0) setSelectedSession(subjectRoster[0]);
            } catch (error) {
                console.error("Failed to fetch roster", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRoster();
    }, []);

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

    const stageAttendance = (studentId, status) => {
        setAttendedStudents(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const unmarkAttendance = (studentId) => {
        setAttendedStudents(prev => {
            const next = { ...prev };
            delete next[studentId];
            return next;
        });
    };

    const markAllStatus = (status) => {
        const updates = {};
        filteredStudents.forEach(s => {
            if (s.attendanceStatus !== 'leave') {
                updates[s._id] = status;
            }
        });
        setAttendedStudents(prev => ({ ...prev, ...updates }));
    };

    const submitBulkAttendance = async () => {
        const studentIds = Object.keys(attendedStudents);
        if (studentIds.length === 0) {
            setError("No attendance records to submit.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const attendanceData = studentIds.map(id => ({
                studentId: id,
                status: attendedStudents[id]
            }));

            await axios.post('/attendance/manual-bulk', {
                attendanceData,
                classId: selectedSession.class?._id,
                subjectId: selectedSession.subject?._id
            });

            setSuccess(`Successfully submitted attendance for ${studentIds.length} students.`);
            setAttendedStudents({}); // Clear staging

            // Refresh roster to get updated statuses from backend
            const { data } = await axios.get('/teacher/roster');
            setRoster(data.subjectRoster || []);
            const currentAllocation = data.subjectRoster.find(r => r.allocationId === selectedSession.allocationId);
            if (currentAllocation) setSelectedSession(currentAllocation);

        } catch (error) {
            setError(error.response?.data?.message || "Failed to submit bulk attendance");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading student rosters...</div>;

    const hasBypass = user?.permissions?.includes('bypassTimeRestraint');
    const isSessionActive = selectedSession ? isCurrentTimeInSlot(selectedSession.startTime, selectedSession.endTime, selectedSession.dayOfWeek) : false;
    const canMark = isSessionActive || hasBypass;

    const filteredStudents = selectedSession?.students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (!user?.permissions?.includes('manualAttendance') && !user?.permissions?.includes('markAttendance')) {
        return (
            <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                <Lock size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Access Restricted</h3>
                <p style={{ color: 'var(--text-secondary)' }}>You do not have the required permissions ('Mark Attendance' or 'Manual Attendance') to access this page.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header & Session Selector */}
            <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ textAlign: isMobile ? 'center' : 'left', width: isMobile ? '100%' : 'auto' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                        <Users className="text-brand-primary" size={24} /> Manual Attendance
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Record attendance manually for assigned classes</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-end', width: isMobile ? '100%' : 'auto' }}>
                    {roster.map((session) => {
                        const active = isCurrentTimeInSlot(session.startTime, session.endTime, session.dayOfWeek);
                        return (
                            <button
                                key={session.allocationId}
                                onClick={() => { setSelectedSession(session); setError(null); }}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '0.75rem',
                                    border: selectedSession?.allocationId === session.allocationId ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    backgroundColor: selectedSession?.allocationId === session.allocationId ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    position: 'relative'
                                }}
                            >
                                <BookOpen size={16} className={active ? 'text-success' : 'text-light'} />
                                {session.subject?.subjectName}
                                {active && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', position: 'absolute', top: '-2px', right: '-2px', boxShadow: '0 0 10px #10b981' }}></span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Notifications Section */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                        <AlertCircle size={18} /> {error}
                    </motion.div>
                )}
                {success && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                        <CheckCircle size={18} /> {success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Status Bar */}
            <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: canMark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: isSessionActive ? 'var(--success)' : 'var(--bg-secondary)', color: isSessionActive ? 'white' : 'var(--text-light)' }}>
                        {isSessionActive ? <Clock size={20} /> : <Lock size={20} />}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>
                            {isSessionActive ? 'In-Progress Session' : 'Outside Scheduled Time'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {selectedSession?.dayOfWeek} | {selectedSession?.startTime} - {selectedSession?.endTime}
                        </div>
                    </div>
                </div>
                {hasBypass && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-primary)', fontSize: '0.85rem', fontWeight: '600', padding: '0.4rem 0.8rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '0.5rem' }}>
                        <ShieldCheck size={16} /> <span style={{ display: isMobile ? 'none' : 'inline' }}>Admin Override Active</span>
                    </div>
                )}
                {!canMark && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: '600', textAlign: 'right' }}>
                        {isMobile ? 'Restricted Access' : 'Restricted: Access only during class time.'}
                    </div>
                )}
            </div>

            {/* Student List */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedSession?.allocationId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel"
                    style={{ padding: '1.5rem', minHeight: '400px', opacity: canMark ? 1 : 0.7 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '1.5rem', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', textAlign: isMobile ? 'center' : 'left' }}>
                            Students in {selectedSession?.class?.className} - {selectedSession?.subject?.subjectName}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-end', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => markAllStatus('present')}
                                    disabled={!canMark || filteredStudents.length === 0}
                                    className="btn btn-outline"
                                    style={{ fontSize: '0.7rem', padding: '0.4rem 0.6rem', color: 'var(--success)', borderColor: 'var(--success)', flex: 1 }}
                                >
                                    All Present
                                </button>
                                <button
                                    onClick={() => markAllStatus('absent')}
                                    disabled={!canMark || filteredStudents.length === 0}
                                    className="btn btn-outline"
                                    style={{ fontSize: '0.7rem', padding: '0.4rem 0.6rem', color: 'var(--danger)', borderColor: 'var(--danger)', flex: 1 }}
                                >
                                    All Absent
                                </button>
                            </div>
                            {!isMobile && <div style={{ width: '1px', background: 'var(--border-color)', height: '20px' }}></div>}
                            <div style={{ position: 'relative', width: isMobile ? '100%' : '180px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-field"
                                    style={{ paddingLeft: '2.2rem', fontSize: '0.8rem', padding: '0.4rem 0.4rem 0.4rem 2.2rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Student</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Roll</th>
                                    {!isMobile && <th style={{ padding: '0.75rem', textAlign: 'center' }}>Streak</th>}
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                    <tr key={student._id} style={{ borderBottom: '1px solid var(--border-color)', height: '70px', opacity: canMark ? 1 : 0.6 }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={18} className="text-brand-primary" />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{student.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{student.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '600', color: 'var(--brand-primary)', fontSize: '0.85rem' }}>
                                            {student.rollNumber || 'N/A'}
                                        </td>
                                        {!isMobile && (
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '1rem',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '700',
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    color: 'var(--warning)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem'
                                                }}>
                                                    🔥 {student.streakCount || 0}
                                                </span>
                                            </td>
                                        )}
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                                {student.attendanceStatus === 'leave' ? (
                                                    <div style={{
                                                        padding: '0.4rem 0.75rem',
                                                        background: 'rgba(79, 70, 229, 0.1)',
                                                        color: 'var(--brand-primary)',
                                                        borderRadius: '0.5rem',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '800',
                                                        border: '1px solid rgba(79, 70, 229, 0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}>
                                                        <ShieldCheck size={12} /> <span style={{ display: isMobile ? 'none' : 'inline' }}>ON LEAVE</span>{isMobile && 'LEAVE'}
                                                    </div>
                                                ) : student.attendanceStatus ? (
                                                    <div style={{
                                                        padding: '0.4rem 0.75rem',
                                                        background: student.attendanceStatus === 'present' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: student.attendanceStatus === 'present' ? 'var(--success)' : 'var(--danger)',
                                                        borderRadius: '0.5rem',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '800',
                                                        textTransform: 'uppercase',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}>
                                                        {student.attendanceStatus === 'present' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                        {student.attendanceStatus}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {attendedStudents[student._id] ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                <div style={{
                                                                    padding: '0.4rem 0.75rem',
                                                                    background: attendedStudents[student._id] === 'present' ? 'var(--success)' : 'var(--danger)',
                                                                    color: 'white',
                                                                    borderRadius: '0.5rem',
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: '700',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.3rem'
                                                                }}>
                                                                    {attendedStudents[student._id] === 'present' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                                    {isMobile ? attendedStudents[student._id][0].toUpperCase() : attendedStudents[student._id].toUpperCase()}
                                                                </div>
                                                                <button
                                                                    onClick={() => unmarkAttendance(student._id)}
                                                                    style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 'bold' }}
                                                                >
                                                                    {isMobile ? 'X' : 'Unmark'}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                                <button
                                                                    disabled={!canMark}
                                                                    onClick={() => stageAttendance(student._id, 'present')}
                                                                    style={{
                                                                        padding: '0.4rem 0.75rem',
                                                                        borderRadius: '0.5rem',
                                                                        border: `1px solid ${!canMark ? 'var(--border-color)' : 'var(--success)'}`,
                                                                        backgroundColor: 'transparent',
                                                                        color: !canMark ? 'var(--text-light)' : 'var(--success)',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: '600',
                                                                        cursor: !canMark ? 'not-allowed' : 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.3rem'
                                                                    }}
                                                                >
                                                                    {isMobile ? 'P' : 'Present'}
                                                                </button>
                                                                <button
                                                                    disabled={!canMark}
                                                                    onClick={() => stageAttendance(student._id, 'absent')}
                                                                    style={{
                                                                        padding: '0.4rem 0.75rem',
                                                                        borderRadius: '0.5rem',
                                                                        border: `1px solid ${!canMark ? 'var(--border-color)' : 'var(--danger)'}`,
                                                                        backgroundColor: 'transparent',
                                                                        color: !canMark ? 'var(--text-light)' : 'var(--danger)',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: '600',
                                                                        cursor: !canMark ? 'not-allowed' : 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.3rem'
                                                                    }}
                                                                >
                                                                    {isMobile ? 'A' : 'Absent'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                            No students found in this class.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {Object.keys(attendedStudents).length > 0 && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            style={{
                                marginTop: '2rem',
                                padding: '1.5rem',
                                borderTop: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--brand-primary)05',
                                borderRadius: '0 0 1rem 1rem',
                                flexDirection: isMobile ? 'column' : 'row',
                                gap: '1rem'
                            }}
                        >
                            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--brand-primary)' }}>
                                    {Object.keys(attendedStudents).length} Students Ready
                                </div>
                                {!isMobile && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Click submit to finalize and sync with the database.
                                </div>}
                            </div>
                            <button
                                onClick={submitBulkAttendance}
                                disabled={loading}
                                className="btn btn-primary"
                                style={{ padding: isMobile ? '0.6rem 1.5rem' : '0.8rem 2.5rem', fontSize: '0.9rem', fontWeight: '700', borderRadius: '0.75rem', width: isMobile ? '100%' : 'auto' }}
                            >
                                {loading ? 'Submitting...' : 'Submit Attendance'}
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ManualAttendance;
