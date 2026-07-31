import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Send, User, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const ParentMessages = ({ selectedChildId }) => {
    const [messages, setMessages] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/parent/messages');
            setMessages(data.messages || []);
            setTeachers(data.teachers || []);
            if (data.teachers && data.teachers.length > 0 && !selectedTeacherId) {
                setSelectedTeacherId(data.teachers[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

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

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading messages...</div>;

    // Filter chat conversation for selected teacher
    const filteredMessages = messages.filter(
        m => String(m.sender_id) === String(selectedTeacherId) || String(m.receiver_id) === String(selectedTeacherId)
    );

    const activeTeacher = teachers.find(t => String(t.id) === String(selectedTeacherId));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <MessageSquare size={28} className="text-brand-primary" /> Teacher Communication & Inbox
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Send direct messages and inquiries to your child's educators and class coordinator.
                    </p>
                </div>

                {/* Teacher Selector Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Talk To:</span>
                    <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--brand-primary)', fontWeight: '800', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                    >
                        {teachers.map(t => (
                            <option key={t.id} value={t.id} style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                👩‍🏫 {t.name} ({t.email})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Conversation Messages View */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: '700', color: 'var(--brand-primary)' }}>
                    💬 Conversation with {activeTeacher?.name || 'Class Teacher'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {filteredMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                            No messages yet with {activeTeacher?.name || 'this teacher'}. Send a message to start the conversation!
                        </div>
                    ) : (
                        filteredMessages.map((msg, idx) => (
                            <motion.div
                                key={msg.id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    padding: '1.25rem', borderRadius: '1rem',
                                    background: msg.sender_name?.includes('Doe') ? 'rgba(59,130,246,0.08)' : 'var(--bg-secondary)',
                                    border: `1px solid ${msg.sender_name?.includes('Doe') ? 'rgba(59,130,246,0.25)' : 'var(--border-color)'}`,
                                    alignSelf: msg.sender_name?.includes('Doe') ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--brand-primary)' }}>{msg.sender_name}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                                        {msg.created_at ? new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                                    </span>
                                </div>
                                <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-line' }}>
                                    {msg.message}
                                </p>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Send Input Form */}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Type your message to ${activeTeacher?.name || 'the teacher'}...`}
                        style={{
                            flex: 1, padding: '0.85rem 1.25rem', borderRadius: '0.75rem',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)', outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="btn btn-primary"
                        style={{ padding: '0.85rem 1.5rem', borderRadius: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Send size={16} /> {sending ? 'Sending...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ParentMessages;
