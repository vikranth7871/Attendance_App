import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Send, User, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const TeacherMessages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedKey, setSelectedKey] = useState('');
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/teacher/messages');
            setMessages(data || []);

            // Auto select first conversation key if not selected
            if (data && data.length > 0 && !selectedKey) {
                const first = data[0];
                const pId = first.sender_role === 'parent' ? first.sender_id : first.receiver_id;
                setSelectedKey(`${pId}_${first.student_id || 'all'}`);
            }
        } catch (err) {
            console.error('Failed to fetch parent messages for teacher', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    // Group conversations by Parent ID + Child ID so each child has their own inquiry thread
    const conversationMap = {};
    messages.forEach(m => {
        const parentId = m.sender_role === 'parent' ? m.sender_id : m.receiver_id;
        const parentName = m.sender_role === 'parent' ? m.sender_name : m.receiver_name;
        const studentId = m.student_id || null;
        const convKey = `${parentId}_${studentId || 'all'}`;

        if (!conversationMap[convKey]) {
            conversationMap[convKey] = {
                key: convKey,
                parentId,
                parentName,
                studentId,
                studentName: m.student_name || 'Student',
                messages: []
            };
        }
        conversationMap[convKey].messages.push(m);
        if (m.student_name && conversationMap[convKey].studentName === 'Student') {
            conversationMap[convKey].studentName = m.student_name;
        }
    });

    const conversationList = Object.values(conversationMap);
    const activeConversation = selectedKey
        ? (conversationMap[selectedKey] || conversationList[0])
        : conversationList[0];

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !activeConversation) return;
        setSending(true);
        try {
            await axios.post('/teacher/messages/reply', {
                receiverId: activeConversation.parentId,
                studentId: activeConversation.studentId || null,
                subject: 'Teacher Response',
                message: replyText
            });
            setReplyText('');
            await fetchMessages();
        } catch (err) {
            console.error('Error sending teacher reply', err);
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading parent messages...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <MessageSquare size={28} className="text-brand-secondary" /> Parent Communication & Inbox
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Receive inquiries from parents, view child details, and send direct responses.
                </p>
            </div>

            {/* Main Chat Interface Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', minHeight: '520px' }}>
                {/* Left Sidebar: Parent Conversation List */}
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '0.5rem 0.5rem 0.25rem', letterSpacing: '0.05em' }}>
                        Parent Inquiries
                    </div>

                    {conversationList.length === 0 ? (
                        <div style={{ padding: '2rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            No parent messages received yet.
                        </div>
                    ) : (
                        conversationList.map(c => (
                            <button
                                key={c.key}
                                onClick={() => setSelectedKey(c.key)}
                                style={{
                                    textAlign: 'left', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)',
                                    background: String(selectedKey) === String(c.key) ? 'rgba(139,92,246,0.15)' : 'var(--bg-secondary)',
                                    borderColor: String(selectedKey) === String(c.key) ? 'var(--brand-secondary)' : 'var(--border-color)',
                                    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.2rem', transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.parentName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--brand-secondary)', fontWeight: '600' }}>Child: {c.studentName}</div>
                            </button>
                        ))
                    )}
                </div>

                {/* Right Panel: Chat Thread View & Reply Form */}
                <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {activeConversation ? (
                        <>
                            <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{activeConversation.parentName}</h3>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Parent of: <b>{activeConversation.studentName}</b></span>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '380px', overflowY: 'auto', margin: '1rem 0', paddingRight: '0.5rem' }}>
                                {activeConversation.messages.map((msg, i) => (
                                    <motion.div
                                        key={msg.id || i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            padding: '1.1rem 1.25rem', borderRadius: '0.85rem',
                                            background: msg.sender_role === 'teacher' ? 'rgba(139,92,246,0.1)' : 'var(--bg-secondary)',
                                            border: `1px solid ${msg.sender_role === 'teacher' ? 'rgba(139,92,246,0.25)' : 'var(--border-color)'}`,
                                            alignSelf: msg.sender_role === 'teacher' ? 'flex-end' : 'flex-start',
                                            maxWidth: '85%'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '0.35rem' }}>
                                            <span style={{ fontWeight: '800', fontSize: '0.82rem', color: 'var(--brand-secondary)' }}>{msg.sender_name}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                                                {msg.created_at ? new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                                            </span>
                                        </div>
                                        <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-line' }}>{msg.message}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Reply Input Form */}
                            <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder={`Reply to ${activeConversation.parentName}...`}
                                    style={{
                                        flex: 1, padding: '0.85rem 1.25rem', borderRadius: '0.75rem',
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)', outline: 'none'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !replyText.trim()}
                                    className="btn btn-primary"
                                    style={{ padding: '0.85rem 1.5rem', borderRadius: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Send size={16} /> {sending ? 'Sending...' : 'Send Reply'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                            Select a parent conversation from the left to view messages.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherMessages;
