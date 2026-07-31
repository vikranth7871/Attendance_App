import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Plus, Calendar, CheckCircle2, Clock, FileText, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TeacherAssignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        if (!title.trim() || !dueDate) return;
        setSubmitting(true);
        try {
            await axios.post('/teacher/assignments', {
                title,
                description,
                dueDate,
                subjectId,
                classId,
                attachmentUrl
            });
            setShowModal(false);
            setTitle('');
            setDescription('');
            setDueDate('');
            setAttachmentUrl('');
            await fetchData();
        } catch (err) {
            console.error('Error creating assignment', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading homework assignments...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BookOpen size={28} className="text-brand-secondary" /> Homework & Assignment Manager
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Create homework assignments for your classes. Notifications are automatically sent to students & parents.
                    </p>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: '700' }}
                >
                    <Plus size={18} /> Assign New Homework
                </button>
            </div>

            {/* Assignments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {assignments.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3>No Assignments Created Yet</h3>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Click "Assign New Homework" above to create an assignment for your students.</p>
                    </div>
                ) : (
                    assignments.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel"
                            style={{ padding: '1.75rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--brand-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {item.subject_name || 'Subject'} • {item.class_name || 'Class VIII-A'}
                                    </span>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{item.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                        {item.description}
                                    </p>
                                </div>
                                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--brand-primary)' }}>{item.submission_count || 0}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: '700' }}>Submissions</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '700' }}>
                                    📅 Due Date: {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>

                                {item.attachment_url && (
                                    <a
                                        href={item.attachment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '0.8rem', color: 'var(--brand-secondary)', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                    >
                                        <FileText size={14} /> Attachment Resource
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Create Assignment Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2000, padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="glass-panel"
                            style={{ padding: '2rem', maxWidth: '540px', width: '100%', border: '1px solid var(--border-color)' }}
                        >
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                                Assign New Homework / Assignment
                            </h3>

                            <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Python Data Structures Worksheet"
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Description & Instructions</label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Detailed instructions for students..."
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Due Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Attachment Link (Optional)</label>
                                        <input
                                            type="text"
                                            value={attachmentUrl}
                                            onChange={(e) => setAttachmentUrl(e.target.value)}
                                            placeholder="/uploads/worksheet.pdf"
                                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="btn btn-secondary"
                                        style={{ padding: '0.75rem 1.25rem', borderRadius: '0.75rem' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn btn-primary"
                                        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Send size={16} /> {submitting ? 'Assigning...' : 'Assign Homework'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherAssignments;
