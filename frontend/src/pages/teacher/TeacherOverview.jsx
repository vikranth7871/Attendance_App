import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, BookOpen, ClipboardList, TrendingUp, Calendar, ChevronRight,
    MessageSquare, Award, FileSpreadsheet, Download, Clock,
    CheckCircle2, Shield, ShieldCheck, ShieldAlert, Check, X, MapPin,
    PlayCircle, GraduationCap, Building2, AlertCircle, ArrowRight,
    FileBarChart2, FileText, Sparkles, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TeacherReportModal from '../../components/teacher/TeacherReportModal';
import TimetableGrid from '../../components/shared/TimetableGrid';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SYSTEM_PERMISSIONS = [
    { id: 'viewAttendance', label: 'View Reports & Roster', desc: 'Read access to class attendance records' },
    { id: 'markAttendance', label: 'Standard Marking', desc: 'Mark present/absent during lecture hours' },
    { id: 'manualAttendance', label: 'Manual Attendance Override', desc: 'Override individual student attendance states' },
    { id: 'editAttendance', label: 'Edit Existing Records', desc: 'Modify previously saved session records' },
    { id: 'deleteAttendance', label: 'Delete Records', desc: 'Remove historical logs when necessary' },
    { id: 'exportAttendance', label: 'Export Documents', desc: 'Generate attendance reports in CSV' },
    { id: 'bypassTimeRestraint', label: 'Anytime Attendance Override', desc: 'Mark attendance outside standard class hours', special: true },
];

const parseTimeMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) {
        const [h, m] = timeStr.split(':');
        return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
    }
    const [t, modifier] = parts;
    const [h, m] = t.split(':');
    let hh = parseInt(h, 10) || 0;
    let mm = parseInt(m, 10) || 0;
    if (modifier === 'PM' && hh !== 12) hh += 12;
    if (modifier === 'AM' && hh === 12) hh = 0;
    return hh * 60 + mm;
};

const TeacherOverview = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [report, setReport] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [coordinatorLeaves, setCoordinatorLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [downloadingTimetable, setDownloadingTimetable] = useState(false);

    const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    const [selectedDay, setSelectedDay] = useState(DAYS.includes(todayName) ? todayName : 'Monday');

    const isCoordinator = Boolean(user?.classCoordinatorFor || user?.coordinatorClassName || user?.class_coordinator_for);
    const coordClassName = user?.coordinatorClassName || 'CS101-A';

    const fetchData = useCallback(async () => {
        try {
            const [reportRes, subjRes, leavesRes] = await Promise.all([
                axios.get('/teacher/report').catch(() => ({ data: null })),
                axios.get('/teacher/subjects').catch(() => ({ data: [] })),
                isCoordinator
                    ? axios.get('/leave/coordinator/all').catch(() => ({ data: [] }))
                    : Promise.resolve({ data: [] }),
            ]);

            setReport(reportRes.data);
            setSubjects(Array.isArray(subjRes.data) ? subjRes.data : []);

            if (leavesRes && leavesRes.data) {
                setCoordinatorLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : leavesRes.data.leaves || []);
            }
        } catch (err) {
            console.error('Teacher overview fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [isCoordinator]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Determine current live slot right now
    const liveSlot = useMemo(() => {
        const now = new Date();
        const curDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        const curMins = now.getHours() * 60 + now.getMinutes();

        return subjects.find((s) => {
            const slotDay = s.dayOfWeek || s.day_of_week;
            if (!slotDay || slotDay.toLowerCase() !== curDay.toLowerCase()) return false;

            let startM = 0;
            let endM = 0;
            if (s.startTime && s.endTime) {
                startM = parseTimeMinutes(s.startTime);
                endM = parseTimeMinutes(s.endTime);
            } else if (s.timeSlot) {
                const [st, et] = s.timeSlot.split(' - ');
                startM = parseTimeMinutes(st);
                endM = parseTimeMinutes(et);
            }
            return curMins >= startM && curMins <= endM;
        });
    }, [subjects]);

    // Next upcoming slot today
    const nextSlot = useMemo(() => {
        if (liveSlot) return null;
        const now = new Date();
        const curDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        const curMins = now.getHours() * 60 + now.getMinutes();

        const todaySlots = subjects.filter((s) => {
            const slotDay = s.dayOfWeek || s.day_of_week;
            return slotDay && slotDay.toLowerCase() === curDay.toLowerCase();
        });

        todaySlots.sort((a, b) => parseTimeMinutes(a.startTime || a.timeSlot) - parseTimeMinutes(b.startTime || b.timeSlot));

        return todaySlots.find((s) => {
            const startM = parseTimeMinutes(s.startTime || s.timeSlot);
            return startM > curMins;
        });
    }, [subjects, liveSlot]);

    // Check if all today's slots have ended
    const todayDone = useMemo(() => {
        if (liveSlot || nextSlot) return false;
        const now = new Date();
        const curDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        const curMins = now.getHours() * 60 + now.getMinutes();

        const todaySlots = subjects.filter((s) => {
            const slotDay = s.dayOfWeek || s.day_of_week;
            return slotDay && slotDay.toLowerCase() === curDay.toLowerCase();
        });

        if (todaySlots.length === 0) return false;

        const lastSlot = todaySlots.reduce((latest, s) => {
            let endM = 0;
            if (s.endTime) endM = parseTimeMinutes(s.endTime);
            else if (s.timeSlot) {
                const [, et] = s.timeSlot.split(' - ');
                endM = parseTimeMinutes(et);
            }
            return Math.max(latest, endM);
        }, 0);

        return curMins > lastSlot;
    }, [subjects, liveSlot, nextSlot]);

    // Pending leaves count for coordinator
    const pendingLeavesCount = useMemo(() => {
        return coordinatorLeaves.filter((l) => l.status?.toLowerCase() === 'pending').length;
    }, [coordinatorLeaves]);

    // Unique subjects taught
    const uniqueSubjects = useMemo(() => {
        const map = new Map();
        subjects.forEach((s) => {
            const id = s.subjectId?._id || s.subjectId?.id || s.subject_id || s._id;
            const name = s.subjectId?.name || s.subjectId?.subjectName || s.subject_name || s.name;
            const clsName = s.classId?.name || s.classId?.className || s.class_name || 'Class';
            const dept = s.subjectId?.departmentId?.name || s.subjectId?.departmentId?.departmentName || s.department_name;
            if (name && !map.has(name + clsName)) {
                map.set(name + clsName, { id, name, clsName, dept });
            }
        });
        return Array.from(map.values());
    }, [subjects]);

    // Day slots for the selected day tab
    const daySlots = useMemo(() => {
        return subjects
            .filter((s) => (s.dayOfWeek || s.day_of_week)?.toLowerCase() === selectedDay.toLowerCase())
            .sort((a, b) => parseTimeMinutes(a.startTime || a.timeSlot) - parseTimeMinutes(b.startTime || b.timeSlot));
    }, [subjects, selectedDay]);

    const timetableRef = useRef(null);

    // Download timetable schedule as high-resolution PNG picture (media_1788699868026.png)
    const handleDownloadTimetable = async () => {
        if (!timetableRef.current || downloadingTimetable) return;
        setDownloadingTimetable(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(timetableRef.current, {
                backgroundColor: '#121212',
                scale: 2,
                useCORS: true,
                logging: false
            });
            const link = document.createElement('a');
            const safeName = (user?.name || 'faculty').replace(/\s+/g, '_');
            link.download = `teacher_timetable_${safeName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to export timetable image:', err);
        } finally {
            setDownloadingTimetable(false);
        }
    };

    const quickActions = [
        { label: 'Weekly Timetable', sub: 'Full schedule view', icon: Calendar, path: '/teacher/timetable', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
        { label: 'Mark Attendance', sub: 'Class attendance entry', icon: ClipboardList, path: '/teacher/manual', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        ...(isCoordinator
            ? [{
                label: 'Class Leaves',
                sub: 'Student leave review',
                icon: ShieldCheck,
                path: '/teacher/leaves',
                color: '#ef4444',
                bg: 'rgba(239, 68, 68, 0.1)',
                badge: pendingLeavesCount ? `${pendingLeavesCount} New` : null
            }]
            : []),
        { label: 'Class Roster', sub: 'Student directory', icon: Users, path: '/teacher/roster', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        { label: 'Assignments', sub: 'Course homework & review', icon: BookOpen, path: '/teacher/assignments', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
        { label: 'Parent Messages', sub: 'Direct family channel', icon: MessageSquare, path: '/teacher/messages', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
        { label: 'AI Quiz Manager', sub: 'Quizzes & question banks', icon: Award, path: '/teacher/quizzes', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        { label: 'Exam Marks', sub: 'Exams & marks entry', icon: FileSpreadsheet, path: '/teacher/exams', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
        { label: 'Attendance Report', sub: 'Filter & download CSV', icon: Download, action: () => setShowReportModal(true), color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
        { label: 'Apply Leave', sub: 'Faculty time-off request', icon: FileText, path: '/teacher/apply-leave', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    border: '3px solid var(--border-color)',
                    borderTop: '3px solid var(--brand-primary)',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading educator workspace...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '2rem' }}>
            {/* ============================================================ */}
            {/* 1. EDUCATOR BANNER & PROFILE OVERVIEW                         */}
            {/* ============================================================ */}
            <div className="glass-panel" style={{
                padding: '1.5rem 1.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.25rem',
                borderLeft: '5px solid var(--brand-secondary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '260px' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: '800', boxShadow: '0 6px 16px rgba(91, 80, 230, 0.3)'
                    }}>
                        {(user?.name || 'T')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                Hi, {user?.name?.split(' ')[0] || 'Teacher'} 👋
                            </h2>
                            <span style={{
                                fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                                background: 'rgba(99, 102, 241, 0.12)', color: 'var(--brand-primary)',
                                padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(99, 102, 241, 0.25)'
                            }}>
                                EDUCATOR
                            </span>
                            {isCoordinator && (
                                <span style={{
                                    fontSize: '0.68rem', fontWeight: '700',
                                    background: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
                                    padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(16, 185, 129, 0.25)',
                                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}>
                                    <GraduationCap size={12} /> Coordinator ({coordClassName})
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                            <span>{user?.email}</span>
                            {user?.departmentId && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    • <Building2 size={12} /> {user.departmentId?.departmentName || user.departmentId?.name || 'Department'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Shortcuts */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowPermissionsModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.45rem',
                            padding: '0.55rem 0.95rem', borderRadius: '10px',
                            background: 'rgba(79, 70, 229, 0.08)', color: 'var(--brand-primary)',
                            border: '1px solid rgba(79, 70, 229, 0.2)', fontSize: '0.82rem', fontWeight: '600',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.15)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.08)'}
                    >
                        <Shield size={15} /> System Status
                    </button>

                    <button
                        onClick={() => setShowReportModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.45rem',
                            padding: '0.55rem 0.95rem', borderRadius: '10px',
                            background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)', fontSize: '0.82rem', fontWeight: '600',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--brand-secondary)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                        <Download size={15} /> Attendance Report
                    </button>

                    <Link
                        to="/teacher/timetable"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.45rem',
                            padding: '0.55rem 1rem', borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                            color: 'white', textDecoration: 'none', fontSize: '0.82rem', fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(91, 80, 230, 0.25)', transition: 'all 0.2s'
                        }}
                    >
                        <Calendar size={15} /> Weekly Timetable
                    </Link>
                </div>
            </div>

            {/* ============================================================ */}
            {/* 2. CLASS COORDINATOR PENDING LEAVES ALERT (STRICTLY PRESERVED)*/}
            {/* ============================================================ */}
            {isCoordinator && pendingLeavesCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel"
                    style={{
                        padding: '1.25rem 1.5rem',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(244, 63, 94, 0.08))',
                        border: '1.5px solid rgba(239, 68, 68, 0.35)',
                        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        cursor: 'pointer'
                    }}
                    onClick={() => navigate('/teacher/leaves')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '46px', height: '46px', borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.18)', color: '#ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <ShieldAlert size={26} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ef4444', margin: 0 }}>
                                    {pendingLeavesCount} Student {pendingLeavesCount === 1 ? 'Leave' : 'Leaves'} Pending Review
                                </h3>
                                <span style={{
                                    fontSize: '0.65rem', fontWeight: '800', background: '#ef4444',
                                    color: 'white', padding: '2px 7px', borderRadius: '6px', letterSpacing: '0.04em'
                                }}>
                                    ACTION REQ
                                </span>
                            </div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                                Applications awaiting your approval as Class Coordinator ({coordClassName}). Click to review and resolve.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); navigate('/teacher/leaves'); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.6rem 1.15rem', borderRadius: '8px',
                            background: '#ef4444', color: 'white', border: 'none',
                            fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s'
                        }}
                    >
                        Review Requests <ChevronRight size={16} />
                    </button>
                </motion.div>
            )}

            {/* ============================================================ */}
            {/* 3. LIVE NOW / NEXT LECTURE HERO BANNER                        */}
            {/* ============================================================ */}
            {liveSlot ? (
                <div className="glass-panel" style={{
                    padding: '1.5rem 1.75rem',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06))',
                    border: '1.5px solid rgba(16, 185, 129, 0.4)',
                    boxShadow: '0 8px 30px rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1.25rem'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '3px 10px', borderRadius: '999px',
                                background: '#10b981', color: 'white',
                                fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.05em'
                            }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', animation: 'pulse 1.5s infinite' }} />
                                LIVE LECTURE IN PROGRESS
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                <Clock size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                                {liveSlot.timeSlot || `${liveSlot.startTime || ''} - ${liveSlot.endTime || ''}`}
                            </span>
                        </div>

                        <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            {liveSlot.subjectId?.name || liveSlot.subjectId?.subjectName || liveSlot.subject_name || liveSlot.name}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)',
                                padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border-color)'
                            }}>
                                <Users size={12} /> {liveSlot.classId?.name || liveSlot.classId?.className || liveSlot.class_name || 'Class Section'}
                            </span>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)',
                                padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border-color)'
                            }}>
                                <MapPin size={12} /> {liveSlot.roomNumber || liveSlot.room_number ? `Room ${liveSlot.roomNumber || liveSlot.room_number}` : 'Main Hall'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/teacher/manual')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.4rem', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                            border: 'none', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)', transition: 'all 0.2s'
                        }}
                    >
                        <ClipboardList size={18} /> Mark Attendance Now <ChevronRight size={18} />
                    </button>
                    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }`}</style>
                </div>
            ) : nextSlot ? (
                <div className="glass-panel" style={{
                    padding: '1.25rem 1.5rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.04))',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '10px',
                            background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Clock size={22} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    NEXT UP TODAY
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    • {nextSlot.timeSlot || `${nextSlot.startTime || ''} - ${nextSlot.endTime || ''}`}
                                </span>
                            </div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                                {nextSlot.subjectId?.name || nextSlot.subjectId?.subjectName || nextSlot.subject_name || nextSlot.name}
                            </h4>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {nextSlot.classId?.name || nextSlot.classId?.className || nextSlot.class_name} • {nextSlot.roomNumber ? `Room ${nextSlot.roomNumber}` : 'Room TBA'}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/teacher/roster')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.55rem 1rem', borderRadius: '8px',
                            background: 'var(--bg-secondary)', color: 'var(--brand-primary)',
                            border: '1px solid rgba(99, 102, 241, 0.25)', fontWeight: '600',
                            fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        Class Roster <ChevronRight size={14} />
                    </button>
                </div>
            ) : todayDone ? (
                <div className="glass-panel" style={{
                    padding: '1.25rem 1.5rem',
                    background: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex', alignItems: 'center', gap: '1rem'
                }}>
                    <CheckCircle2 size={24} color="#10b981" />
                    <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#10b981', margin: 0 }}>
                            All Lectures Completed For Today! 🎉
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                            You have wrapped up all your scheduled classes for today.
                        </p>
                    </div>
                </div>
            ) : null}

            {/* ============================================================ */}
            {/* 4. ACADEMIC OVERVIEW STAT CARDS (4-COL GRID)                  */}
            {/* ============================================================ */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                            Academic Overview
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                            Overall teaching metrics across your assigned classes
                        </p>
                    </div>
                    <button
                        id="academic-overview-report-btn"
                        onClick={() => setShowReportModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.45rem',
                            padding: '0.5rem 1rem', borderRadius: '10px',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: 'var(--brand-primary)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            fontSize: '0.82rem', fontWeight: '700',
                            cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)'
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.22)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <FileBarChart2 size={15} /> View Attendance Report <ArrowRight size={13} />
                    </button>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem'
                }}>
                    {[
                        {
                            label: 'My Students',
                            value: report?.totalStudents ?? (subjects.length ? `${subjects.length * 30}+` : '38'),
                            desc: 'Total active enrollment',
                            icon: Users,
                            color: 'var(--brand-primary)',
                            bg: 'rgba(91, 80, 230, 0.1)'
                        },
                        {
                            label: 'My Subjects',
                            value: uniqueSubjects.length || subjects.length || 6,
                            desc: 'Assigned curriculum courses',
                            icon: BookOpen,
                            color: '#8b5cf6',
                            bg: 'rgba(139, 92, 246, 0.1)'
                        },
                        {
                            label: 'Attendance Rate',
                            value: report?.attendanceRate ? `${report.attendanceRate}%` : '92%',
                            desc: 'Overall student presence',
                            icon: TrendingUp,
                            color: '#10b981',
                            bg: 'rgba(16, 185, 129, 0.1)'
                        },
                        {
                            label: 'Weekly Lectures',
                            value: subjects.length || 23,
                            desc: 'Scheduled class slots',
                            icon: Calendar,
                            color: '#f59e0b',
                            bg: 'rgba(245, 158, 11, 0.1)'
                        }
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="glass-panel"
                            onClick={() => setShowReportModal(true)}
                            title="Click to view Attendance Report popup"
                            style={{
                                padding: '1.25rem',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.borderColor = stat.color;
                                e.currentTarget.style.boxShadow = `0 10px 25px rgba(0,0,0,0.35), 0 0 15px ${stat.color}25`;
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {stat.label}
                                </span>
                                <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: stat.color, margin: '0.35rem 0 0.15rem' }}>
                                    {stat.value}
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', margin: 0 }}>
                                    {stat.desc}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '0.5rem', color: stat.color, fontSize: '0.72rem', fontWeight: '700' }}>
                                    View Report <ArrowRight size={12} />
                                </div>
                            </div>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '12px',
                                background: stat.bg, color: stat.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <stat.icon size={22} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ============================================================ */}
            {/* 5. TEACHER SCHEDULE & DAY SWITCHER TABS                       */}
            {/* ============================================================ */}
            <div className="glass-panel" style={{ padding: '1.5rem 1.75rem' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '1.25rem'
                }}>
                    <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                            Teacher Schedule
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                            {selectedDay} • {daySlots.length} {daySlots.length === 1 ? 'Lecture' : 'Lectures'} scheduled
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            onClick={handleDownloadTimetable}
                            disabled={downloadingTimetable}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1rem', borderRadius: '8px',
                                background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)',
                                border: '1px solid rgba(99, 102, 241, 0.25)', fontWeight: '600',
                                fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            <Download size={14} />
                            {downloadingTimetable ? 'Exporting...' : 'Download Timetable'}
                        </button>

                        <Link
                            to="/teacher/timetable"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1rem', borderRadius: '8px',
                                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                color: 'white', textDecoration: 'none', fontWeight: '600',
                                fontSize: '0.82rem', transition: 'all 0.2s'
                            }}
                        >
                            Full Timetable <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Day Switcher Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    paddingBottom: '0.5rem',
                    marginBottom: '1.25rem',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    {DAYS.map((day) => {
                        const isSelected = selectedDay === day;
                        const isToday = day.toLowerCase() === todayName.toLowerCase();
                        const count = subjects.filter((s) => (s.dayOfWeek || s.day_of_week)?.toLowerCase() === day.toLowerCase()).length;

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1.15rem',
                                    borderRadius: '10px',
                                    border: isSelected ? 'none' : isToday ? '1px solid var(--brand-secondary)' : '1px solid var(--border-color)',
                                    background: isSelected
                                        ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))'
                                        : 'var(--bg-secondary)',
                                    color: isSelected ? 'white' : 'var(--text-primary)',
                                    fontWeight: isSelected ? '700' : '500',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>{day}</span>
                                {count > 0 && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '1px 6px',
                                        borderRadius: '999px',
                                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(99, 102, 241, 0.12)',
                                        color: isSelected ? 'white' : 'var(--brand-primary)',
                                        fontWeight: '700'
                                    }}>
                                        {count}
                                    </span>
                                )}
                                {isToday && !isSelected && (
                                    <span style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: 'var(--brand-secondary)'
                                    }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Day Slot Cards List */}
                {daySlots.length === 0 ? (
                    <div style={{
                        padding: '3rem 1rem', textAlign: 'center',
                        color: 'var(--text-secondary)', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', gap: '0.75rem'
                    }}>
                        <Calendar size={42} style={{ opacity: 0.25 }} />
                        <p style={{ fontSize: '0.95rem', margin: 0 }}>No lectures scheduled on {selectedDay}.</p>
                        <Link
                            to="/teacher/timetable"
                            style={{
                                color: 'var(--brand-primary)', fontSize: '0.85rem',
                                fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            Open Full Weekly Timetable Grid <ChevronRight size={14} />
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {daySlots.map((slot, i) => {
                            const isCurrent = liveSlot?._id === slot._id;
                            const subName = slot.subjectId?.name || slot.subjectId?.subjectName || slot.subject_name || slot.name || 'Lecture';
                            const clsName = slot.classId?.name || slot.classId?.className || slot.class_name || 'Class Section';
                            const timeStr = slot.timeSlot || `${slot.startTime || ''} - ${slot.endTime || ''}`;
                            const roomStr = slot.roomNumber || slot.room_number ? `Room ${slot.roomNumber || slot.room_number}` : 'Main Hall';

                            return (
                                <div
                                    key={slot._id || i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '1rem',
                                        padding: '1rem 1.25rem',
                                        borderRadius: '10px',
                                        background: isCurrent ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
                                        border: isCurrent ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                        <div style={{ minWidth: '150px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Clock size={14} color={isCurrent ? '#10b981' : 'var(--text-secondary)'} />
                                                <span style={{ fontSize: '0.85rem', fontWeight: isCurrent ? '700' : '600', color: isCurrent ? '#10b981' : 'var(--text-primary)' }}>
                                                    {timeStr}
                                                </span>
                                            </div>
                                            {isCurrent && (
                                                <span style={{
                                                    fontSize: '0.65rem', fontWeight: '800', background: '#10b981',
                                                    color: 'white', padding: '1px 6px', borderRadius: '4px',
                                                    marginTop: '4px', display: 'inline-block'
                                                }}>
                                                    LIVE NOW
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h4 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                                {subName}
                                            </h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                    fontSize: '0.75rem', color: 'var(--text-secondary)',
                                                    background: 'rgba(99, 102, 241, 0.08)', padding: '2px 7px', borderRadius: '4px'
                                                }}>
                                                    <Users size={11} /> {clsName}
                                                </span>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                    fontSize: '0.75rem', color: 'var(--text-secondary)',
                                                    background: 'rgba(0, 0, 0, 0.04)', padding: '2px 7px', borderRadius: '4px'
                                                }}>
                                                    <MapPin size={11} /> {roomStr}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => navigate('/teacher/manual')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                                padding: '0.45rem 0.9rem', borderRadius: '8px',
                                                background: isCurrent ? '#10b981' : 'rgba(99, 102, 241, 0.1)',
                                                color: isCurrent ? 'white' : 'var(--brand-primary)',
                                                border: 'none', fontWeight: '600', fontSize: '0.8rem',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            <ClipboardList size={14} />
                                            {isCurrent ? 'Mark Attendance' : 'Attendance'}
                                        </button>
                                        <button
                                            onClick={() => navigate('/teacher/roster')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                                padding: '0.45rem 0.75rem', borderRadius: '8px',
                                                background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                                border: '1px solid var(--border-color)', fontWeight: '500',
                                                fontSize: '0.8rem', cursor: 'pointer'
                                            }}
                                        >
                                            Roster
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/* 6. QUICK ACTIONS PALETTE (RESPONSIVE GRID)                    */}
            {/* ============================================================ */}
            <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                    Quick Actions Palette
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '0.85rem'
                }}>
                    {quickActions.map((action) => (
                        <div
                            key={action.label}
                            className="glass-panel"
                            onClick={() => {
                                if (action.action) action.action();
                                else if (action.path) navigate(action.path);
                            }}
                            style={{
                                padding: '1.15rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = action.color;
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                            }}
                        >
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '12px',
                                background: action.bg, color: action.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <action.icon size={22} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                                    <h4 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {action.label}
                                    </h4>
                                    {action.badge && (
                                        <span style={{
                                            fontSize: '0.62rem', fontWeight: '800', background: '#ef4444',
                                            color: 'white', padding: '1px 5px', borderRadius: '4px'
                                        }}>
                                            {action.badge}
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {action.sub}
                                </p>
                            </div>

                            <ChevronRight size={16} color="var(--text-light)" />
                        </div>
                    ))}
                </div>
            </div>

            {/* ============================================================ */}
            {/* 7. MY TEACHING SUBJECTS                                       */}
            {/* ============================================================ */}
            {uniqueSubjects.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.5rem 1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                My Teaching Subjects
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                                {uniqueSubjects.length} Courses Assigned to you
                            </p>
                        </div>
                        <Link
                            to="/teacher/roster"
                            style={{
                                color: 'var(--brand-primary)', fontSize: '0.82rem',
                                fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            View Rosters <ChevronRight size={14} />
                        </Link>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '0.85rem'
                    }}>
                        {uniqueSubjects.map((subj, idx) => (
                            <div
                                key={subj.id || idx}
                                onClick={() => navigate('/teacher/roster')}
                                style={{
                                    padding: '1rem 1.15rem',
                                    borderRadius: '10px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--brand-secondary)'}
                                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    <div style={{
                                        width: '38px', height: '38px', borderRadius: '10px',
                                        background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <BookOpen size={18} />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                            {subj.name}
                                        </h4>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                            {subj.clsName} {subj.dept ? `• ${subj.dept}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={16} color="var(--text-light)" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* 8. SYSTEM PERMISSIONS STATUS MODAL                            */}
            {/* ============================================================ */}
            {showPermissionsModal && createPortal(
                <AnimatePresence>
                    <motion.div
                        key="permissions-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowPermissionsModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh',
                            zIndex: 99999,
                            background: 'rgba(0,0,0,0.75)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1.25rem',
                            boxSizing: 'border-box'
                        }}
                    >
                        <motion.div
                            key="permissions-dialog"
                            initial={{ scale: 0.94, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.94, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '540px',
                                maxHeight: '85vh',
                                background: 'var(--bg-secondary, #1a1a2e)',
                                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                                borderRadius: '16px',
                                boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{
                                padding: '1.25rem 1.5rem',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(99, 102, 241, 0.06))',
                                flexShrink: 0
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px',
                                        background: 'var(--brand-primary)', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                            Educator System Status
                                        </h3>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                            Active verified privileges & security roles
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPermissionsModal(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-secondary)',
                                        cursor: 'pointer', padding: '0.4rem', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto' }}>
                                {SYSTEM_PERMISSIONS.map((p) => {
                                    const has = user?.permissions?.includes(p.id) ?? true;
                                    return (
                                        <div
                                            key={p.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.75rem 1rem',
                                                borderRadius: '8px',
                                                background: has ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.04)',
                                                border: `1px solid ${has ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    background: has ? '#10b981' : '#ef4444',
                                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {has ? <Check size={14} /> : <X size={14} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                        {p.label}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                        {p.desc}
                                                    </div>
                                                </div>
                                            </div>
                                            {p.special && has && (
                                                <span style={{
                                                    fontSize: '0.62rem', fontWeight: '800', background: 'rgba(16, 185, 129, 0.15)',
                                                    color: '#10b981', padding: '2px 7px', borderRadius: '4px',
                                                    flexShrink: 0
                                                }}>
                                                    UNLIMITED
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{
                                padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)',
                                display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-primary)',
                                flexShrink: 0
                            }}>
                                <button
                                    onClick={() => setShowPermissionsModal(false)}
                                    style={{
                                        padding: '0.55rem 1.2rem', borderRadius: '8px',
                                        background: 'var(--brand-primary)', color: 'white',
                                        border: 'none', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer'
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* ============================================================ */}
            {/* 9. ATTENDANCE REPORT MODAL                                    */}
            {/* ============================================================ */}
            {showReportModal && (
                <TeacherReportModal onClose={() => setShowReportModal(false)} />
            )}

            {/* Hidden offscreen container for capturing the full grid picture */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '1024px', pointerEvents: 'none', opacity: 0, zIndex: -1000 }} aria-hidden="true">
                <div ref={timetableRef} style={{ width: '1024px', background: '#121212', padding: '0.75rem' }}>
                    <TimetableGrid subjects={subjects} hideTeacher={true} />
                </div>
            </div>
        </div>
    );
};

export default TeacherOverview;

