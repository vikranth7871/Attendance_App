import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, CheckCircle2, Clock, FileText, Send, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentAssignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submittingId, setSubmittingId] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed'

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/student/assignments');
            setAssignments(data || []);
        } catch (err) {
            console.error('Failed to fetch student assignments', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    const handleSubmit = async (assignmentId) => {
        setSubmittingId(assignmentId);
        try {
            await axios.post(`/student/assignments/${assignmentId}/submit`);
            await fetchAssignments();
        } catch (err) {
            console.error('Error submitting assignment', err);
        } finally {
            setSubmittingId(null);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading assignments...</div>;

    const filtered = assignments.filter(a => filter === 'all' || a.status === filter);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BookOpen size={28} className="text-brand-primary" /> My Homework & Assignments
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        View assigned homework, due dates, submission status, and teacher comments.
                    </p>
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.35rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    {['all', 'pending', 'completed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '0.45rem 1rem', borderRadius: '0.5rem', border: 'none',
                                background: filter === f ? 'var(--brand-primary)' : 'transparent',
                                color: filter === f ? 'white' : 'var(--text-secondary)',
                                fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize'
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Assignments Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {filtered.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3>No Assignments Found</h3>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>You have no {filter} assignments at this time.</p>
                    </div>
                ) : (
                    filtered.map((item, idx) => (
                        <motion.div
                            key={item.id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel"
                            style={{ padding: '1.75rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {item.subject_name} • Faculty: {item.teacher_name || 'Subject Educator'}
                                    </span>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{item.title}</h3>
                                </div>
                                <span style={{
                                    padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase',
                                    background: item.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: item.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                                }}>
                                    {item.status === 'completed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                    {item.status}
                                </span>
                            </div>

                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                                {item.description}
                            </p>

                            {/* Footer & Submit Action */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '700' }}>
                                    📅 Due Date: {item.due_date ? new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Next Week'}
                                </div>

                                {item.teacher_comments && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--brand-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontStyle: 'italic' }}>
                                        <MessageSquare size={14} /> Teacher Feedback: "{item.teacher_comments}" {item.grade && `[Grade: ${item.grade}]`}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    {item.attachment_url && (
                                        <a
                                            href={item.attachment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                        >
                                            <FileText size={14} /> Resource Link
                                        </a>
                                    )}

                                    {item.status !== 'completed' && (
                                        <button
                                            onClick={() => handleSubmit(item.id)}
                                            disabled={submittingId === item.id}
                                            className="btn btn-primary"
                                            style={{ padding: '0.5rem 1.1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                        >
                                            <Send size={14} /> {submittingId === item.id ? 'Submitting...' : 'Mark Completed'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StudentAssignments;
