import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Users, GraduationCap, Search, Mail, User, BookOpen, Lock, X, Activity, Award, Calendar, BarChart2, Flame } from 'lucide-react';

const StudentProfileModal = ({ studentId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await axios.get(`/teacher/student/${studentId}/profile`);
                setData(data);
            } catch (error) {
                console.error("Failed to fetch student profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [studentId]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '2rem'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                style={{
                    backgroundColor: 'var(--bg-primary)', borderRadius: '1.5rem',
                    width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
                    border: '1px solid var(--border-color)', position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.5 }}>
                    <X size={24} />
                </button>

                {loading ? (
                    <div style={{ padding: '6rem', textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto 1.5rem' }} />
                        <p>Aggregating student records...</p>
                    </div>
                ) : data && (
                    <div style={{ padding: '3rem' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '3rem' }}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '2rem', background: 'linear-gradient(45deg, var(--brand-primary), var(--brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={48} color="white" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.25rem' }}>{data.student.name}</h2>
                                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <GraduationCap size={18} />
                                    {[
                                        data.student.departmentId?.departmentName,
                                        data.student.classId?.className
                                    ].filter(Boolean).join(' • ') || 'No department assigned'}
                                    {data.student.rollNumber ? ` • Roll No: ${data.student.rollNumber}` : ''}
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Overall Attendance</div>
                                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--success)' }}>{data.stats.attendancePercentage}%</div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Total Conducted Sessions</div>
                                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--brand-secondary)' }}>{data.stats.totalClasses || 0}</div>
                            </div>
                        </div>

                        {/* Subject Breakdown */}
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <BarChart2 size={20} className="text-brand-primary" /> Subject-wise Performance
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.stats.subjectWise.map(sub => (
                                <div key={sub.subjectName} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ fontWeight: '700' }}>{sub.subjectName}</span>
                                        <span style={{ fontWeight: '800', color: parseFloat(sub.percentage) >= 75 ? 'var(--success)' : 'var(--danger)' }}>{sub.percentage}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${sub.percentage}%`, height: '100%', background: parseFloat(sub.percentage) >= 75 ? 'var(--success)' : 'var(--danger)', transition: 'width 1s ease' }} />
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                                        {sub.present} present out of {sub.total} classes held
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

const ClassRoster = () => {
    const { user } = useAuth();
    const [rosterData, setRosterData] = useState({ subjectRoster: [], coordinatedRoster: null });
    const [activeTab, setActiveTab] = useState('subject'); // 'subject' or 'coordinated'
    const [selectedSession, setSelectedSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [profileStudentId, setProfileStudentId] = useState(null);

    useEffect(() => {
        const fetchRoster = async () => {
            try {
                const { data } = await axios.get('/teacher/roster');
                setRosterData(data);
                if (data.subjectRoster.length > 0) setSelectedSession(data.subjectRoster[0]);
                if (data.coordinatedRoster) setActiveTab('coordinated');
            } catch (error) {
                console.error("Failed to fetch roster", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRoster();
    }, []);

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>;

    const currentStudents = activeTab === 'coordinated'
        ? rosterData.coordinatedRoster?.students || []
        : selectedSession?.students || [];

    const filteredStudents = currentStudents.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Access is already checked by routes and sidebar visibility. 
    // This allows teachers to see their assigned subject rosters even without a separate 'viewAttendance' permission.

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Main Header with Roster Mode Toggles */}
            <div className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Users className="text-brand-primary" size={28} /> Campus Directory
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage and view student information for your classes.</p>
                </div>

                {rosterData.coordinatedRoster && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: '1rem', border: '1px solid var(--border-color)', position: 'relative' }}>
                        {[
                            { id: 'coordinated', label: 'Class Coordinator' },
                            { id: 'subject', label: 'Subject Roster' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: 12,
                                    border: 'none',
                                    background: 'transparent',
                                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                    fontWeight: activeTab === tab.id ? '800' : '600',
                                    cursor: 'pointer',
                                    transition: 'color 0.3s'
                                }}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="classRosterTab"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                            borderRadius: 12,
                                            zIndex: -1,
                                            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                                        }}
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Sub-navigation for Subject Roster */}
            {activeTab === 'subject' && rosterData.subjectRoster.length > 0 && (
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {rosterData.subjectRoster.map((session) => {
                        const isSelected = selectedSession?.allocationId === session.allocationId;
                        return (
                            <button
                                key={session.allocationId}
                                onClick={() => setSelectedSession(session)}
                                className="glass-panel"
                                style={{
                                    padding: '0.85rem 1.35rem',
                                    borderRadius: '1.25rem',
                                    background: isSelected ? 'var(--brand-secondary)' : 'rgba(255,255,255,0.02)',
                                    color: isSelected ? 'white' : 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <BookOpen size={18} />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '0.95rem' }}>
                                        {session.class?.className} - {session.subject?.subjectName}
                                    </div>
                                    {session.scheduleBadge && (
                                        <div style={{ fontSize: '0.75rem', opacity: isSelected ? 0.9 : 0.6, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Calendar size={13} /> {session.scheduleBadge}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* List Header */}
            <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ flex: '1 1 min-content' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                            {activeTab === 'coordinated'
                                ? `${rosterData.coordinatedRoster?.class?.className || 'Coordinated Class'} Students`
                                : `${selectedSession?.class?.className || ''} - ${selectedSession?.subject?.subjectName || ''}`
                            }
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                            {activeTab === 'coordinated'
                                ? 'Complete roster for your coordinated class.'
                                : selectedSession?.scheduleBadge ? `${selectedSession.scheduleBadge} • ${currentStudents.length} Students Enrolled` : `List updated for the current ${selectedSession?.subject?.subjectName} schedule.`
                            }
                        </p>
                    </div>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                        <input
                            type="text" placeholder="Search name, roll, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field"
                            style={{ padding: '0.8rem 1rem 0.8rem 3rem' }}
                        />
                    </div>
                </div>

                {/* Sheet / Table Format */}
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '0.75rem 1.25rem', fontWeight: '800' }}>#</th>
                                <th style={{ padding: '0.75rem 1.25rem', fontWeight: '800' }}>Student Name</th>
                                <th style={{ padding: '0.75rem 1.25rem', fontWeight: '800' }}>Roll Number</th>
                                <th style={{ padding: '0.75rem 1.25rem', fontWeight: '800' }}>Email Address</th>
                                <th style={{ padding: '0.75rem 1.25rem', fontWeight: '800' }}>Attendance %</th>
                                {activeTab === 'subject' && <th style={{ padding: '0.75rem 1.25rem', fontWeight: '800' }}>Status</th>}
                                {(activeTab === 'coordinated' || user?.role === 'admin') && <th style={{ padding: '0.75rem 1.25rem', fontWeight: '800', textAlign: 'right' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => (
                                <motion.tr
                                    layout
                                    key={student._id}
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-color)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    whileHover={{ backgroundColor: 'rgba(91, 80, 230, 0.06)' }}
                                >
                                    <td style={{ padding: '1rem 1.25rem', borderRadius: '12px 0 0 12px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {idx + 1}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(91, 80, 230, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <User size={20} className="text-brand-primary" />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{student.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        {student.rollNumber || 'N/A'}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Mail size={14} color="var(--brand-primary)" /> {student.email}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        <span style={{
                                            fontSize: '0.82rem',
                                            fontWeight: '800',
                                            color: (student.attendancePercentage || 0) >= 75 ? '#10b981' : '#ef4444',
                                            background: (student.attendancePercentage || 0) >= 75 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                            padding: '0.3rem 0.7rem',
                                            borderRadius: '8px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                        }}>
                                            <BarChart2 size={14} color={(student.attendancePercentage || 0) >= 75 ? '#10b981' : '#ef4444'} />
                                            {student.attendancePercentage !== undefined ? `${student.attendancePercentage}%` : '0%'}
                                        </span>
                                    </td>
                                    {activeTab === 'subject' && (
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            {student.attendanceStatus ? (
                                                <span className={`badge badge-${student.attendanceStatus === 'present' ? 'success' : 'danger'}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '800' }}>
                                                    {student.attendanceStatus}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Unmarked</span>
                                            )}
                                        </td>
                                    )}
                                    {(activeTab === 'coordinated' || user?.role === 'admin') && (
                                        <td style={{ padding: '1rem 1.25rem', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
                                            <button
                                                onClick={() => setProfileStudentId(student._id)}
                                                style={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: '800',
                                                    color: 'var(--brand-primary)',
                                                    background: 'rgba(91, 80, 230, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    padding: '0.4rem 0.85rem',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                View Profile
                                            </button>
                                        </td>
                                    )}
                                </motion.tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                                        <Users size={48} style={{ margin: '0 auto 1rem' }} />
                                        <p style={{ fontWeight: '600' }}>No student records found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {profileStudentId && <StudentProfileModal studentId={profileStudentId} onClose={() => setProfileStudentId(null)} />}
            </AnimatePresence>

            <style>{`
                .student-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .student-card:hover { border-color: var(--brand-primary) !important; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5); }
                .loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ClassRoster;
