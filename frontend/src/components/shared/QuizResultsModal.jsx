import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Medal, Clock, Award, Download, CheckCircle, Search } from 'lucide-react';
import axios from 'axios';

const QuizResultsModal = ({ isOpen, onClose, quiz }) => {
    const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' or 'certificates'
    const [leaderboard, setLeaderboard] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen && quiz) {
            fetchResults();
        }
    }, [isOpen, quiz]);

    const fetchResults = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch Leaderboard
            const { data: ldData } = await axios.get(`/quiz/${quiz._id}/leaderboard`);
            setLeaderboard(ldData.leaderboard || []);

            // Fetch Certificates
            const { data: certData } = await axios.get(`/quiz/${quiz._id}/certificates`);
            setCertificates(certData || []);
        } catch (err) {
            console.error('Error fetching results:', err);
            setError(err.response?.data?.message || 'Failed to load results.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const filteredCertificates = certificates.filter(cert => 
        cert.studentId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.studentId?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.certificateId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 3000,
                        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.4)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                    Quiz Results: {quiz?.title}
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                                    {quiz?.type === 'university' ? 'University Assessment' : 'Practice Quiz'}
                                </p>
                            </div>
                            <button onClick={onClose} style={{
                                background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
                            }}><X size={20} /></button>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                            <button
                                onClick={() => setActiveTab('leaderboard')}
                                style={{
                                    flex: 1, padding: '1rem', background: 'transparent', border: 'none', cursor: 'pointer',
                                    fontWeight: '600', color: activeTab === 'leaderboard' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                    borderBottom: activeTab === 'leaderboard' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s'
                                }}
                            >
                                <Trophy size={18} /> Leaderboard
                            </button>
                            <button
                                onClick={() => setActiveTab('certificates')}
                                style={{
                                    flex: 1, padding: '1rem', background: 'transparent', border: 'none', cursor: 'pointer',
                                    fontWeight: '600', color: activeTab === 'certificates' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                    borderBottom: activeTab === 'certificates' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s'
                                }}
                            >
                                <Award size={18} /> Issued Certificates ({certificates.length})
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: 'var(--bg-secondary)' }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                                    <div className="loader" style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                </div>
                            ) : error ? (
                                <div style={{ padding: '1rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: '8px', textAlign: 'center' }}>
                                    {error}
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'leaderboard' && (
                                        <div>
                                            {leaderboard.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                                                    <Trophy size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                    <p>No attempts recorded for this quiz yet.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {leaderboard.map((entry) => (
                                                        <div key={entry.studentId} style={{
                                                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                                                            background: entry.rank === 1 ? 'linear-gradient(135deg, rgba(234,179,8,0.1), rgba(234,179,8,0.05))' : 'var(--bg-primary)',
                                                            border: entry.rank === 1 ? '1px solid rgba(234,179,8,0.3)' : '1px solid var(--border-color)',
                                                            borderRadius: '12px'
                                                        }}>
                                                            <div style={{
                                                                width: '36px', height: '36px', borderRadius: '50%',
                                                                background: entry.rank === 1 ? '#eab308' : entry.rank === 2 ? '#9ca3af' : entry.rank === 3 ? '#b45309' : 'var(--bg-secondary)',
                                                                color: entry.rank <= 3 ? 'white' : 'var(--text-secondary)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                                            }}>
                                                                {entry.rank <= 3 ? <Medal size={20} /> : entry.rank}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{entry.name} {entry.rank === 1 && <span style={{ fontSize: '0.75rem', background: '#eab308', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>Winner</span>}</h4>
                                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{entry.rollNumber}</p>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{entry.percentage}%</div>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                                                    <Clock size={12} /> {formatTime(entry.timeTaken)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'certificates' && (
                                        <div>
                                            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                                <input
                                                    type="text"
                                                    placeholder="Search by student name, roll number or certificate ID..."
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>

                                            {filteredCertificates.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                                                    <Award size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                    <p>{certificates.length === 0 ? 'No certificates issued yet. Certificates are issued automatically when a student passes a university quiz.' : 'No certificates match your search.'}</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                    {filteredCertificates.map(cert => (
                                                        <div key={cert._id} style={{
                                                            background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                                            borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: '600' }}>
                                                                    <CheckCircle size={16} /> Verified
                                                                </div>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                    {cert.certificateId}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{cert.studentId?.name}</h4>
                                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cert.studentId?.rollNumber}</p>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score</div>
                                                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{cert.percentage}%</div>
                                                                </div>
                                                                <button style={{
                                                                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem',
                                                                    background: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'none', borderRadius: '6px',
                                                                    fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'
                                                                }}>
                                                                    <Download size={16} /> View
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default QuizResultsModal;
