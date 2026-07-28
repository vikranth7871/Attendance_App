import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Upload, CheckCircle2, XCircle, AlertCircle, FileText, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import LeaveCalendarPicker from '../../components/shared/LeaveCalendarPicker';

const TeacherApplyLeave = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const [formData, setFormData] = useState({
        leaveType: 'Casual',
        startDate: '',
        endDate: '',
        reason: '',
        document: null
    });

    useEffect(() => {
        fetchMyLeaves();
    }, []);

    const fetchMyLeaves = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/leave/my-leaves');
            setLeaves(data);
        } catch (error) {
            console.error('Failed to fetch leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, document: e.target.files[0] });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!formData.startDate || !formData.endDate) {
            return setFormError('Please select both start and end dates.');
        }

        if (!formData.reason.trim()) {
            return setFormError('Please provide a reason for your leave.');
        }

        setSubmitting(true);

        try {
            const data = new FormData();
            data.append('leaveType', formData.leaveType);
            data.append('startDate', formData.startDate);
            data.append('endDate', formData.endDate);
            data.append('reason', formData.reason);
            if (formData.document) {
                data.append('document', formData.document);
            }

            await axios.post('/leave/apply', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setFormSuccess('Leave application submitted successfully for Admin review!');
            setFormData({
                leaveType: 'Casual',
                startDate: '',
                endDate: '',
                reason: '',
                document: null
            });
            fetchMyLeaves();
        } catch (error) {
            setFormError(error.response?.data?.message || 'Failed to submit leave application.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.8rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> Approved</span>;
            case 'rejected':
                return <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.8rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Rejected</span>;
            case 'revoked':
                return <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={14} /> Revoked</span>;
            default:
                return <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', fontSize: '0.8rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Pending</span>;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Page Header */}
            <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Calendar size={28} style={{ color: 'var(--brand-secondary)' }} /> Apply for Leave
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Submit leave applications for administrative approval and track application statuses.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {/* Application Form */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                >
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Send size={18} style={{ color: 'var(--brand-secondary)' }} /> New Leave Request
                    </h3>

                    {formError && (
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            {formError}
                        </div>
                    )}

                    {formSuccess && (
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            {formSuccess}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                Leave Type *
                            </label>
                            <select
                                value={formData.leaveType}
                                onChange={e => setFormData({ ...formData, leaveType: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                            >
                                <option value="Casual">Casual Leave</option>
                                <option value="Sick">Sick / Medical Leave</option>
                                <option value="Earned">Earned Leave</option>
                                <option value="Duty">On-Duty / Official</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                Leave Date / Range Selection *
                            </label>
                            <LeaveCalendarPicker
                                startDate={formData.startDate}
                                endDate={formData.endDate}
                                onChange={({ startDate, endDate }) => setFormData({ ...formData, startDate, endDate })}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                Reason *
                            </label>
                            <textarea
                                required
                                rows={3}
                                placeholder="Explain reason for leave..."
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                Supporting Document (Optional)
                            </label>
                            <div style={{ border: '1px dashed var(--border-color)', padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Upload size={18} style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    onChange={handleFileChange}
                                    style={{ fontSize: '0.85rem', color: 'var(--text-primary)', width: '100%' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                marginTop: '0.5rem', padding: '0.85rem', borderRadius: '10px',
                                background: 'linear-gradient(135deg, var(--brand-secondary), var(--accent))',
                                color: 'white', border: 'none', fontWeight: '600', fontSize: '0.95rem',
                                cursor: 'pointer', opacity: submitting ? 0.7 : 1, transition: 'all 0.2s ease'
                            }}
                        >
                            {submitting ? 'Submitting Application...' : 'Submit Application'}
                        </button>
                    </form>
                </motion.div>

                {/* History List */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}
                >
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} style={{ color: 'var(--brand-secondary)' }} /> Leave History & Status
                    </h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading history...</div>
                    ) : leaves.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={40} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                            <p>No leave applications submitted yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', maxHeight: '500px' }}>
                            {leaves.map((l) => (
                                <div key={l._id || l.id} style={{ padding: '1rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{l.leaveType} Leave</span>
                                        {getStatusBadge(l.status)}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={14} />
                                        {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{l.reason}</p>
                                    {l.documentUrl && (
                                        <a href={l.documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--brand-secondary)', textDecoration: 'none', fontWeight: '600', marginTop: '0.25rem' }}>
                                            📄 View Attached Document
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default TeacherApplyLeave;
