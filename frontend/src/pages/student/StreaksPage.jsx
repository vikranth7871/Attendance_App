import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Flame, Trophy, Award, Crown, Zap, Search, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const StreaksPage = () => {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/student/leaderboard');
                if (Array.isArray(data)) {
                    setLeaderboard(data);
                } else if (data && data.leaderboard) {
                    setLeaderboard(data.leaderboard);
                    setUserRank(data.userRank);
                }
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const currentStreak = user?.streakCount || 0;
    const bestStreak = user?.bestStreak || 0;
    const nextMilestone = currentStreak < 5 ? 5 : currentStreak < 10 ? 10 : currentStreak < 30 ? 30 : currentStreak + 10;
    const progressPercent = Math.min(100, Math.round((currentStreak / nextMilestone) * 100));

    const filteredLeaderboard = leaderboard.filter(s => {
        const name = s.name || '';
        const cls = s.className || '';
        const roll = s.rollNumber || '';
        const q = searchQuery.toLowerCase();
        return name.toLowerCase().includes(q) || cls.toLowerCase().includes(q) || roll.toLowerCase().includes(q);
    });

    const getRankBadge = (index) => {
        if (index === 0) return { icon: <Crown size={18} color="#f59e0b" />, label: '1st', bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#b45309', border: '#f59e0b' };
        if (index === 1) return { icon: <Trophy size={16} color="#94a3b8" />, label: '2nd', bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', color: '#475569', border: '#cbd5e1' };
        if (index === 2) return { icon: <Award size={16} color="#b45309" />, label: '3rd', bg: 'linear-gradient(135deg, #ffedd5, #fed7aa)', color: '#c2410c', border: '#fdba74' };
        return { icon: null, label: `#${index + 1}`, bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border-color)' };
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Header Title */}
            <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Flame size={28} color="#f59e0b" /> Attendance Streaks & Leaderboard
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Earn streak points by attending classes consistently and climb your class leaderboard.
                </p>
            </div>

            {/* Top Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {/* Current Streak */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        color: 'white', padding: '1.5rem', borderRadius: '16px',
                        boxShadow: '0 10px 25px rgba(79, 70, 229, 0.25)',
                        position: 'relative', overflow: 'hidden'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.85 }}>Current Streak</span>
                            <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1, marginTop: '0.4rem' }}>
                                {currentStreak} <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Days</span>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.85rem', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                            <Flame size={32} color="#fef08a" />
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem', opacity: 0.9, fontWeight: '600' }}>
                            <span>Next Milestone: {nextMilestone} Days</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.25)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPercent}%`, height: '100%', background: '#fef08a', borderRadius: '999px', transition: 'width 0.5s ease' }} />
                        </div>
                    </div>
                </motion.div>

                {/* Best Streak */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    style={{
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>All-Time Record</span>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                                {bestStreak} <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Days</span>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.85rem', borderRadius: '16px' }}>
                            <Trophy size={30} color="#10b981" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#10b981', fontWeight: '700', marginTop: '1rem' }}>
                        <Sparkles size={15} /> Peak attendance consistency record
                    </div>
                </motion.div>

                {/* Class Rank */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    style={{
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Class Leaderboard Standing</span>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--brand-primary)', marginTop: '0.4rem' }}>
                                #{userRank || 1}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '0.85rem', borderRadius: '16px' }}>
                            <Crown size={30} color="#f59e0b" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '1rem' }}>
                        <Zap size={15} color="#f59e0b" /> Out of {leaderboard.length || 1} active students
                    </div>
                </motion.div>
            </div>

            {/* Leaderboard Section */}
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Trophy size={22} color="#f59e0b" /> Class Attendance Leaderboard
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, marginTop: '0.2rem' }}>
                            Top performing students ranked by active streak count.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search classmate..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.4rem', borderRadius: '10px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {/* Table List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Loading leaderboard data...
                    </div>
                ) : filteredLeaderboard.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No leaderboard entries found matching "{searchQuery}".
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredLeaderboard.map((student, idx) => {
                            const isMe = String(student._id || student.id) === String(user?.id || user?._id);
                            const badge = getRankBadge(idx);

                            return (
                                <motion.div
                                    key={student._id || student.id || idx}
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0.9rem 1.25rem', borderRadius: '12px',
                                        background: isMe ? 'rgba(99, 102, 241, 0.08)' : idx === 0 ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-secondary)',
                                        border: isMe ? '1.5px solid var(--brand-primary)' : idx === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {/* Left: Rank & Name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        {/* Rank Badge */}
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '50%',
                                            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: '800', fontSize: '0.85rem', flexShrink: 0
                                        }}>
                                            {badge.icon || badge.label}
                                        </div>

                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {student.name}
                                                {isMe && (
                                                    <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'var(--brand-primary)', color: 'white', fontWeight: '800' }}>
                                                        YOU
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {student.className || 'CS Student'} {student.rollNumber ? `• Roll: ${student.rollNumber}` : ''}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Streak & Record */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '800', fontSize: '1.1rem', color: '#f59e0b', justifyContent: 'flex-end' }}>
                                                <Flame size={18} /> {student.streakCount || 0} Days
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                Best: {student.bestStreak || 0} Days
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StreaksPage;
