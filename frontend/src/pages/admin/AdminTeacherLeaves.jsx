import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Clock, Search, Filter, User, Mail, Building, Check, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminTeacherLeaves = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    // Reject Modal state
    const [rejectingLeaveId, setRejectingLeaveId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        fetchTeacherLeaves();
    }, []);

    const fetchTeacherLeaves = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/leave/admin/teacher-leaves');
            setLeaves(data);
        } catch (error) {
            console.error('Failed to fetch teacher leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        setActionLoading(id);
        try {
            await axios.put(`/leave/approve/${id}`);
            fetchTeacherLeaves();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to approve leave');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        if (!rejectingLeaveId) return;

        setActionLoading(rejectingLeaveId);
        try {
            await axios.put(`/leave/reject/${rejectingLeaveId}`, { reason: rejectionReason });
            setRejectingLeaveId(null);
            setRejectionReason('');
            fetchTeacherLeaves();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to reject leave');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRevoke = async (id) => {
        if (!window.confirm('Are you sure you want to revoke this approved leave?')) return;
        setActionLoading(id);
        try {
            await axios.put(`/leave/revoke/${id}`, { reason: 'Revoked by Admin' });
            fetchTeacherLeaves();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to revoke leave');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredLeaves = leaves.filter(l => {
        const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
        const name = l.userId?.name || '';
        const email = l.userId?.email || '';
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              l.reason.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.8rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> Approved</span>;
            case 'rejected':
                return <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.8rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Rejected</span>;
            case 'revoked':
                return <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={14} /> Revoked</span>;
            default:
                return <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', fontSize: '0.8rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Pending Review</span>;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Calendar size={28} style={{ color: 'var(--brand-primary)' }} /> Teacher Leave Management
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Review, approve, or reject leave requests submitted by faculty and teachers.
                    </p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search by teacher name, email, or reason..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
                    {['all', 'pending', 'approved', 'rejected', 'revoked'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '10px', textTransform: 'capitalize',
                                fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', border: 'none',
                                background: filterStatus === status ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                                color: filterStatus === status ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leaves List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    Loading leave requests...
                </div>
            ) : filteredLeaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <h3>No teacher leave requests found</h3>
                    <p style={{ fontSize: '0.9rem' }}>There are no applications matching your search or filter.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
                    {filteredLeaves.map(leave => (
                        <motion.div
                            key={leave._id || leave.id}
                            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                            }}
                        >
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={18} style={{ color: 'var(--brand-primary)' }} /> {leave.userId?.name || 'Teacher'}
                                    </h3>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                        <Building size={12} /> {leave.userId?.departmentName || 'Faculty'}
                                    </div>
                                </div>
                                {getStatusBadge(leave.status)}
                            </div>

                            {/* Details */}
                            <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Leave Type:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{leave.leaveType}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Dates:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>
                                        {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                                    </strong>
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>REASON:</span>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>{leave.reason}</p>
                            </div>

                            {leave.documentUrl && (
                                <a
                                    href={leave.documentUrl} target="_blank" rel="noreferrer"
                                    style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: '600' }}
                                >
                                    📄 View Supporting Document
                                </a>
                            )}

                            {/* Action Buttons */}
                            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
                                {leave.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleApprove(leave._id || leave.id)}
                                            disabled={actionLoading === (leave._id || leave.id)}
                                            style={{
                                                flex: 1, padding: '0.6rem', borderRadius: '8px', background: '#10b981', color: 'white',
                                                border: 'none', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                            }}
                                        >
                                            <Check size={16} /> Approve
                                        </button>
                                        <button
                                            onClick={() => setRejectingLeaveId(leave._id || leave.id)}
                                            disabled={actionLoading === (leave._id || leave.id)}
                                            style={{
                                                flex: 1, padding: '0.6rem', borderRadius: '8px', background: '#ef4444', color: 'white',
                                                border: 'none', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                            }}
                                        >
                                            <X size={16} /> Reject
                                        </button>
                                    </>
                                )}

                                {leave.status === 'approved' && (
                                    <button
                                        onClick={() => handleRevoke(leave._id || leave.id)}
                                        disabled={actionLoading === (leave._id || leave.id)}
                                        style={{
                                            width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', color: '#d97706',
                                            border: '1px solid rgba(245,158,11,0.3)', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                        }}
                                    >
                                        <ShieldAlert size={16} /> Revoke Leave
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Rejection Reason Modal */}
            <AnimatePresence>
                {rejectingLeaveId && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '450px' }}
                        >
                            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Reject Leave Application</h3>
                            <form onSubmit={handleRejectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Reason for Rejection (Optional)</label>
                                    <textarea
                                        rows={3}
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                        placeholder="State reason..."
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setRejectingLeaveId(null)}
                                        style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Confirm Reject
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

export default AdminTeacherLeaves;
