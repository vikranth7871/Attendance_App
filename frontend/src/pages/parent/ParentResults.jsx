import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, Download, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ParentResults = ({ selectedChildId }) => {
    const [resultsData, setResultsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                const url = selectedChildId ? `/parent/student-results?studentId=${selectedChildId}` : '/parent/student-results';
                const { data } = await axios.get(url);
                setResultsData(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [selectedChildId]);

    const handleDownloadReportCard = () => {
        const studentName = resultsData?.student?.name || 'Student';
        let reportText = `=========================================\n`;
        reportText += `       ACADEMIC REPORT CARD 2026\n`;
        reportText += `=========================================\n\n`;
        reportText += `Student Name: ${studentName}\n`;
        reportText += `Roll Number: ${resultsData?.student?.rollNumber || 'STU001'}\n`;
        reportText += `Class: ${resultsData?.student?.classInfo?.className || 'Class VIII-A'}\n\n`;
        reportText += `EXAM RESULTS SUMMARY:\n`;
        reportText += `-----------------------------------------\n`;

        (resultsData?.examResults || []).forEach(r => {
            reportText += `Subject: ${r.subject_name}\n`;
            reportText += `Exam: ${r.exam_name}\n`;
            reportText += `Marks Obtained: ${r.marks_obtained} / 100\n`;
            reportText += `Grade: ${r.grade}\n`;
            reportText += `Remarks: ${r.remarks || 'Good'}\n`;
            reportText += `-----------------------------------------\n`;
        });

        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ReportCard_${studentName.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading exam results...</div>;

    const examResults = resultsData?.examResults || [];
    const upcomingExams = resultsData?.upcomingExams || [];
    const student = resultsData?.student || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Award size={28} className="text-brand-primary" /> Examination Results & Schedule
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Academic performance, grades, and upcoming exam schedules for {student.name}.
                    </p>
                </div>

                <button
                    onClick={handleDownloadReportCard}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem' }}
                >
                    <Download size={18} /> Download Report Card
                </button>
            </div>

            {/* Past Exam Performance Grid */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <TrendingUp size={20} className="text-brand-primary" /> Subject Grades & Marks
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {examResults.map((res, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{res.exam_name}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{res.subject_name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--brand-primary)' }}>{res.marks_obtained} <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>/ 100</span></div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Marks Obtained</div>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '0.25rem 0.75rem', borderRadius: '0.5rem' }}>
                                    {res.grade}
                                </div>
                            </div>
                            {res.remarks && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                                    "{res.remarks}"
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Upcoming Examination Schedule */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <Calendar size={20} className="text-brand-secondary" /> Upcoming Examination Schedule
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {upcomingExams.map((exam, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>{exam.exam_name} — {exam.subject_name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    📅 {new Date(exam.exam_date).toLocaleDateString()} &nbsp;•&nbsp; 🕒 {exam.time_slot} &nbsp;•&nbsp; 📍 Room {exam.room_number}
                                </div>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--brand-primary)', background: 'rgba(99,102,241,0.1)', padding: '0.35rem 0.85rem', borderRadius: '999px' }}>
                                Max Marks: {exam.max_marks}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ParentResults;
