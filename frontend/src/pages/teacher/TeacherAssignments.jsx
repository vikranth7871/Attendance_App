import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Plus, Calendar, CheckCircle2, Clock, FileText, Send, Edit2, Eye, X, Filter, Save, Award, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- View & Grade Submissions Modal Component ---
const SubmissionsModal = ({ assignment, onClose, onRefreshAssignments }) => {
    const [loading, setLoading] = useState(true);
    const [submissionsData, setSubmissionsData] = useState([]);
    const [editingGradeStudentId, setEditingGradeStudentId] = useState(null);
    const [gradeInput, setGradeInput] = useState('');
    const [commentInput, setCommentInput] = useState('');
    const [savingGrading, setSavingGrading] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/teacher/assignments/${assignment.id}/submissions`);
            setSubmissionsData(data.submissions || []);
        } catch (err) {
            console.error('Failed to fetch submissions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (assignment?.id) fetchSubmissions();
    }, [assignment]);

    const handleSaveGrade = async (studentId) => {
        setSavingGrading(true);
        setFeedback(null);
        try {
            await axios.post(`/teacher/assignments/${assignment.id}/grade`, {
                studentId,
                grade: gradeInput,
                teacherComments: commentInput
            });
            setFeedback({ type: 'success', message: 'Grade saved & student notified!' });
            setEditingGradeStudentId(null);
            await fetchSubmissions();
            if (onRefreshAssignments) onRefreshAssignments();
        } catch (err) {
            setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to save grade.' });
        } finally {
            setSavingGrading(false);
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
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2000, padding: '1.5rem'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                style={{
                    backgroundColor: 'var(--bg-primary)', borderRadius: '1.5rem',
                    width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto',
                    border: '1px solid var(--border-color)', position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.6, color: 'var(--text-primary)' }}>
                    <X size={24} />
                </button>

                <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--brand-secondary)', textTransform: 'uppercase' }}>
                            {assignment.subject_name || 'Subject'} • {assignment.class_name || 'Class'}
                        </span>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        Submissions: {assignment.title}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        Due Date: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>

                    {feedback && (
                        <div style={{
                            padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1.25rem', fontWeight: '700', fontSize: '0.85rem',
                            background: feedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
                            border: `1px solid ${feedback.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                        }}>
                            {feedback.message}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading student submissions...</div>
                    ) : submissionsData.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No students enrolled in this class.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {submissionsData.map((st) => {
                                const isEditingThis = editingGradeStudentId === st.student_id;
                                const isSubmitted = st.status === 'completed' || st.status === 'submitted' || st.status === 'graded';

                                return (
                                    <div
                                        key={st.student_id}
                                        className="glass-panel"
                                        style={{
                                            padding: '1.1rem 1.25rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{st.student_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    Roll No: {st.roll_number || 'N/A'} • Email: {st.email}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '800',
                                                    padding: '0.3rem 0.65rem',
                                                    borderRadius: '0.5rem',
                                                    textTransform: 'uppercase',
                                                    background: st.status === 'graded' ? 'rgba(16,185,129,0.15)' : isSubmitted ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: st.status === 'graded' ? 'var(--success)' : isSubmitted ? 'var(--brand-secondary)' : 'var(--danger)'
                                                }}>
                                                    {st.status === 'graded' ? `Graded (${st.grade})` : isSubmitted ? 'Submitted' : 'Pending'}
                                                </span>

                                                <button
                                                    onClick={() => {
                                                        if (isEditingThis) {
                                                            setEditingGradeStudentId(null);
                                                        } else {
                                                            setEditingGradeStudentId(st.student_id);
                                                            setGradeInput(st.grade || 'A+');
                                                            setCommentInput(st.teacher_comments || '');
                                                        }
                                                    }}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', borderRadius: '0.5rem' }}
                                                >
                                                    {isEditingThis ? 'Cancel' : st.grade ? 'Edit Grade' : 'Grade'}
                                                </button>
                                            </div>
                                        </div>

                                        {st.submission_date && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Submitted on: {new Date(st.submission_date).toLocaleString()}
                                            </div>
                                        )}

                                        {/* Inline Grade Editor */}
                                        {isEditingThis && (
                                            <div style={{
                                                marginTop: '0.5rem',
                                                paddingTop: '0.75rem',
                                                borderTop: '1px solid var(--border-color)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem'
                                            }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Grade / Score</label>
                                                        <input
                                                            type="text"
                                                            value={gradeInput}
                                                            onChange={e => setGradeInput(e.target.value)}
                                                            placeholder="e.g. A+, 95/100"
                                                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Teacher Comments / Feedback</label>
                                                        <input
                                                            type="text"
                                                            value={commentInput}
                                                            onChange={e => setCommentInput(e.target.value)}
                                                            placeholder="Great effort, neat code structure..."
                                                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleSaveGrade(st.student_id)}
                                                        disabled={savingGrading}
                                                        className="btn btn-primary"
                                                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                    >
                                                        <Save size={14} /> {savingGrading ? 'Saving...' : 'Save Grade & Notify'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

const TeacherAssignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null); // Assignment object being edited
    const [submissionsModalAssignment, setSubmissionsModalAssignment] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'pending', 'finished'

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [classId, setClassId] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assignRes, subRes] = await Promise.all([
                axios.get('/teacher/assignments'),
                axios.get('/teacher/subjects')
            ]);
            setAssignments(assignRes.data || []);
            setSubjects(subRes.data || []);
            if (subRes.data && subRes.data.length > 0) {
                setSubjectId(subRes.data[0].subjectId?._id || subRes.data[0].subjectId?.id || 1);
                setClassId(subRes.data[0].classId?._id || subRes.data[0].classId?.id || 1);
            }
        } catch (err) {
            console.error('Failed to fetch teacher assignment data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreateModal = () => {
        setEditingAssignment(null);
        setTitle('');
        setDescription('');
        setDueDate('');
        setAttachmentUrl('');
        setShowModal(true);
    };

    const handleOpenEditModal = (item) => {
        setEditingAssignment(item);
        setTitle(item.title || '');
        setDescription(item.description || '');
        // Format date string for HTML date input (YYYY-MM-DD)
        const formattedDate = item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : '';
        setDueDate(formattedDate);
        setAttachmentUrl(item.attachment_url || '');
        setShowModal(true);
    };

    const handleSaveAssignment = async (e) => {
        e.preventDefault();
        if (!title.trim() || !dueDate) return;
        setSubmitting(true);
        try {
            if (editingAssignment) {
                // Update existing assignment
                await axios.put(`/teacher/assignments/${editingAssignment.id}`, {
                    title,
                    description,
                    dueDate,
                    subjectId,
                    classId,
                    attachmentUrl
                });
            } else {
                // Create new assignment
                await axios.post('/teacher/assignments', {
                    title,
                    description,
                    dueDate,
                    subjectId,
                    classId,
                    attachmentUrl
                });
            }
            setShowModal(false);
            setEditingAssignment(null);
            setTitle('');
            setDescription('');
            setDueDate('');
            setAttachmentUrl('');
            await fetchData();
        } catch (err) {
            console.error('Error saving assignment', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAssignment = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
            return;
        }
        try {
            await axios.delete(`/teacher/assignments/${id}`);
            await fetchData();
        } catch (err) {
            console.error('Error deleting assignment:', err);
            alert(err.response?.data?.message || 'Failed to delete assignment.');
        }
    };

    // Helper to check if assignment is pending (due date >= today)
    const isAssignmentPending = (dueDateStr) => {
        if (!dueDateStr) return true;
        const due = new Date(dueDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return due >= today;
    };

    // Filter assignments
    const filteredAssignments = assignments.filter((item) => {
        const pending = isAssignmentPending(item.due_date);
        if (filterTab === 'pending') return pending;
        if (filterTab === 'finished') return !pending;
        return true; // 'all'
    });

    const pendingCount = assignments.filter(a => isAssignmentPending(a.due_date)).length;
    const finishedCount = assignments.filter(a => !isAssignmentPending(a.due_date)).length;

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Header */}
            <div className="glass-panel animate-fade-in" style={{ padding: '1.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BookOpen size={26} className="text-brand-secondary" /> Homework & Assignment Manager
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                        Create, track, and grade homework assignments. Notifications are sent automatically to students & parents.
                    </p>
                </div>

                <button
                    onClick={handleOpenCreateModal}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.9rem' }}
                >
                    <Plus size={18} /> Assign New Homework
                </button>
            </div>

            {/* Filter Tabs: All, Pending, Finished */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {[
                    { id: 'all', label: 'All Assignments', count: assignments.length },
                    { id: 'pending', label: '⏳ Pending / Active', count: pendingCount },
                    { id: 'finished', label: '✅ Finished / Closed', count: finishedCount }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterTab(tab.id)}
                        className="glass-panel"
                        style={{
                            padding: '0.55rem 1.1rem',
                            borderRadius: '0.75rem',
                            border: '1px solid var(--border-color)',
                            background: filterTab === tab.id ? 'var(--brand-secondary)' : 'rgba(255,255,255,0.02)',
                            color: filterTab === tab.id ? 'white' : 'var(--text-secondary)',
                            fontWeight: filterTab === tab.id ? '800' : '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab.label}
                        <span style={{
                            background: filterTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '800'
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Horizontal Compact List Rows */}
            {filteredAssignments.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <BookOpen size={44} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                    <h3>No {filterTab !== 'all' ? filterTab : ''} assignments found</h3>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
                        {filterTab === 'pending' ? 'No active pending homework for your classes.' : 'Click "Assign New Homework" above to post a new assignment.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {filteredAssignments.map((item) => {
                        const pending = isAssignmentPending(item.due_date);

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-panel"
                                style={{
                                    padding: '1.25rem 1.6rem',
                                    display: 'flex',
                                    justify: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '1.25rem',
                                    borderRadius: '1.1rem',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Left Info Column */}
                                <div style={{ flex: '1 1 320px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--brand-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            📚 {item.subject_name || 'Subject'} • {item.class_name || 'Class'}
                                        </span>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: '800',
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '0.4rem',
                                            textTransform: 'uppercase',
                                            background: pending ? 'rgba(59,130,246,0.15)' : 'rgba(107,114,128,0.15)',
                                            color: pending ? 'var(--brand-secondary)' : 'var(--text-secondary)'
                                        }}>
                                            {pending ? 'Active' : 'Closed'}
                                        </span>
                                    </div>

                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                        {item.title}
                                    </h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: 0, lineHeight: '1.4' }}>
                                        {item.description || 'No detailed instructions provided.'}
                                    </p>
                                </div>

                                {/* Middle Info Column: Due Date & Submission Badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        color: pending ? 'var(--danger)' : 'var(--text-secondary)',
                                        background: 'var(--bg-primary)',
                                        padding: '0.5rem 0.85rem',
                                        borderRadius: '0.6rem',
                                        border: '1px solid var(--border-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem'
                                    }}>
                                        <Calendar size={14} /> Due: {new Date(item.due_date).toLocaleDateString()}
                                    </div>

                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '800',
                                        color: 'var(--brand-primary)',
                                        background: 'rgba(91, 80, 230, 0.1)',
                                        padding: '0.5rem 0.85rem',
                                        borderRadius: '0.6rem',
                                        border: '1px solid rgba(91, 80, 230, 0.2)'
                                    }}>
                                        {item.submission_count || 0} Submissions
                                    </div>
                                </div>

                                {/* Right Action Buttons */}
                                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setSubmissionsModalAssignment(item)}
                                        className="btn btn-primary"
                                        style={{
                                            fontSize: '0.82rem',
                                            fontWeight: '800',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}
                                    >
                                        <Eye size={15} /> View Submissions
                                    </button>

                                    {/* Vertically Stacked Edit & Delete Buttons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        <button
                                            onClick={() => handleOpenEditModal(item)}
                                            className="btn btn-secondary"
                                            style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                padding: '0.3rem 0.7rem',
                                                borderRadius: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justify: 'center',
                                                gap: '0.3rem'
                                            }}
                                        >
                                            <Edit2 size={12} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAssignment(item.id, item.title)}
                                            style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                color: '#ef4444',
                                                background: 'rgba(239, 68, 68, 0.12)',
                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                borderRadius: '0.5rem',
                                                padding: '0.3rem 0.7rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justify: 'center',
                                                gap: '0.3rem',
                                                transition: 'all 0.2s ease'
                                            }}
                                            title="Delete Homework Assignment"
                                        >
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Edit / Create Homework Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2000, padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="glass-panel"
                            style={{ padding: '2rem', maxWidth: '520px', width: '100%', border: '1px solid var(--border-color)', position: 'relative' }}
                        >
                            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.6, color: 'var(--text-primary)' }}>
                                <X size={22} />
                            </button>

                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                                {editingAssignment ? '✏️ Edit Homework Assignment' : '📚 Assign New Homework'}
                            </h3>

                            <form onSubmit={handleSaveAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Python Data Structures Worksheet"
                                        style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.7rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Description & Instructions</label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Detailed instructions for students..."
                                        style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.7rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Due Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.7rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Resource Link (Optional)</label>
                                        <input
                                            type="text"
                                            value={attachmentUrl}
                                            onChange={(e) => setAttachmentUrl(e.target.value)}
                                            placeholder="https://.../worksheet.pdf"
                                            style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.7rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="btn btn-secondary"
                                        style={{ padding: '0.65rem 1.1rem', borderRadius: '0.7rem', fontSize: '0.85rem' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn btn-primary"
                                        style={{ padding: '0.65rem 1.35rem', borderRadius: '0.7rem', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                    >
                                        <Send size={15} /> {submitting ? 'Saving...' : editingAssignment ? 'Update Homework' : 'Assign Homework'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submissions Modal */}
            <AnimatePresence>
                {submissionsModalAssignment && (
                    <SubmissionsModal
                        assignment={submissionsModalAssignment}
                        onClose={() => setSubmissionsModalAssignment(null)}
                        onRefreshAssignments={fetchData}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherAssignments;
