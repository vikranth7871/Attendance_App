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
                    leaves.map((leave) => (
                        <motion.div
                            key={leave.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel"
                            style={{ padding: '1.75rem', borderLeft: `4px solid ${leave.status === 'approved' ? 'var(--success)' : leave.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'}` }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>{leave.leave_type || leave.leaveType || 'General Leave'}</span>
                                        <span style={{
                                            padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800',
                                            textTransform: 'uppercase',
                                            background: leave.status === 'approved' ? 'rgba(16,185,129,0.15)' : leave.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: leave.status === 'approved' ? 'var(--success)' : leave.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
                                        }}>
                                            {leave.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                        📅 {new Date(leave.start_date || leave.startDate).toLocaleDateString()} to {new Date(leave.end_date || leave.endDate).toLocaleDateString()}
                                    </div>
                                    <p style={{ color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.9rem', margin: 0 }}>
                                        "{leave.reason}"
                                    </p>

                                    {(leave.status === 'rejected' || leave.status === 'revoked') && (leave.rejection_reason || leave.rejectionReason) && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: leave.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', borderRadius: '0.75rem', border: `1px solid ${leave.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, color: leave.status === 'rejected' ? 'var(--danger)' : '#f59e0b', fontSize: '0.85rem' }}>
                                            <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                                                {leave.status === 'rejected' ? 'Rejection Reason' : 'Revocation Reason'}:
                                            </strong>
                                            {leave.rejection_reason || leave.rejectionReason}
                                        </div>
                                    )}
                                </div>

                                {/* Action Controls for Pending Requests */}
                                {leave.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <button
                                            onClick={() => setRemarksModal({ leaveId: leave.id, action: 'approved' })}
                                            disabled={processingId === leave.id}
                                            className="btn"
                                            style={{ background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontWeight: '700' }}
                                        >
                                            <Check size={16} /> Approve
                                        </button>
                                        <button
                                            onClick={() => setRemarksModal({ leaveId: leave.id, action: 'rejected' })}
                                            disabled={processingId === leave.id}
                                            className="btn"
                                            style={{ background: 'var(--danger)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontWeight: '700' }}
                                        >
                                            <X size={16} /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))
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
