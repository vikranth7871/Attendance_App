import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Clock, Search, Filter, User, Building, Check, X, ShieldAlert, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DocumentModal from '../../components/shared/DocumentModal';

const AdminTeacherLeaves = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    // Modal state for Reject / Revoke
    const [actionModal, setActionModal] = useState(null); // { id, type: 'reject' | 'revoke', teacherName }
    const [actionReason, setActionReason] = useState('');
    const [previewDoc, setPreviewDoc] = useState(null);

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

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        if (!actionModal) return;

        setActionLoading(actionModal.id);
        try {
            if (actionModal.type === 'reject') {
                await axios.put(`/leave/reject/${actionModal.id}`, { reason: actionReason });
            } else if (actionModal.type === 'revoke') {
                await axios.put(`/leave/revoke/${actionModal.id}`, { reason: actionReason || 'Revoked by Admin' });
            }
            setActionModal(null);
            setActionReason('');
            fetchTeacherLeaves();
        } catch (error) {
            alert(error.response?.data?.message || `Failed to ${actionModal.type} leave`);
        } finally {
            setActionLoading(null);
        }
    };

    // Filter leaves
    const filteredLeaves = useMemo(() => {
        return leaves.filter(l => {
            const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
            const name = l.userId?.name || '';
            const email = l.userId?.email || '';
            const dept = l.userId?.departmentName || '';
            const reason = l.reason || '';

            const matchesSearch = searchQuery
                ? (name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    reason.toLowerCase().includes(searchQuery.toLowerCase()))
                : true;

            return matchesStatus && matchesSearch;
        });
    }, [leaves, filterStatus, searchQuery]);

    // Summary Counts
    const countTotal = leaves.length;
    const countPending = leaves.filter(l => l.status === 'pending').length;
    const countApproved = leaves.filter(l => l.status === 'approved').length;
    const countRejected = leaves.filter(l => l.status === 'rejected' || l.status === 'revoked').length;

    // Pagination state & calculations
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const totalCount = filteredLeaves.length;
    const effectivePageSize = pageSize === 'all' ? (totalCount || 1) : Number(pageSize);
    const totalPages = Math.ceil(totalCount / effectivePageSize) || 1;
    const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * effectivePageSize;
    const endIndex = Math.min(startIndex + effectivePageSize, totalCount);

    const paginatedLeaves = useMemo(() => {
        if (pageSize === 'all') return filteredLeaves;
        const start = (currentPage - 1) * Number(pageSize);
        return filteredLeaves.slice(start, start + Number(pageSize));
    }, [filteredLeaves, currentPage, pageSize]);

    const calculateDays = (start, end) => {
        if (!start || !end) return 1;
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13} /> Approved</span>;
            case 'rejected':
                return <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={13} /> Rejected</span>;
            case 'revoked':
                return <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={13} /> Revoked</span>;
            default:
                return <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> Pending Review</span>;
        }
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
            <DocumentModal url={previewDoc} onClose={() => setPreviewDoc(null)} />

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.65rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Calendar size={28} style={{ color: 'var(--brand-primary)' }} /> Teacher Leave Management
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
                        Review, approve, or reject leave requests submitted by faculty and educators across institution.
                    </p>
                </div>
            </div>

            {/* Analytics Counter Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Total Requests</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>{countTotal}</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Pending Review</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f59e0b' }}>{countPending}</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Approved</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>{countApproved}</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <XCircle size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Rejected / Revoked</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ef4444' }}>{countRejected}</div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search by teacher name, department, or reason..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
                    {['all', 'pending', 'approved', 'rejected', 'revoked'].map(status => (
                        <button
                            key={status}
                            onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
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

            {/* Main Data Table View */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <Loader2 size={32} className="spin" style={{ color: 'var(--brand-primary)', margin: '0 auto 0.5rem' }} />
                    <p>Loading teacher leave applications...</p>
                </div>
            ) : filteredLeaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <h3>No teacher leave requests found</h3>
                    <p style={{ fontSize: '0.9rem' }}>There are no applications matching your search or filter.</p>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '0.75rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.4rem', textAlign: 'left', fontSize: '0.88rem' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '0.6rem 0.8rem', width: '30px' }}>#</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Teacher</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Type</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Duration & Dates</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Reason</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Document</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLeaves.map((leave, idx) => {
                                const rowId = leave._id || leave.id;
                                const days = calculateDays(leave.startDate, leave.endDate);

                                const docUrl = leave.documentUrl ? leave.documentUrl.trim() : null;
                                let finalDocUrl = null;
                                if (docUrl) {
                                    const isAbsolute = /^https?:\/\//i.test(docUrl) || docUrl.startsWith('data:');
                                    const apiBase = (import.meta.env.VITE_API_URL || axios.defaults.baseURL || '').replace('/api', '').replace(/\/$/, '');
                                    finalDocUrl = isAbsolute ? docUrl : `${apiBase}/${docUrl.replace(/^\//, '')}`;
                                }

                                return (
                                    <tr
                                        key={rowId}
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '10px', transition: 'background 0.2s'
                                        }}
                                    >
                                        <td style={{ padding: '0.75rem 0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                            {startIndex + idx + 1}
                                        </td>

                                        <td style={{ padding: '0.75rem 0.8rem' }}>
                                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {leave.userId?.name || 'Teacher'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {leave.userId?.departmentName || leave.userId?.email || 'Faculty'}
                                            </div>
                                        </td>

                                        <td style={{ padding: '0.75rem 0.8rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: '600', padding: '0.2rem 0.55rem', borderRadius: '6px',
                                                background: leave.leaveType === 'Medical' ? 'rgba(239,68,68,0.1)' : leave.leaveType === 'Emergency' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                                                color: leave.leaveType === 'Medical' ? '#ef4444' : leave.leaveType === 'Emergency' ? '#f59e0b' : '#6366f1'
                                            }}>
                                                {leave.leaveType || 'General'}
                                            </span>
                                        </td>

                                        <td style={{ padding: '0.75rem 0.8rem' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                                            </div>
                                            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                    {days} {days === 1 ? 'day' : 'days'}
                                                </span>
                                            </div>
                                        </td>

                                        <td style={{ padding: '0.75rem 0.8rem', maxWidth: '220px' }}>
                                            <div style={{
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                color: 'var(--text-primary)', fontSize: '0.85rem'
                                            }} title={leave.reason}>
                                                {leave.reason}
                                            </div>
                                        </td>

                                        <td style={{ padding: '0.75rem 0.8rem' }}>
                                            {finalDocUrl ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewDoc(finalDocUrl)}
                                                    style={{
                                                        padding: '0.3rem 0.6rem', borderRadius: '6px',
                                                        background: 'rgba(91, 80, 230, 0.1)', border: '1px solid rgba(91, 80, 230, 0.25)',
                                                        color: 'var(--brand-primary)', fontWeight: '600', fontSize: '0.75rem',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                    }}
                                                    title="View Supporting Document"
                                                >
                                                    <FileText size={13} /> View Doc
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6 }}>No Doc</span>
                                            )}
                                        </td>

                                        <td style={{ padding: '0.75rem 0.8rem' }}>
                                            <div>
                                                {getStatusBadge(leave.status)}
                                                {leave.rejectionReason && (leave.status === 'rejected' || leave.status === 'revoked') && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.rejectionReason}>
                                                        "{leave.rejectionReason}"
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                                {leave.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(rowId)}
                                                            disabled={actionLoading === rowId}
                                                            style={{
                                                                padding: '0.35rem 0.65rem', borderRadius: '6px',
                                                                background: 'rgba(16,185,129,0.15)', color: '#10b981',
                                                                border: 'none', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                            }}
                                                            title="Approve Leave"
                                                        >
                                                            <Check size={14} /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setActionModal({ id: rowId, type: 'reject', teacherName: leave.userId?.name || 'Teacher' });
                                                                setActionReason('');
                                                            }}
                                                            disabled={actionLoading === rowId}
                                                            style={{
                                                                padding: '0.35rem 0.65rem', borderRadius: '6px',
                                                                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                                                border: 'none', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                            }}
                                                            title="Reject Leave"
                                                        >
                                                            <X size={14} /> Reject
                                                        </button>
                                                    </>
                                                )}

                                                {leave.status === 'approved' && (
                                                    <button
                                                        onClick={() => {
                                                            setActionModal({ id: rowId, type: 'revoke', teacherName: leave.userId?.name || 'Teacher' });
                                                            setActionReason('');
                                                        }}
                                                        disabled={actionLoading === rowId}
                                                        style={{
                                                            padding: '0.35rem 0.65rem', borderRadius: '6px',
                                                            background: 'rgba(245,158,11,0.15)', color: '#d97706',
                                                            border: '1px solid rgba(245,158,11,0.3)', fontWeight: '600', fontSize: '0.78rem',
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                        }}
                                                        title="Revoke Leave"
                                                    >
                                                        <ShieldAlert size={14} /> Revoke
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination Controls Bar */}
                    {filteredLeaves.length > 0 && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
                            padding: '0.85rem 0.5rem 0.25rem 0.5rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <span>Showing <strong>{totalCount === 0 ? 0 : startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalCount}</strong> applications</span>
                                <span>•</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>Rows per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={e => {
                                            setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        style={{
                                            padding: '0.3rem 0.5rem', borderRadius: '6px', background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value="all">All</option>
                                    </select>
                                </div>
                            </div>

                            {/* Page Numbers Navigation */}
                            {pageSize !== 'all' && totalPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                        disabled={currentPage === 1}
                                        style={{
                                            padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                            opacity: currentPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem'
                                        }}
                                    >
                                        <ChevronLeft size={14} /> Prev
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            style={{
                                                padding: '0.4rem 0.7rem', borderRadius: '6px', border: 'none',
                                                background: currentPage === page ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                                                color: currentPage === page ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem'
                                            }}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        style={{
                                            padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                            opacity: currentPage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem'
                                        }}
                                    >
                                        Next <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Action Reason Modal (Reject or Revoke) */}
            <AnimatePresence>
                {actionModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            style={{ background: 'var(--bg-primary)', padding: '1.75rem', borderRadius: '20px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
                        >
                            <h3 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '700' }}>
                                {actionModal.type === 'reject' ? `Reject Leave Application` : `Revoke Approved Leave`}
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                {actionModal.type === 'reject'
                                    ? `Please specify a reason for rejecting ${actionModal.teacherName}'s leave application.`
                                    : `Please specify a reason for revoking ${actionModal.teacherName}'s approved leave.`}
                            </p>

                            <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                        Reason for {actionModal.type === 'reject' ? 'Rejection' : 'Revocation'} *
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={actionReason}
                                        onChange={e => setActionReason(e.target.value)}
                                        placeholder={`Enter reason for ${actionModal.type}...`}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setActionModal(null)}
                                        style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading === actionModal.id}
                                        style={{
                                            flex: 1, padding: '0.65rem', borderRadius: '10px',
                                            background: actionModal.type === 'reject' ? '#ef4444' : '#d97706',
                                            color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer'
                                        }}
                                    >
                                        {actionModal.type === 'reject' ? 'Confirm Reject' : 'Confirm Revoke'}
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
