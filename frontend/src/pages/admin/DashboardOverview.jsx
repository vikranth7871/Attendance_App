import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Users,
    UserCheck,
    School,
    BookOpen,
    TrendingUp,
    AlertCircle,
    Clock,
    ChevronRight,
    Activity,
    ShieldCheck,
    X,
    Filter
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, delay, onClick }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        onClick={onClick}
        className="glass-panel"
        style={{
            padding: '1.5rem',
            flex: 1,
            minWidth: '200px',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.2s'
        }}
        whileHover={onClick ? { scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' } : {}}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>{title}</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--text-primary)' }}>{value}</h3>
            </div>
            <div style={{
                padding: '0.75rem',
                borderRadius: '12px',
                background: `${color}15`,
                color: color
            }}>
                <Icon size={24} />
            </div>
        </div>
    </motion.div>
);

const DashboardOverview = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('students'); // 'students' or 'teachers'
    const [showLogModal, setShowLogModal] = useState(false);
    const [logFilter, setLogFilter] = useState('all');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await axios.get('/admin/dashboard-stats');
                setStats(data);
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-secondary)' }}>
                <Activity className="animate-spin" style={{ marginRight: '0.5rem' }} /> Loading system overview...
            </div>
        );
    }

    if (!stats) return <div className="glass-panel">Error loading statistics.</div>;

    const { counts, todayAttendance, teacherAttendance, trend, teacherTrend, recentActivities } = stats;

    const activeData = activeTab === 'students' ? todayAttendance : teacherAttendance;
    const activeTrend = activeTab === 'students' ? trend : teacherTrend;

    const attendanceRate = activeData.total > 0
        ? ((activeData.present / activeData.total) * 100).toFixed(1)
        : 0;

    const maxTeacherScore = Math.max(...(stats.teacherPerformance?.map(tp => tp.markingCount) || [100]), 50);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Dashboard Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>System Overview</h2>
            </div>

            {/* Top Stat Cards */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <StatCard
                    title="Total Students"
                    value={counts.students}
                    icon={Users}
                    color="#3b82f6"
                    delay={0.1}
                    onClick={() => navigate('/admin/users')}
                />
                <StatCard
                    title="Faculty Members"
                    value={counts.teachers}
                    icon={UserCheck}
                    color="#ec4899"
                    delay={0.2}
                    onClick={() => navigate('/admin/users')}
                />
                <StatCard
                    title="Active Classes"
                    value={counts.classes}
                    icon={School}
                    color="#10b981"
                    delay={0.3}
                    onClick={() => navigate('/admin/academic')}
                />
                <StatCard
                    title="Total Subjects"
                    value={counts.subjects}
                    icon={BookOpen}
                    color="#f59e0b"
                    delay={0.4}
                    onClick={() => navigate('/admin/subjects')}
                />
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Today's Attendance Snapshot (Dual View) */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-panel"
                    style={{ flex: 1, minWidth: '280px', padding: '1.5rem' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={20} className="text-brand" /> Today's Attendance Snapshot
                        </h3>
                        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '10px', gap: '0.2rem', position: 'relative' }}>
                            {[
                                { id: 'students', label: 'Students' },
                                { id: 'teachers', label: 'Teachers' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        position: 'relative',
                                        zIndex: 1,
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: 'transparent',
                                        color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: activeTab === tab.id ? '700' : '600',
                                        transition: 'color 0.2s'
                                    }}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="dashboardTab"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                                borderRadius: 8,
                                                zIndex: -1,
                                                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                                            }}
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {(() => {
                        const total = Math.max(activeData.total || 0, (activeData.present || 0) + (activeData.absent || 0) + (activeData.leave || 0), 1);
                        const pctPresent = ((activeData.present / total) * 100);
                        const pctAbsent = ((activeData.absent / total) * 100);
                        const pctLeave = ((activeData.leave / total) * 100);

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                                {/* 1. Centered 3-Color Donut Chart at Top */}
                                <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0.5rem 0' }}>
                                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                        {/* Background Ring */}
                                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--border-color)" strokeWidth="3.5" />

                                        {/* Present Segment (Green) */}
                                        {pctPresent > 0 && (
                                            <motion.circle
                                                cx="18" cy="18" r="15.9155" fill="none"
                                                stroke="#10b981" strokeWidth="3.5"
                                                pathLength="100"
                                                initial={{ strokeDasharray: "0 100", strokeDashoffset: 0 }}
                                                animate={{ strokeDasharray: `${pctPresent} ${100 - pctPresent}`, strokeDashoffset: 0 }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                            />
                                        )}

                                        {/* Absent Segment (Red) */}
                                        {pctAbsent > 0 && (
                                            <motion.circle
                                                cx="18" cy="18" r="15.9155" fill="none"
                                                stroke="#ef4444" strokeWidth="3.5"
                                                pathLength="100"
                                                initial={{ strokeDasharray: "0 100", strokeDashoffset: -pctPresent }}
                                                animate={{ strokeDasharray: `${pctAbsent} ${100 - pctAbsent}`, strokeDashoffset: -pctPresent }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                            />
                                        )}

                                        {/* On Leave Segment (Amber) */}
                                        {pctLeave > 0 && (
                                            <motion.circle
                                                cx="18" cy="18" r="15.9155" fill="none"
                                                stroke="#f59e0b" strokeWidth="3.5"
                                                pathLength="100"
                                                initial={{ strokeDasharray: "0 100", strokeDashoffset: -(pctPresent + pctAbsent) }}
                                                animate={{ strokeDasharray: `${pctLeave} ${100 - pctLeave}`, strokeDashoffset: -(pctPresent + pctAbsent) }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                            />
                                        )}
                                    </svg>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                        <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', display: 'block', lineHeight: 1 }}>{pctPresent.toFixed(1)}%</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px', display: 'block' }}>Turnout</span>
                                    </div>
                                </div>

                                {/* 2. Attendance Status Stats Cards Below (Full Width 3-Column Grid) */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', width: '100%' }}>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#10b981', textTransform: 'uppercase' }}>Present</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981', marginTop: '0.2rem' }}>{activeData.present}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{pctPresent.toFixed(0)}%</div>
                                    </div>

                                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase' }}>Absent</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ef4444', marginTop: '0.2rem' }}>{activeData.absent}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{pctAbsent.toFixed(0)}%</div>
                                    </div>

                                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.75rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase' }}>On Leave</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f59e0b', marginTop: '0.2rem' }}>{activeData.leave || 0}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{pctLeave.toFixed(0)}%</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                </motion.div>

                {/* Teacher Performance & Metrics Section (Top Right beside Snapshot) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="glass-panel"
                    style={{ flex: 1.5, minWidth: '280px', padding: '1.5rem' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={20} className="text-brand" /> Teacher Activity Overview
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--brand-primary)', fontWeight: '700', background: 'rgba(91,80,230,0.08)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                            Top Performers
                        </span>
                    </div>

                    {(() => {
                        const teachers = stats.teacherPerformance || [];
                        if (teachers.length === 0) {
                            return (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No performance data available yet.
                                </div>
                            );
                        }

                        const top1 = teachers[0];
                        const restTeachers = teachers.slice(1, 5);

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* 1. Full-Width #1 Rank Hero Teacher Card */}
                                {top1 && (
                                    <div style={{
                                        padding: '1.1rem 1.25rem',
                                        background: 'linear-gradient(135deg, rgba(91, 80, 230, 0.08), rgba(99, 102, 241, 0.04))',
                                        borderRadius: '16px',
                                        border: '1.5px solid rgba(91, 80, 230, 0.25)',
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        boxShadow: '0 4px 15px rgba(91, 80, 230, 0.06)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: '46px',
                                                    height: '46px',
                                                    borderRadius: '14px',
                                                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                    fontWeight: '800',
                                                    flexShrink: 0
                                                }}>
                                                    {top1.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--text-primary)' }}>{top1.name}</h4>
                                                        {top1.department && (
                                                            <span style={{ fontSize: '0.68rem', background: 'rgba(91, 80, 230, 0.12)', color: 'var(--brand-primary)', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                                                                {top1.department}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{top1.email}</p>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{
                                                    background: '#f59e0b',
                                                    color: 'white',
                                                    padding: '0.25rem 0.65rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '800',
                                                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                                                }}>
                                                    #1 Rank
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ height: '7px', background: 'var(--border-color)', borderRadius: '4px', flex: 1, overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${Math.min((top1.markingCount / maxTeacherScore) * 100, 100)}%`,
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, var(--brand-primary), #ec4899)',
                                                    borderRadius: '4px'
                                                }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--brand-primary)' }}>{top1.markingCount} marks</span>
                                        </div>
                                    </div>
                                )}

                                {/* 2. Grid of Remaining Top Performers (#2 - #5) */}
                                {restTeachers.length > 0 && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                                        {restTeachers.map((tp, idx) => (
                                            <div key={tp._id} style={{
                                                padding: '0.85rem 1rem',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '14px',
                                                border: '1px solid var(--border-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem'
                                            }}>
                                                <div style={{
                                                    width: '38px',
                                                    height: '38px',
                                                    borderRadius: '10px',
                                                    background: 'var(--brand-primary)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1rem',
                                                    fontWeight: 'bold',
                                                    flexShrink: 0
                                                }}>
                                                    {tp.name.charAt(0)}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.25rem' }}>
                                                        <div style={{ minWidth: 0 }}>
                                                            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tp.name}</h4>
                                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tp.email}</p>
                                                        </div>
                                                    </div>
                                                    <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ height: '5px', background: 'var(--border-color)', borderRadius: '3px', flex: 1, marginRight: '0.5rem', overflow: 'hidden' }}>
                                                            <div style={{
                                                                width: `${Math.min((tp.markingCount / maxTeacherScore) * 100, 100)}%`,
                                                                height: '100%',
                                                                background: 'linear-gradient(90deg, var(--brand-primary), #ec4899)',
                                                                borderRadius: '3px'
                                                            }}></div>
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{tp.markingCount} marks</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </motion.div>
            </div>

            {/* Recent Activities Section (Full Width Bottom) */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="glass-panel"
                    style={{ flex: 1, minWidth: '280px', padding: '1.5rem' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={20} className="text-brand" /> Recent System Logs
                        </h3>
                        <button
                            className="text-brand"
                            onClick={() => setShowLogModal(true)}
                            style={{
                                background: 'rgba(91, 80, 230, 0.08)',
                                border: '1px solid rgba(91, 80, 230, 0.2)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                padding: '0.4rem 0.85rem',
                                borderRadius: '8px',
                                color: 'var(--brand-primary)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                            }}
                        >
                            View All Logs <ChevronRight size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                        {recentActivities.length > 0 ? recentActivities.slice(0, 6).map((activity) => {
                            const isPresent = activity.status === 'present' || activity.status === 'approved';
                            const isAbsent = activity.status === 'absent' || activity.status === 'rejected';
                            const isLeave = activity.status === 'leave' || activity.type === 'leave';

                            const statusColor = isPresent ? '#10b981' : isAbsent ? '#ef4444' : '#f59e0b';

                            return (
                                <div
                                    key={activity._id}
                                    onClick={() => setShowLogModal(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.85rem 1rem',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '12px',
                                        borderLeft: `4px solid ${statusColor}`,
                                        border: '1px solid var(--border-color)',
                                        borderLeftWidth: '4px',
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s ease, boxShadow 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ minWidth: '36px', height: '36px', borderRadius: '50%', background: `${statusColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldCheck size={18} color={statusColor} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '0.875rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {activity.studentId?.name} <span style={{ opacity: 0.6, fontWeight: '500' }}>— {activity.subjectId?.subjectName}</span>
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', margin: '3px 0 0 0' }}>
                                            Status: <span style={{ textTransform: 'uppercase', fontWeight: '800', color: statusColor }}>{activity.status}</span>
                                            <span>•</span>
                                            <span>{new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {activity.studentId?.departmentId?.departmentName && (
                                                <span style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.05rem 0.4rem', fontWeight: '700', color: 'var(--brand-primary)', fontSize: '0.68rem' }}>
                                                    {activity.studentId.departmentId.departmentName}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <ChevronRight size={16} color="var(--text-light)" />
                                </div>
                            );
                        }) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No recent activities found.</div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* System Logs Modal Dialog */}
            {showLogModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 999,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel"
                        style={{
                            width: '100%',
                            maxWidth: '750px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '1.75rem',
                            borderRadius: '1.25rem',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                    <Clock size={20} className="text-brand" /> System Audit Logs & Activity Trail
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Real-time audit log of all student attendance, faculty marking, and leave events
                                </p>
                            </div>
                            <button
                                onClick={() => setShowLogModal(false)}
                                style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                            {[
                                { id: 'all', label: 'All Logs' },
                                { id: 'attendance', label: 'Student Attendance' },
                                { id: 'faculty', label: 'Faculty Attendance' },
                                { id: 'leave', label: 'Leave Requests' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setLogFilter(tab.id)}
                                    style={{
                                        padding: '0.45rem 0.85rem',
                                        borderRadius: '8px',
                                        border: logFilter === tab.id ? 'none' : '1px solid var(--border-color)',
                                        background: logFilter === tab.id ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                                        color: logFilter === tab.id ? 'white' : 'var(--text-secondary)',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Activity List */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.25rem' }}>
                            {recentActivities
                                .filter(act => logFilter === 'all' || act.type === logFilter)
                                .map((activity) => {
                                    const isPresent = activity.status === 'present' || activity.status === 'approved';
                                    const isAbsent = activity.status === 'absent' || activity.status === 'rejected';
                                    const statusColor = isPresent ? '#10b981' : isAbsent ? '#ef4444' : '#f59e0b';

                                    return (
                                        <div
                                            key={activity._id}
                                            style={{
                                                padding: '0.85rem 1rem',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '10px',
                                                borderLeft: `4px solid ${statusColor}`,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '1rem'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                    {activity.studentId?.name}
                                                    <span style={{ fontWeight: '500', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                                                        ({activity.subjectId?.subjectName})
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span>{new Date(activity.createdAt).toLocaleString()}</span>
                                                    <span>•</span>
                                                    <span style={{ fontWeight: '700', color: 'var(--brand-primary)', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                                        {activity.studentId?.departmentId?.departmentName || 'SYSTEM'}
                                                    </span>
                                                </div>
                                            </div>

                                            <span style={{
                                                padding: '0.3rem 0.75rem',
                                                borderRadius: '6px',
                                                background: `${statusColor}18`,
                                                color: statusColor,
                                                fontWeight: '800',
                                                fontSize: '0.72rem',
                                                textTransform: 'uppercase',
                                                border: `1px solid ${statusColor}30`
                                            }}>
                                                {activity.status}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default DashboardOverview;
