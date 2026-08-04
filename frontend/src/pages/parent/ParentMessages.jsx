import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Send, BookOpen, ChevronDown, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ParentMessages = ({ selectedChildId }) => {
    const [messages, setMessages] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [parentId, setParentId] = useState(null);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const url = selectedChildId
                ? `/parent/messages?studentId=${selectedChildId}`
                : '/parent/messages';
            const { data } = await axios.get(url);
            setMessages(data.messages || []);
            const fetchedTeachers = data.teachers || [];
            setTeachers(fetchedTeachers);
            // Auto-select first teacher if none selected or previous selection not in list
            if (fetchedTeachers.length > 0) {
                const stillValid = fetchedTeachers.find(t => String(t.id) === String(selectedTeacherId));
                const autoTeacherId = stillValid ? String(selectedTeacherId) : String(fetchedTeachers[0].id);
                if (!stillValid) {
                    setSelectedTeacherId(autoTeacherId);
                    // Auto-mark first teacher's messages as read
                    axios.put(`/parent/messages/read/${autoTeacherId}`).catch(() => {});
                }
            }
            // Determine parent's own id from messages
            if (data.messages && data.messages.length > 0) {
                const ownMsg = data.messages.find(m =>
                    fetchedTeachers.every(t => String(t.id) !== String(m.sender_id))
                );
                if (ownMsg) setParentId(ownMsg.sender_id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [selectedChildId]);

    const handleSelectTeacher = async (teacherId) => {
        const id = String(teacherId);
        setSelectedTeacherId(id);

        // Optimistically clear unread badge in local state
        setMessages(prev => prev.map(m =>
            String(m.sender_id) === id ? { ...m, is_read: true } : m
        ));

        // Persist read status on backend
        try {
            await axios.put(`/parent/messages/read/${id}`);
        } catch (err) {
            console.error('Failed to mark messages as read:', err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTeacherId) return;
        setSending(true);
        try {
            await axios.post('/parent/messages', {
                receiverId: selectedTeacherId,
                studentId: selectedChildId,
                subject: 'Parent Inquiry',
                message: newMessage
            });
            setNewMessage('');
            await fetchMessages();
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };


    if (loading) return (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading messages...
        </div>
    );

    // Filter chat for the selected teacher
    const filteredMessages = messages.filter(
        m => String(m.sender_id) === String(selectedTeacherId) || String(m.receiver_id) === String(selectedTeacherId)
    );

    const activeTeacher = teachers.find(t => String(t.id) === String(selectedTeacherId));

    // Detect own message: sender is not a teacher in our list
    const isOwnMessage = (msg) => {
        const teacherIds = teachers.map(t => String(t.id));
        return !teacherIds.includes(String(msg.sender_id));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                    <MessageSquare size={28} style={{ color: 'var(--brand-primary)' }} /> Teacher Communication
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Send direct messages to your child's subject teachers.
                </p>
            </div>

            {teachers.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <UserCheck size={44} style={{ opacity: 0.15, margin: '0 auto 1rem' }} />
                    <p style={{ fontWeight: '600' }}>No teachers found for your child.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Subject allocations may not have been assigned yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Teacher Cards Row */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {teachers.map(t => {
                            const isActive = String(t.id) === String(selectedTeacherId);
                            const subjectCount = t.subjects ? t.subjects.split(',').length : 0;
                            const unreadCount = messages.filter(
                                m => String(m.sender_id) === String(t.id) && !m.is_read
                            ).length;
                            return (
                                <motion.button
                                    key={t.id}
                                    onClick={() => handleSelectTeacher(t.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '0.35rem',
                                        padding: '0.85rem 1.1rem',
                                        borderRadius: '1rem',
                                        border: `2px solid ${isActive ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                                        background: isActive ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        minWidth: '160px',
                                        maxWidth: '220px',
                                        position: 'relative',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {unreadCount > 0 && (
                                        <span style={{
                                            position: 'absolute', top: '-6px', right: '-6px',
                                            background: '#ef4444', color: '#fff',
                                            borderRadius: '999px', fontSize: '0.65rem',
                                            fontWeight: '800', padding: '0.1rem 0.4rem',
                                            minWidth: '18px', textAlign: 'center'
                                        }}>{unreadCount}</span>
                                    )}
                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: isActive ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                                        {t.name}
                                    </div>
                                    {t.subjects && (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.3rem' }}>
                                            <BookOpen size={11} style={{ color: 'var(--brand-secondary)', marginTop: '2px', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                {t.subjects}
                                            </span>
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-light)' }}>{t.email}</div>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Chat Panel */}
                    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Chat Header */}
                        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)', fontWeight: '800', fontSize: '1rem' }}>
                                {activeTeacher?.name?.[0] || 'T'}
                            </div>
                            <div>
                                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                    {activeTeacher?.name || 'Teacher'}
                                </div>
                                {activeTeacher?.subjects && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--brand-secondary)' }}>
                                        <BookOpen size={11} /> {activeTeacher.subjects}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            <AnimatePresence>
                                {filteredMessages.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                                        <MessageSquare size={36} style={{ opacity: 0.12, margin: '0 auto 0.75rem' }} />
                                        <p>No messages yet with {activeTeacher?.name || 'this teacher'}.</p>
                                        <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Send a message to start the conversation!</p>
                                    </div>
                                ) : (
                                    filteredMessages.map((msg, idx) => {
                                        const own = isOwnMessage(msg);
                                        return (
                                            <motion.div
                                                key={msg.id || idx}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                style={{
                                                    alignSelf: own ? 'flex-end' : 'flex-start',
                                                    maxWidth: '82%',
                                                    padding: '0.85rem 1.1rem',
                                                    borderRadius: own ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
                                                    background: own ? 'rgba(99,102,241,0.12)' : 'var(--bg-secondary)',
                                                    border: `1px solid ${own ? 'rgba(99,102,241,0.25)' : 'var(--border-color)'}`,
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '0.4rem' }}>
                                                    <span style={{ fontWeight: '800', fontSize: '0.78rem', color: own ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
                                                        {msg.sender_name}
                                                    </span>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                                                        {msg.created_at ? new Date(msg.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                                                    </span>
                                                </div>
                                                <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem', margin: 0, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                                                    {msg.message}
                                                </p>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Send Form */}
                        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={`Message ${activeTeacher?.name || 'teacher'}...`}
                                style={{ flex: 1, padding: '0.85rem 1.1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
                            />
                            <button
                                type="submit"
                                disabled={sending || !newMessage.trim()}
                                className="btn btn-primary"
                                style={{ padding: '0.85rem 1.4rem', borderRadius: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: sending || !newMessage.trim() ? 0.6 : 1 }}
                            >
                                <Send size={16} /> {sending ? 'Sending...' : 'Send'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentMessages;
