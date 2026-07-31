import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, Download, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentResults = () => {
    const [academicData, setAcademicData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/student/results');
                setAcademicData(data);
            } catch (err) {
                console.error('Failed to fetch student results', err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, []);

    const handleDownloadReportCard = () => {
        if (!academicData) return;
        const studentName = academicData.student?.name || 'Student';
        const results = academicData.results || [];
        let reportText = `=========================================\n`;
        reportText += `       OFFICIAL ACADEMIC REPORT CARD     \n`;
        reportText += `=========================================\n\n`;
        reportText += `Student Name: ${studentName}\n`;
        reportText += `Class: ${academicData.student?.class_name || 'CS101-A'}\n`;
        reportText += `Roll Number: ${academicData.student?.roll_number || 'CS202401'}\n`;
        reportText += `Generated Date: ${new Date().toLocaleDateString()}\n\n`;
        reportText += `-----------------------------------------\n`;
        reportText += `SUBJECT             MARKS    GRADE  REMARKS\n`;
        reportText += `-----------------------------------------\n`;
        results.forEach(r => {
            const subj = (r.subject_name || 'Subject').padEnd(18, ' ');
            const marks = `${r.marks_obtained}/100`.padEnd(8, ' ');
            const grade = (r.grade || 'A').padEnd(7, ' ');
            reportText += `${subj} ${marks} ${grade} ${r.remarks || ''}\n`;
        });
        reportText += `-----------------------------------------\n`;
        reportText += `Status: PROMOTED / PASSED\n`;
        reportText += `=========================================\n`;

        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ReportCard_${studentName.replace(/\s+/g, '_')}.txt`;
        link.click();
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading exam results...</div>;

    const results = academicData?.results || [];
    const schedules = academicData?.schedules || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Award size={28} className="text-brand-primary" /> Examination Results & Schedule
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Academic performance, published subject grades, and upcoming exam schedules.
                    </p>
                </div>

                <button
                    onClick={handleDownloadReportCard}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: '700' }}
                >
                    <Download size={18} /> Download Report Card
                </button>
            </div>

            {/* Published Subject Grades */}
            <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '1rem' }}>Subject Grades & Marks</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {results.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-secondary)' }}>No published exam results available yet.</div>
                    ) : (
                        results.map((res, idx) => (
                            <motion.div
                                key={res.id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-panel"
                                style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                            {res.exam_name || 'MID-TERM EXAMINATION 2026'}
                                        </span>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{res.subject_name}</h3>
                                    </div>
                                    <span style={{
                                        padding: '0.4rem 0.85rem', borderRadius: '0.6rem', fontSize: '1.1rem', fontWeight: '900',
                                        background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)'
                                    }}>
                                        {res.grade}
                                    </span>
                                </div>

                                <div>
                                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--brand-primary)', lineHeight: 1 }}>
                                        {res.marks_obtained} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>/ 100</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem', fontWeight: '700', textTransform: 'uppercase' }}>Marks Obtained</div>
                                </div>

                                {res.remarks && (
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                                        "{res.remarks}"
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Upcoming Exam Schedules */}
            <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '1rem' }}>Upcoming Examination Schedule</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {schedules.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No upcoming exam schedule posted.</div>
                    ) : (
                        schedules.map((sc, idx) => (
                            <div key={sc.id || idx} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{sc.exam_name} — {sc.subject_name}</h4>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                                        <span>📅 {new Date(sc.exam_date).toLocaleDateString()}</span>
                                        <span>⏰ {sc.time_slot || '10:00 AM - 12:00 PM'}</span>
                                        <span>📍 Room {sc.room_number || 'Lab 301'}</span>
                                    </div>
                                </div>
                                <span style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '800', background: 'rgba(59,130,246,0.15)', color: 'var(--brand-primary)' }}>
                                    Max Marks: {sc.max_marks || 100}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentResults;
