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

    const isExamExpired = (examDateStr, timeSlotStr) => {
        if (!examDateStr) return false;
        const examDate = new Date(examDateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const examDay = new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate());

        if (examDay < today) return true;

        if (examDay.getTime() === today.getTime() && timeSlotStr) {
            try {
                const parts = timeSlotStr.split('-');
                if (parts.length > 1) {
                    const endTimeStr = parts[1].trim();
                    const match = endTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (match) {
                        let hours = parseInt(match[1], 10);
                        const minutes = parseInt(match[2], 10);
                        const ampm = match[3].toUpperCase();
                        if (ampm === 'PM' && hours < 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;

                        const examEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
                        if (now > examEndTime) return true;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
        return false;
    };

    const activeSchedules = schedules.filter(sc => !isExamExpired(sc.exam_date, sc.time_slot));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Award size={28} className="text-brand-primary" /> Exam Results & Performance
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        View your published exam scores, subject grades, and upcoming assessment schedules.
                    </p>
                </div>

                <button
                    onClick={handleDownloadReportCard}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: '700' }}
                >
                    <Download size={18} /> Download Official Report Card
                </button>
            </div>

            {/* Results Grid */}
            <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '1rem' }}>Published Subject Grades</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                    {results.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-secondary)' }}>No published exam results found yet.</div>
                    ) : (
                        results.map((res, idx) => (
                            <motion.div
                                key={res.id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-panel"
                                style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--brand-primary)', textTransform: 'uppercase' }}>{res.subject_code || 'CS101'}</span>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.1rem' }}>{res.subject_name}</h4>
                                    </div>
                                    <div style={{
                                        padding: '0.35rem 0.85rem', borderRadius: '0.65rem',
                                        background: 'rgba(16,185,129,0.15)', color: 'var(--success)',
                                        fontWeight: '900', fontSize: '1.1rem'
                                    }}>
                                        {res.grade || 'A'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <span>Exam: {res.exam_name}</span>
                                    <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{res.marks_obtained} / {res.max_marks || 100}</span>
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
                    {activeSchedules.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No upcoming exam schedule posted.</div>
                    ) : (
                        activeSchedules.map((sc, idx) => (
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
