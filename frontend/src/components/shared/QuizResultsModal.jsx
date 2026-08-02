import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Medal, Clock, Award, Download, CheckCircle, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, User, Calendar } from 'lucide-react';
import axios from 'axios';

const QuizResultsModal = ({ isOpen, onClose, quiz }) => {
    const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' or 'certificates'
    const [leaderboard, setLeaderboard] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter & Search & Sort states
    const [searchQuery, setSearchQuery] = useState('');
    const [attemptFilter, setAttemptFilter] = useState('all'); // 'all', 'best', 'latest'
    const [gradeFilter, setGradeFilter] = useState('all'); // 'all', 'passed', 'failed', 'top'
    const [sortBy, setSortBy] = useState('default'); // 'default', 'score_desc', 'score_asc', 'name_asc', 'name_desc', 'time_asc', 'date_desc'

    useEffect(() => {
        if (isOpen && quiz) {
            fetchResults();
        }
    }, [isOpen, quiz]);

    const fetchResults = async () => {
        setLoading(true);
        setError('');
        try {
            const { data: ldData } = await axios.get(`/quiz/${quiz._id}/leaderboard`);
            setLeaderboard(ldData.leaderboard || []);

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
        const secs = parseInt(seconds, 10) || 0;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    // Calculate processed & filtered attempts sheet data
    const processedLeaderboard = useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return [];

        let list = [...leaderboard];

        // 1. Attempt Mode Filtering ('all', 'best', 'latest')
        if (attemptFilter === 'best') {
            const bestMap = {};
            list.forEach(entry => {
                const sId = entry.studentId || entry.name;
                if (!bestMap[sId] || entry.percentage > bestMap[sId].percentage) {
                    bestMap[sId] = entry;
                }
            });
            list = Object.values(bestMap);
        } else if (attemptFilter === 'latest') {
            const latestMap = {};
            list.forEach(entry => {
                const sId = entry.studentId || entry.name;
                if (!latestMap[sId] || new Date(entry.createdAt || entry.submissionDate) > new Date(latestMap[sId].createdAt || latestMap[sId].submissionDate)) {
                    latestMap[sId] = entry;
                }
            });
            list = Object.values(latestMap);
        }

        // 2. Search Query (Name or Roll Number)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(entry =>
                (entry.name && entry.name.toLowerCase().includes(q)) ||
                (entry.rollNumber && entry.rollNumber.toLowerCase().includes(q))
            );
        }

        // 3. Grade / Performance Filter ('all', 'passed', 'failed', 'top')
        if (gradeFilter === 'passed') {
            list = list.filter(e => e.percentage >= 50);
        } else if (gradeFilter === 'failed') {
            list = list.filter(e => e.percentage < 50);
        } else if (gradeFilter === 'top') {
            list = list.filter(e => e.percentage >= 90);
        }

        // 4. Sorting (Only apply when not default)
        if (sortBy !== 'default') {
            list.sort((a, b) => {
                if (sortBy === 'score_desc') return b.percentage - a.percentage;
                if (sortBy === 'score_asc') return a.percentage - b.percentage;
                if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
                if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
                if (sortBy === 'time_asc') return (a.timeTaken || 0) - (b.timeTaken || 0);
                if (sortBy === 'date_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                return 0;
            });
        }

        return list;
    }, [leaderboard, attemptFilter, searchQuery, gradeFilter, sortBy]);

    // Analytics summary
    const analytics = useMemo(() => {
        if (!leaderboard || leaderboard.length === 0) return { totalAttempts: 0, totalStudents: 0, avgScore: 0, passRate: 0 };
        const uniqueStudents = new Set(leaderboard.map(e => e.studentId || e.name)).size;
        const totalAttempts = leaderboard.length;
        const avgScore = Math.round(leaderboard.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalAttempts);
        const passedCount = leaderboard.filter(e => (e.percentage || 0) >= 50).length;
        const passRate = Math.round((passedCount / totalAttempts) * 100);
        return { totalAttempts, totalStudents: uniqueStudents, avgScore, passRate };
    }, [leaderboard]);

    const filteredCertificates = certificates.filter(cert =>
        cert.studentId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.studentId?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.certificateId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
                        background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            borderRadius: '18px', width: '100%', maxWidth: '980px', maxHeight: '92vh',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.2rem 1.75rem', borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <Trophy size={20} className="text-brand-primary" /> Quiz Results: {quiz?.title}
                                </h2>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                                    {quiz?.type === 'university' ? 'University Assessment Results & Sheet' : 'Practice Quiz Performance Sheet'}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '50%',
                                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        {(quiz?.type === 'university' || quiz?.type === 'official') && (
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                <button
                                    onClick={() => setActiveTab('leaderboard')}
                                    style={{
                                        flex: 1, padding: '0.85rem', background: 'transparent', border: 'none', cursor: 'pointer',
                                        fontWeight: '700', fontSize: '0.9rem', color: activeTab === 'leaderboard' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                        borderBottom: activeTab === 'leaderboard' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s'
                                    }}
                                >
                                    <Trophy size={16} /> Results Sheet ({leaderboard.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('certificates')}
                                    style={{
                                        flex: 1, padding: '0.85rem', background: 'transparent', border: 'none', cursor: 'pointer',
                                        fontWeight: '700', fontSize: '0.9rem', color: activeTab === 'certificates' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                        borderBottom: activeTab === 'certificates' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s'
                                    }}
                                >
                                    <Award size={16} /> Issued Certificates ({certificates.length})
                                </button>
                            </div>
                        )}

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                                    <div className="loader" style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                </div>
                            ) : error ? (
                                <div style={{ padding: '1rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: '8px', textAlign: 'center' }}>
                                    {error}
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'leaderboard' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                                            {/* Summary Performance Cards Bar */}
                                            {leaderboard.length > 0 && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                                    <div style={{ background: 'var(--bg-primary)', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Attempts</span>
                                                        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{analytics.totalAttempts}</div>
                                                    </div>
                                                    <div style={{ background: 'var(--bg-primary)', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Students Attended</span>
                                                        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--brand-primary)', marginTop: '0.15rem' }}>{analytics.totalStudents}</div>
                                                    </div>
                                                    <div style={{ background: 'var(--bg-primary)', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Class Average</span>
                                                        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: analytics.avgScore >= 70 ? '#10b981' : '#f59e0b', marginTop: '0.15rem' }}>{analytics.avgScore}%</div>
                                                    </div>
                                                    <div style={{ background: 'var(--bg-primary)', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pass Rate</span>
                                                        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: analytics.passRate >= 70 ? '#10b981' : '#ef4444', marginTop: '0.15rem' }}>{analytics.passRate}%</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Control Bar: Search + Attempt Filter + Grade Filter + Sort By */}
                                            {leaderboard.length > 0 && (
                                                <div style={{
                                                    background: 'var(--bg-primary)', padding: '1rem', borderRadius: '14px',
                                                    border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.85rem'
                                                }}>
                                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        {/* Search Input */}
                                                        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                                                            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                                            <input
                                                                type="text"
                                                                placeholder="Search student name or roll number..."
                                                                value={searchQuery}
                                                                onChange={e => setSearchQuery(e.target.value)}
                                                                style={{
                                                                    width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.4rem', borderRadius: '0.65rem',
                                                                    border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                                                                    color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600', outline: 'none'
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Sort By Dropdown */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                                                            <ArrowUpDown size={14} style={{ color: 'var(--brand-primary)' }} />
                                                            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Sort:</span>
                                                            <select
                                                                value={sortBy}
                                                                onChange={e => setSortBy(e.target.value)}
                                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                                                            >
                                                                <option value="default" style={{ background: 'var(--bg-primary)' }}>Default</option>
                                                                <option value="score_desc" style={{ background: 'var(--bg-primary)' }}>Score (High → Low)</option>
                                                                <option value="score_asc" style={{ background: 'var(--bg-primary)' }}>Score (Low → High)</option>
                                                                <option value="name_asc" style={{ background: 'var(--bg-primary)' }}>Name (A → Z)</option>
                                                                <option value="name_desc" style={{ background: 'var(--bg-primary)' }}>Name (Z → A)</option>
                                                                <option value="time_asc" style={{ background: 'var(--bg-primary)' }}>Time (Fastest First)</option>
                                                                <option value="date_desc" style={{ background: 'var(--bg-primary)' }}>Date (Newest First)</option>
                                                            </select>
                                                        </div>

                                                        {/* Grade Filter Dropdown */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                                                            <Filter size={14} style={{ color: 'var(--brand-primary)' }} />
                                                            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Grade:</span>
                                                            <select
                                                                value={gradeFilter}
                                                                onChange={e => setGradeFilter(e.target.value)}
                                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                                                            >
                                                                <option value="all" style={{ background: 'var(--bg-primary)' }}>All Grades</option>
                                                                <option value="passed" style={{ background: 'var(--bg-primary)' }}>Passed (≥ 50%)</option>
                                                                <option value="failed" style={{ background: 'var(--bg-primary)' }}>Failed (&lt; 50%)</option>
                                                                <option value="top" style={{ background: 'var(--bg-primary)' }}>Top (≥ 90%)</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Attempt Type Pill Selector */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Attempts View:</span>
                                                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                            {[
                                                                { id: 'all', label: 'All Attempts' },
                                                                { id: 'best', label: 'Best Attempt per Student' },
                                                                { id: 'latest', label: 'Latest Attempt per Student' }
                                                            ].map(f => (
                                                                <button
                                                                    key={f.id}
                                                                    onClick={() => setAttemptFilter(f.id)}
                                                                    style={{
                                                                        padding: '0.35rem 0.75rem',
                                                                        fontSize: '0.78rem',
                                                                        fontWeight: '700',
                                                                        borderRadius: '0.5rem',
                                                                        border: attemptFilter === f.id ? 'none' : '1px solid var(--border-color)',
                                                                        background: attemptFilter === f.id ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                                                                        color: attemptFilter === f.id ? 'white' : 'var(--text-secondary)',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                >
                                                                    {f.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Results Sheet Table */}
                                            {processedLeaderboard.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                    <Trophy size={44} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                                                    <p style={{ margin: 0, fontWeight: '600' }}>
                                                        {leaderboard.length === 0
                                                            ? 'No quiz attempts recorded yet.'
                                                            : 'No results found matching your search and filter criteria.'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div style={{ background: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                                    <div style={{ overflowX: 'auto' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                                            <thead>
                                                                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                                    <th style={{ padding: '0.85rem 1rem', fontWeight: '800' }}>Rank</th>
                                                                    <th
                                                                        onClick={() => setSortBy(sortBy === 'name_asc' ? 'name_desc' : 'name_asc')}
                                                                        style={{ padding: '0.85rem 1rem', fontWeight: '800', cursor: 'pointer', userSelect: 'none' }}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                                            Student Name
                                                                            {sortBy.startsWith('name') && (sortBy === 'name_asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
                                                                        </div>
                                                                    </th>
                                                                    <th style={{ padding: '0.85rem 1rem', fontWeight: '800' }}>Attempt</th>
                                                                    <th
                                                                        onClick={() => setSortBy(sortBy === 'score_desc' ? 'score_asc' : 'score_desc')}
                                                                        style={{ padding: '0.85rem 1rem', fontWeight: '800', cursor: 'pointer', userSelect: 'none' }}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                                            Score %
                                                                            {sortBy.startsWith('score') && (sortBy === 'score_desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />)}
                                                                        </div>
                                                                    </th>
                                                                    <th
                                                                        onClick={() => setSortBy(sortBy === 'time_asc' ? 'score_desc' : 'time_asc')}
                                                                        style={{ padding: '0.85rem 1rem', fontWeight: '800', cursor: 'pointer', userSelect: 'none' }}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                                            Time Taken
                                                                            {sortBy === 'time_asc' && <ArrowUp size={13} />}
                                                                        </div>
                                                                    </th>
                                                                    <th style={{ padding: '0.85rem 1rem', fontWeight: '800' }}>Date</th>
                                                                    <th style={{ padding: '0.85rem 1rem', fontWeight: '800' }}>Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {processedLeaderboard.map((entry, idx) => {
                                                                    const rankNum = idx + 1;
                                                                    const isPassed = (entry.percentage || 0) >= 50;

                                                                    return (
                                                                        <tr
                                                                            key={entry.attemptId || `${entry.studentId}-${idx}`}
                                                                            style={{
                                                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                                background: rankNum === 1 ? 'rgba(234,179,8,0.06)' : 'transparent',
                                                                                transition: 'background 0.15s'
                                                                            }}
                                                                        >
                                                                            {/* Rank */}
                                                                            <td style={{ padding: '0.85rem 1rem', fontWeight: '800' }}>
                                                                                <div style={{
                                                                                    width: '28px', height: '28px', borderRadius: '50%',
                                                                                    background: rankNum === 1 ? '#eab308' : rankNum === 2 ? '#9ca3af' : rankNum === 3 ? '#b45309' : 'rgba(255,255,255,0.08)',
                                                                                    color: rankNum <= 3 ? '#fff' : 'var(--text-secondary)',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: '800'
                                                                                }}>
                                                                                    {rankNum <= 3 ? <Medal size={16} /> : `#${rankNum}`}
                                                                                </div>
                                                                            </td>

                                                                            {/* Student Name & Roll No */}
                                                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{entry.name || 'Student'}</div>
                                                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{entry.rollNumber || '—'}</div>
                                                                            </td>

                                                                            {/* Attempt # */}
                                                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                                                <span style={{ fontSize: '0.75rem', background: 'rgba(91, 80, 230, 0.12)', color: 'var(--brand-primary)', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                                                                                    Attempt #{entry.attemptNumber || 1}
                                                                                </span>
                                                                            </td>

                                                                            {/* Score Percentage */}
                                                                            <td style={{ padding: '0.85rem 1rem', fontWeight: '800', fontSize: '1rem', color: entry.percentage >= 90 ? '#10b981' : entry.percentage >= 50 ? 'var(--text-primary)' : '#ef4444' }}>
                                                                                {entry.percentage}%
                                                                            </td>

                                                                            {/* Time Taken */}
                                                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                                    <Clock size={13} style={{ color: 'var(--brand-primary)' }} />
                                                                                    {formatTime(entry.timeTaken)}
                                                                                </div>
                                                                            </td>

                                                                            {/* Date */}
                                                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                                                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—'}
                                                                            </td>

                                                                            {/* Status */}
                                                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                                                {rankNum === 1 ? (
                                                                                    <span style={{ fontSize: '0.72rem', background: '#eab308', color: '#000', padding: '3px 8px', borderRadius: '6px', fontWeight: '900' }}>
                                                                                        Winner
                                                                                    </span>
                                                                                ) : isPassed ? (
                                                                                    <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                                                                                        Passed
                                                                                    </span>
                                                                                ) : (
                                                                                    <span style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                                                                                        Failed
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
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
        </AnimatePresence>,
        document.body
    );
};

export default QuizResultsModal;
