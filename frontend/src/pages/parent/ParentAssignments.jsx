import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, CheckCircle, Clock, Download, MessageSquare, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const ParentAssignments = ({ selectedChildId }) => {
    const [assignmentsData, setAssignmentsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed'

    useEffect(() => {
        const fetchAssignments = async () => {
            setLoading(true);
            try {
                const url = selectedChildId ? `/parent/student-assignments?studentId=${selectedChildId}` : '/parent/student-assignments';
                const { data } = await axios.get(url);
                setAssignmentsData(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssignments();
    }, [selectedChildId]);

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading homework & assignments...</div>;

    const assignments = assignmentsData?.assignments || [];
    const student = assignmentsData?.student || {};

    const filtered = assignments.filter(a => filter === 'all' || a.status === filter);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BookOpen size={28} className="text-brand-primary" /> Homework & Assignments
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Track subject assignments, submission status, and teacher feedback for {student.name}.
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
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No assignments found under filter: {filter}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {item.subject_name} • {item.teacher_name || 'Subject Teacher'}
                                    </span>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{item.title}</h3>
                                </div>
                                <span style={{
                                    padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase',
                                    background: item.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: item.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                                }}>
                                    {item.status === 'completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                    {item.status}
                                </span>
                            </div>

                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                                {item.description}
                            </p>

                            {/* Due Date & Attachments Bar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '700' }}>
                                    📅 Due Date: {item.due_date ? new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Next Week'}
                                </div>

                                {item.teacher_comments && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--brand-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontStyle: 'italic' }}>
                                        <MessageSquare size={14} /> Teacher Feedback: "{item.teacher_comments}" {item.grade && `[Grade: ${item.grade}]`}
                                    </div>
                                )}

                                {item.attachment_url && (
                                    <a
                                        href={item.attachment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                    >
                                        <FileText size={14} /> Attachment Resource
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ParentAssignments;
