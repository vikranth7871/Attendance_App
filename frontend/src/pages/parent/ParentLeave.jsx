import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarOff, CheckCircle2, XCircle, Clock, FileText, Check, X } from 'lucide-react';

const ParentLeave = ({ selectedChildId }) => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [remarksModal, setRemarksModal] = useState(null); // { leaveId, action }

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const url = selectedChildId ? `/parent/student-leaves?studentId=${selectedChildId}` : '/parent/student-leaves';
            const { data } = await axios.get(url);
            setLeaves(data);
        } catch (err) {
            console.error('Failed to fetch leave requests', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, [selectedChildId]);

    const handleAction = async (leaveId, action, remarks = '') => {
        setProcessingId(leaveId);
        try {
            await axios.put(`/parent/student-leaves/${leaveId}/action`, { action, remarks });
            setRemarksModal(null);
            await fetchLeaves();
        } catch (err) {
            console.error('Failed to update leave status', err);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading leave requests...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CalendarOff size={28} className="text-brand-primary" /> Leave Requests & Approvals
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Review, approve, or track leave applications submitted for your child.
                </p>
            </div>

            {/* Leave Requests Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {leaves.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No leave requests submitted for this student.
                    </div>
                ) : (
                    leaves.map((leave) => {
                        const statusColor = leave.status === 'approved' ? 'var(--success)' : leave.status === 'rejected' ? 'var(--danger)' : 'var(--warning)';
                        const startDate = new Date(leave.start_date || leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        const endDate = new Date(leave.end_date || leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                        return (
                            <motion.div
                                key={leave.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.75rem',
                                    padding: '1rem 1.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {/* Status stripe */}
                                <div style={{ width: '4px', borderRadius: '999px', alignSelf: 'stretch', background: statusColor, flexShrink: 0 }} />

                                {/* Main info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{leave.leave_type || leave.leaveType || 'General Leave'}</span>
                                        <span style={{
                                            padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700',
                                            textTransform: 'uppercase', color: statusColor,
                                            background: leave.status === 'approved' ? 'rgba(16,185,129,0.12)' : leave.status === 'rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'
                                        }}>
                                            {leave.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                                        {startDate} → {endDate}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        {leave.reason}
                                    </div>
                                    {(leave.status === 'rejected' || leave.status === 'revoked') && (leave.rejection_reason || leave.rejectionReason) && (
                                        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: statusColor }}>
                                            ⚠ {leave.rejection_reason || leave.rejectionReason}
                                        </div>
                                    )}
                                </div>

                                {/* Approve / Reject buttons for pending */}
                                {leave.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                        <button
                                            onClick={() => setRemarksModal({ leaveId: leave.id, action: 'approved' })}
                                            disabled={processingId === leave.id}
                                            style={{ background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                        >
                                            <Check size={14} /> Approve
                                        </button>
                                        <button
                                            onClick={() => setRemarksModal({ leaveId: leave.id, action: 'rejected' })}
                                            disabled={processingId === leave.id}
                                            style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                        >
                                            <X size={14} /> Reject
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Approval / Rejection Remarks Modal */}
            <AnimatePresence>
                {remarksModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 2000, padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="glass-panel"
                            style={{ padding: '2rem', maxWidth: '450px', width: '100%', border: '1px solid var(--border-color)' }}
                        >
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                {remarksModal.action === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                                Add optional notes or confirmation remarks for this leave request.
                            </p>
                            <textarea
                                id="leave-remarks-input"
                                rows={3}
                                placeholder="Enter parent remarks..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginBottom: '1.5rem', outline: 'none' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setRemarksModal(null)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.6rem 1.25rem', borderRadius: '0.75rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const remarks = document.getElementById('leave-remarks-input').value;
                                        handleAction(remarksModal.leaveId, remarksModal.action, remarks);
                                    }}
                                    className="btn"
                                    style={{
                                        background: remarksModal.action === 'approved' ? 'var(--success)' : 'var(--danger)',
                                        color: 'white', padding: '0.6rem 1.5rem', borderRadius: '0.75rem', fontWeight: '700'
                                    }}
                                >
                                    Confirm {remarksModal.action === 'approved' ? 'Approval' : 'Rejection'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ParentLeave;
