import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users, Calendar, AlertCircle, ChevronRight, Activity, TrendingUp,
    Bell, ShieldCheck, BookOpen, GraduationCap, Hash, CheckCircle2,
    Clock, Award, CreditCard, MessageSquare, UserCheck, Sparkles
} from 'lucide-react';
import ParentSidebar from '../../components/parent/ParentSidebar';
import ChildSwitcher from '../../components/parent/ChildSwitcher';
import NotificationDropdown from '../../components/shared/NotificationDropdown';

import ParentAttendance from './ParentAttendance';
import ParentLeave from './ParentLeave';
import ParentTimetable from './ParentTimetable';
import ParentAssignments from './ParentAssignments';
import ParentResults from './ParentResults';
import ParentFees from './ParentFees';
import ParentMessages from './ParentMessages';
import ParentProfile from './ParentProfile';

const ParentSummaryHub = ({ childrenSummary, selectedChildId, loading, navigate }) => {
    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading student profiles...</div>;
    if (!childrenSummary || childrenSummary.length === 0) return (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Users size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-light)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>No Children Linked</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Please contact the system administrator to link your student accounts.</p>
        </div>
    );

    const activeChild = childrenSummary.find(c => c.studentId === selectedChildId) || childrenSummary[0];

    const quickActions = [
        { name: 'Attendance', path: '/parent/attendance', icon: <Calendar size={20} color="var(--brand-primary)" />, bg: 'rgba(99, 102, 241, 0.1)' },
        { name: 'Timetable', path: '/parent/timetable', icon: <Clock size={20} color="var(--brand-secondary)" />, bg: 'rgba(59, 130, 246, 0.1)' },
        { name: 'Assignments', path: '/parent/assignments', icon: <BookOpen size={20} color="#10b981" />, bg: 'rgba(16, 185, 129, 0.1)' },
        { name: 'Fees & Receipts', path: '/parent/fees', icon: <CreditCard size={20} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.1)' },
        { name: 'Exam Results', path: '/parent/results', icon: <Award size={20} color="#ec4899" />, bg: 'rgba(236, 72, 153, 0.1)' },
        { name: 'Teacher Messages', path: '/parent/messages', icon: <MessageSquare size={20} color="#8b5cf6" />, bg: 'rgba(139, 92, 246, 0.1)' },
        { name: 'Leave Requests', path: '/parent/leaves', icon: <CheckCircle2 size={20} color="#06b6d4" />, bg: 'rgba(6, 182, 212, 0.1)' },
        { name: 'Profile Settings', path: '/parent/profile', icon: <ShieldCheck size={20} color="#64748b" />, bg: 'rgba(100, 116, 139, 0.1)' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Student Profile Card Header */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel"
                style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}
            >
                <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', opacity: 0.08, borderRadius: '0 0 0 100%', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.75rem', fontWeight: '800', boxShadow: '0 8px 20px rgba(99,102,241,0.3)'
                        }}>
                            {activeChild.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>{activeChild.name}</h2>
                                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-primary)' }}>
                                    {activeChild.classInfo?.className || activeChild.classInfo?.name || 'Class VIII-A'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Hash size={14} /> Roll: {activeChild.rollNumber || 'STU001'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><GraduationCap size={14} /> Sec {activeChild.section || 'A'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><UserCheck size={14} /> {activeChild.department}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', background: 'var(--bg-secondary)', padding: '1rem 1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '2.25rem', fontWeight: '900', color: parseFloat(activeChild.attendancePercentage) >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                            {activeChild.attendancePercentage}%
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Attendance</div>
                    </div>
                </div>

                {/* Today's Status Banner */}
                <div style={{ marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Today's Status:</span>
                        <span style={{
                            padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase',
                            background: activeChild.todayStatus === 'present' ? 'rgba(16,185,129,0.15)' : activeChild.todayStatus === 'absent' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                            color: activeChild.todayStatus === 'present' ? 'var(--success)' : activeChild.todayStatus === 'absent' ? 'var(--danger)' : 'var(--brand-primary)'
                        }}>
                            {activeChild.todayStatus === 'present' ? '✓ Present Today' : activeChild.todayStatus === 'absent' ? '❌ Absent Today' : '📋 Sessions Marked'}
                        </span>
                    </div>

                    {activeChild.feeInfo?.pending_amount > 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            ⚠️ Fee Payment Due: ₹{activeChild.feeInfo.pending_amount} (Due: {new Date(activeChild.feeInfo.due_date).toLocaleDateString()})
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Quick Actions Grid */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} className="text-brand-primary" /> Parent Quick Portal Actions
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                    {quickActions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => navigate(action.path)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem',
                                background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)',
                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', color: 'var(--text-primary)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = 'var(--brand-primary)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                            }}
                        >
                            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: action.bg }}>
                                {action.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>{action.name}</div>
                                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Access details →</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ParentDashboard = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [childrenSummary, setChildrenSummary] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/parent/student-summary');
                setChildrenSummary(data || []);
                if (data && data.length > 0) {
                    setSelectedChildId(data[0].studentId);
                }
            } catch (err) {
                console.error('Failed to fetch parent dashboard summary', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, []);

    return (
        <div className="app-container" style={{ background: 'var(--bg-primary)' }}>
            <ParentSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="dashboard-main">
                {/* Header Navbar matching Admin Portal */}
                <header className="glass-panel dashboard-header">
                    <div className="flex-row-mobile">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Parent Portal</h1>
                        </div>
                    </div>

                    <div className="dashboard-header-actions">
                        {/* Child Switcher Component */}
                        <ChildSwitcher
                            childrenList={childrenSummary}
                            selectedChildId={selectedChildId}
                            onSelectChild={(id) => setSelectedChildId(id)}
                        />
                        <NotificationDropdown />
                    </div>
                </header>

                <div style={{ flex: 1 }}>
                    <Routes>
                        <Route path="/" element={<ParentSummaryHub childrenSummary={childrenSummary} selectedChildId={selectedChildId} loading={loading} navigate={navigate} />} />
                        <Route path="/attendance" element={<ParentAttendance selectedChildId={selectedChildId} />} />
                        <Route path="/leaves" element={<ParentLeave selectedChildId={selectedChildId} />} />
                        <Route path="/timetable" element={<ParentTimetable selectedChildId={selectedChildId} />} />
                        <Route path="/assignments" element={<ParentAssignments selectedChildId={selectedChildId} />} />
                        <Route path="/results" element={<ParentResults selectedChildId={selectedChildId} />} />
                        <Route path="/fees" element={<ParentFees selectedChildId={selectedChildId} />} />
                        <Route path="/messages" element={<ParentMessages selectedChildId={selectedChildId} />} />
                        <Route path="/profile" element={<ParentProfile />} />
                        <Route path="*" element={<Navigate to="/parent" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default ParentDashboard;
