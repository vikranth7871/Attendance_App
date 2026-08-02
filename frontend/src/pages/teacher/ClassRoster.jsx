import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Users, GraduationCap, Search, Mail, User, BookOpen, Lock, X, Activity, Award, Calendar, BarChart2, Flame, Edit2, Save, ArrowUpDown } from 'lucide-react';

const StudentProfileModal = ({ studentId, initialEdit = false, onClose, onUpdateSuccess }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(initialEdit);
    const [editName, setEditName] = useState('');
    const [editRollNumber, setEditRollNumber] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/teacher/student/${studentId}/profile`);
            setData(data);
            if (data?.student) {
                setEditName(data.student.name || '');
                setEditRollNumber(data.student.rollNumber || '');
                setEditEmail(data.student.email || '');
            }
        } catch (error) {
            console.error("Failed to fetch student profile", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [studentId]);

    const handleSaveStudentDetails = async (e) => {
        e.preventDefault();
        if (!editName.trim() || !editEmail.trim()) {
            setFeedback({ type: 'error', message: 'Student Name and Email are required.' });
            return;
        }

        setSaving(true);
        setFeedback(null);
        try {
            await axios.put(`/teacher/student/${studentId}/update`, {
                name: editName,
                rollNumber: editRollNumber,
                email: editEmail
            });
            setFeedback({ type: 'success', message: 'Student details updated successfully!' });
            setIsEditing(false);
            await fetchProfile();
            if (onUpdateSuccess) onUpdateSuccess();
        } catch (error) {
            setFeedback({ type: 'error', message: error.response?.data?.message || 'Failed to update student profile.' });
        } finally {
            setSaving(false);
        }
    };

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
                    width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto',
                    border: '1px solid var(--border-color)', position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.6, color: 'var(--text-primary)' }}>
                    <X size={24} />
                </button>

                {loading ? (
                    <div style={{ padding: '6rem', textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto 1.5rem' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Aggregating student records...</p>
                    </div>
                ) : data && (
                    <div style={{ padding: '2.5rem' }}>
                        {/* Header & Toggle Edit */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '1.5rem', background: 'linear-gradient(45deg, var(--brand-primary), var(--brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <User size={40} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{data.student.name}</h2>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <GraduationCap size={16} />
                                        {[
                                            data.student.departmentId?.departmentName,
                                            data.student.classId?.className
                                        ].filter(Boolean).join(' • ') || 'No department assigned'}
                                        {data.student.rollNumber ? ` • Roll No: ${data.student.rollNumber}` : ''}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={isEditing ? "btn btn-secondary" : "btn btn-primary"}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: '0.75rem', fontWeight: '700' }}
                            >
                                <Edit2 size={16} /> {isEditing ? 'Cancel Editing' : 'Edit Details'}
                            </button>
                        </div>

                        {feedback && (
                            <div style={{
                                padding: '0.85rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: '700', fontSize: '0.9rem',
                                background: feedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
                                border: `1px solid ${feedback.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                            }}>
                                {feedback.message}
                            </div>
                        )}

                        {/* Editable Form Mode */}
                        {isEditing && (
                            <form onSubmit={handleSaveStudentDetails} className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                    ✏️ Edit Student Information
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Full Student Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem', outline: 'none' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Roll Number / Reg No</label>
                                        <input
                                            type="text"
                                            value={editRollNumber}
                                            onChange={e => setEditRollNumber(e.target.value)}
                                            placeholder="e.g. CS2026001"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Quick Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
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
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                            <BarChart2 size={20} className="text-brand-primary" /> Subject-wise Performance
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.stats.subjectWise.map(sub => (
                                <div key={sub.subjectName} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{sub.subjectName}</span>
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
    const [sortOption, setSortOption] = useState('default'); // 'default', 'att_desc', 'att_asc', 'name_asc', 'roll_asc'
    const [profileModalState, setProfileModalState] = useState(null); // { studentId, isEdit }

    const fetchRoster = async () => {
        try {
            const { data } = await axios.get('/teacher/roster');
            setRosterData(data);
            if (data.subjectRoster.length > 0 && !selectedSession) setSelectedSession(data.subjectRoster[0]);
            if (data.coordinatedRoster) setActiveTab('coordinated');
        } catch (error) {
            console.error("Failed to fetch roster", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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

    const sortedStudents = [...filteredStudents].sort((a, b) => {
        const attA = parseFloat(a.attendancePercentage || 0);
        const attB = parseFloat(b.attendancePercentage || 0);

        if (sortOption === 'att_desc') return attB - attA;
        if (sortOption === 'att_asc') return attA - attB;
        if (sortOption === 'name_asc') return (a.name || '').localeCompare(b.name || '');
        if (sortOption === 'roll_asc') return (a.rollNumber || '').localeCompare(b.rollNumber || '');
        return 0;
    });

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

            {/* Dropdown Selector for Subject Roster */}
            {activeTab === 'subject' && rosterData.subjectRoster.length > 0 && (
                <div className="glass-panel animate-fade-in" style={{ padding: '1rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BookOpen size={20} className="text-brand-primary" />
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Select Subject & Class:
                        </span>
                    </div>

                    <select
                        value={selectedSession?.allocationId || ''}
                        onChange={(e) => {
                            const found = rosterData.subjectRoster.find(s => String(s.allocationId) === String(e.target.value));
                            if (found) setSelectedSession(found);
                        }}
                        style={{
                            padding: '0.75rem 1.25rem',
                            borderRadius: '0.75rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--brand-primary)',
                            fontWeight: '800',
                            fontSize: '0.95rem',
                            outline: 'none',
                            cursor: 'pointer',
                            minWidth: '320px',
                            maxWidth: '100%'
                        }}
                    >
                        {rosterData.subjectRoster.map((session) => (
                            <option
                                key={session.allocationId}
                                value={session.allocationId}
                                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: '600' }}
                            >
                                📚 {session.class?.className} — {session.subject?.subjectName} {session.scheduleBadge ? `(${session.scheduleBadge})` : ''}
                            </option>
                        ))}
                    </select>
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
                                ? 'Complete roster for your coordinated class. Click Edit to update student details.'
                                : selectedSession?.scheduleBadge ? `${selectedSession.scheduleBadge} • ${currentStudents.length} Students Enrolled` : `List updated for the current ${selectedSession?.subject?.subjectName} schedule.`
                            }
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Attendance & Column Sort Control */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.6rem 0.95rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                            <ArrowUpDown size={15} color="var(--brand-primary)" />
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sort:</span>
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--brand-primary)', fontWeight: '800', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="default" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Default Order</option>
                                <option value="att_desc" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Attendance: High → Low (100% to 0%)</option>
                                <option value="att_asc" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Attendance: Low → High (0% to 100%)</option>
                                <option value="name_asc" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Student Name (A → Z)</option>
                                <option value="roll_asc" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Roll Number</option>
                            </select>
                        </div>

                        {/* Search Bar */}
                        <div style={{ position: 'relative', width: '260px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                            <input
                                type="text" placeholder="Search name, roll, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field"
                                style={{ padding: '0.6rem 0.9rem 0.6rem 2.6rem', fontSize: '0.85rem', borderRadius: '0.75rem' }}
                            />
                        </div>
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
                                <th
                                    onClick={() => {
                                        if (sortOption === 'att_desc') setSortOption('att_asc');
                                        else setSortOption('att_desc');
                                    }}
                                    style={{ padding: '0.75rem 1.25rem', fontWeight: '800', cursor: 'pointer', userSelect: 'none' }}
                                    title="Click to toggle Attendance % sorting (Ascending / Descending)"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: sortOption.startsWith('att_') ? 'var(--brand-primary)' : 'inherit' }}>
                                        Attendance %
                                        {sortOption === 'att_desc' && <span>▼</span>}
                                        {sortOption === 'att_asc' && <span>▲</span>}
                                        {!sortOption.startsWith('att_') && <ArrowUpDown size={13} style={{ opacity: 0.5 }} />}
                                    </div>
                                </th>
                                {activeTab === 'subject' && <th style={{ padding: '0.75rem 1.25rem', fontWeight: '800' }}>Status</th>}
                                {(activeTab === 'coordinated' || user?.role === 'admin') && <th style={{ padding: '0.75rem 1.25rem', fontWeight: '800', textAlign: 'right' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStudents.length > 0 ? sortedStudents.map((student, idx) => (
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
                                            <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => setProfileModalState({ studentId: student._id, isEdit: true })}
                                                    className="btn btn-primary"
                                                    style={{
                                                        fontSize: '0.78rem',
                                                        fontWeight: '800',
                                                        borderRadius: '8px',
                                                        padding: '0.4rem 0.8rem',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    <Edit2 size={13} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => setProfileModalState({ studentId: student._id, isEdit: false })}
                                                    style={{
                                                        fontSize: '0.78rem',
                                                        fontWeight: '800',
                                                        color: 'var(--brand-primary)',
                                                        background: 'rgba(91, 80, 230, 0.1)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        padding: '0.4rem 0.85rem'
                                                    }}
                                                >
                                                    View Profile
                                                </button>
                                            </div>
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
                {profileModalState && (
                    <StudentProfileModal
                        studentId={profileModalState.studentId}
                        initialEdit={profileModalState.isEdit}
                        onClose={() => setProfileModalState(null)}
                        onUpdateSuccess={fetchRoster}
                    />
                )}
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
