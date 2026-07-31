import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    LayoutDashboard, Calendar, CalendarOff, BookOpen, Clock, Award, 
    CreditCard, MessageSquare, User, LogOut, X 
} from 'lucide-react';
import ThemeToggle from '../shared/ThemeToggle';

const ParentSidebar = ({ isOpen, setIsOpen }) => {
    const { logout, user } = useAuth();
    const location = useLocation();

    const links = [
        { name: 'Dashboard', path: '/parent', icon: <LayoutDashboard size={20} /> },
        { name: 'Attendance Analytics', path: '/parent/attendance', icon: <Calendar size={20} /> },
        { name: 'Leave Applications', path: '/parent/leaves', icon: <CalendarOff size={20} /> },
        { name: 'Weekly Timetable', path: '/parent/timetable', icon: <Clock size={20} /> },
        { name: 'Homework & Assignments', path: '/parent/assignments', icon: <BookOpen size={20} /> },
        { name: 'Exam Results', path: '/parent/results', icon: <Award size={20} /> },
        { name: 'Fee Details & Receipts', path: '/parent/fees', icon: <CreditCard size={20} /> },
        { name: 'Teacher Messages', path: '/parent/messages', icon: <MessageSquare size={20} /> },
        { name: 'Profile & Settings', path: '/parent/profile', icon: <User size={20} /> },
    ];

    return (
        <>
            <div className={`mobile-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)}></div>
            <div className={`glass-panel sidebar ${isOpen ? 'open' : ''}`}>
                <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>P</div>
                            Parent Portal
                        </h2>
                        <p style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{user?.name}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <ThemeToggle />
                        <button className="sidebar-close-btn" onClick={() => setIsOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', minHeight: 0 }}>
                    {links.map((link) => {
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    textDecoration: 'none',
                                    color: isActive ? 'white' : 'var(--text-secondary)',
                                    background: isActive ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' : 'transparent',
                                    fontWeight: isActive ? '500' : '400',
                                    transition: 'all 0.2s ease',
                                    flexShrink: 0
                                }}
                            >
                                {link.icon}
                                <span style={{ flex: 1, fontSize: '0.875rem' }}>{link.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
                    <button
                        onClick={logout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                            border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                            cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s ease'
                        }}
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </div>
        </>
    );
};

export default ParentSidebar;
