import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Calendar, Download, CheckCircle, XCircle, Clock, AlertTriangle, FileText, BarChart2 } from 'lucide-react';

const ParentAttendance = ({ selectedChildId }) => {
    const [attendanceData, setAttendanceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            try {
                const url = selectedChildId ? `/parent/student-attendance?studentId=${selectedChildId}` : '/parent/student-attendance';
                const { data } = await axios.get(url);
                setAttendanceData(data);
            } catch (err) {
                console.error('Failed to fetch attendance data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [selectedChildId]);

    const handleDownloadReport = async () => {
        setDownloading(true);
        try {
            const url = selectedChildId ? `/parent/student-attendance/export?studentId=${selectedChildId}` : '/parent/student-attendance/export';
            const response = await axios.get(url, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'text/csv' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Attendance_Report_${selectedChildId || 'Child'}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error('Failed to download report', err);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading attendance analytics...</div>;

    const records = attendanceData?.records || [];
    const monthlyBreakdown = attendanceData?.monthlyBreakdown || [];
    const subjectBreakdown = attendanceData?.subjectBreakdown || [];

    const totalSessions = records.length;
    const presentSessions = records.filter(r => r.status === 'present').length;
    const absentSessions = records.filter(r => r.status === 'absent').length;
    const leaveSessions = records.filter(r => r.status === 'leave').length;
    const percentage = totalSessions > 0 ? ((presentSessions / totalSessions) * 100).toFixed(1) : '100.0';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header & Export Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Calendar size={28} className="text-brand-primary" /> Attendance Analytics
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Comprehensive breakdown of sessions, monthly trends, and subject performance.
                    </p>
                </div>
                <button
                    onClick={handleDownloadReport}
                    disabled={downloading}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem' }}
                >
                    <Download size={18} />
                    {downloading ? 'Generating Report...' : 'Download Report'}
                </button>
            </div>

            {/* Quick Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Attendance Rate</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '800', color: parseFloat(percentage) >= 75 ? 'var(--success)' : 'var(--danger)' }}>{percentage}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>Threshold: 75%</div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Sessions Attended</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--brand-primary)' }}>{presentSessions} / {totalSessions}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>Present</div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Absent Days</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--danger)' }}>{absentSessions}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>Unexcused Absences</div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Approved Leaves</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--warning)' }}>{leaveSessions}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>Excused Sessions</div>
                </div>
            </div>

            {/* Subject-Wise Attendance Breakdown */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <BarChart2 size={20} className="text-brand-primary" /> Subject-wise Performance
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {subjectBreakdown.map((subj, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{subj.subjectName}</span>
                                <span style={{ fontWeight: '800', color: parseFloat(subj.percentage) >= 75 ? 'var(--success)' : 'var(--danger)' }}>{subj.percentage}%</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${subj.percentage}%`, background: parseFloat(subj.percentage) >= 75 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ef4444, #dc2626)', borderRadius: '4px', transition: 'width 0.5s' }} />
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{subj.present} of {subj.total} lectures attended</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Attendance History Table */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                    Recent Session Records
                </h3>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Subject</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Time Slot</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.slice(0, 15).map((rec, idx) => (
                                <tr key={rec.id || idx} style={{ background: 'var(--bg-secondary)' }}>
                                    <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                        {rec.date ? new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{rec.subject_name || 'General Session'}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{rec.time_slot || 'Regular'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700',
                                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                            background: rec.status === 'present' ? 'rgba(16,185,129,0.15)' : rec.status === 'leave' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                            color: rec.status === 'present' ? 'var(--success)' : rec.status === 'leave' ? 'var(--warning)' : 'var(--danger)'
                                        }}>
                                            {rec.status === 'present' && <CheckCircle size={14} />}
                                            {rec.status === 'leave' && <Clock size={14} />}
                                            {rec.status === 'absent' && <XCircle size={14} />}
                                            {rec.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ParentAttendance;
