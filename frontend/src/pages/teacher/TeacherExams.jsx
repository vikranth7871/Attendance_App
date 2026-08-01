import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, Plus, Calendar, CheckCircle2, User, BookOpen, Send, Edit2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TeacherExams = () => {
    const [data, setData] = useState({ schedules: [], students: [], results: [] });
    const [loading, setLoading] = useState(true);
    const [showExamModal, setShowExamModal] = useState(false);
    const [showMarksModal, setShowMarksModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Exam Schedule Form State
    const [examName, setExamName] = useState('');
    const [examDate, setExamDate] = useState('');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('12:00');
    const [roomNumber, setRoomNumber] = useState('Lab 301');
    const [maxMarks, setMaxMarks] = useState(100);
    const [subjectId, setSubjectId] = useState('');
    const [subjects, setSubjects] = useState([]);

    const formatTimeRange = (start, end) => {
        if (!start || !end) return '10:00 AM - 12:00 PM';
        const formatSingle = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hour12 = h % 12 || 12;
            const minStr = String(m).padStart(2, '0');
            return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
        };
        return `${formatSingle(start)} - ${formatSingle(end)}`;
    };

    // Marks Entry Form State
    const [selectedScheduleId, setSelectedScheduleId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [marksObtained, setMarksObtained] = useState('');
    const [overrideGrade, setOverrideGrade] = useState('');
    const [remarks, setRemarks] = useState('');

    const calculateGradePreview = (m) => {
        if (m === '' || isNaN(m)) return { grade: '-', label: 'Enter marks to evaluate' };
        const score = parseFloat(m);
        if (score >= 90) return { grade: 'A+', label: 'Outstanding (90-100%)' };
        if (score >= 80) return { grade: 'A', label: 'Very Good (80-89%)' };
        if (score >= 70) return { grade: 'B', label: 'Good (70-79%)' };
        if (score >= 60) return { grade: 'C', label: 'Average (60-69%)' };
        if (score >= 50) return { grade: 'D', label: 'Pass (50-59%)' };
        return { grade: 'F', label: 'Needs Improvement (<50%)' };
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [examRes, subRes] = await Promise.all([
                axios.get('/teacher/exams'),
                axios.get('/teacher/subjects')
            ]);
            setData(examRes.data || { schedules: [], students: [], results: [] });
            setSubjects(subRes.data || []);
            if (subRes.data?.length > 0) {
                setSubjectId(subRes.data[0].subjectId?._id || subRes.data[0].subjectId?.id || 1);
            }
            if (examRes.data?.schedules?.length > 0) setSelectedScheduleId(examRes.data.schedules[0].id);
            if (examRes.data?.students?.length > 0) setSelectedStudentId(examRes.data.students[0].id);
        } catch (err) {
            console.error('Failed to fetch teacher exam data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateExam = async (e) => {
        e.preventDefault();
        if (!examName || !examDate) return;
        setSubmitting(true);
        try {
            const formattedTimeSlot = formatTimeRange(startTime, endTime);
            await axios.post('/teacher/exams', {
                examName,
                subjectId,
                examDate,
                timeSlot: formattedTimeSlot,
                roomNumber,
                maxMarks
            });
            setShowExamModal(false);
            setExamName('');
            setExamDate('');
            setRoomNumber('Lab 301');
            await fetchData();
        } catch (err) {
            console.error('Error creating exam schedule', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitMarks = async (e) => {
        e.preventDefault();
        if (!selectedStudentId || marksObtained === '') return;
        setSubmitting(true);
        try {
            const activeSchedule = schedules.find(s => String(s.id) === String(selectedScheduleId)) || schedules[0];
            await axios.post('/teacher/exams/marks', {
                examScheduleId: selectedScheduleId || activeSchedule?.id || 1,
                studentId: selectedStudentId,
                subjectId: activeSchedule?.subjectId || 1,
                marksObtained,
                grade: overrideGrade || undefined,
                remarks
            });
            setShowMarksModal(false);
            setMarksObtained('');
            setOverrideGrade('');
            setRemarks('');
            await fetchData();
        } catch (err) {
            console.error('Error publishing student marks', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading examination schedules and student marks...</div>;

    const { schedules, students, results } = data;

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
                console.error('Error parsing time slot:', e);
            }
        }
        return false;
    };

    const activeSchedules = schedules.filter(sc => !isExamExpired(sc.examDate, sc.timeSlot));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Award size={28} className="text-brand-primary" /> Examination & Marks Management
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Schedule examinations and input student grades. Results auto-sync to Student and Parent portals.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={() => setShowExamModal(true)}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: '700' }}
                    >
                        <Plus size={18} /> Schedule Exam
                    </button>

                    <button
                        onClick={() => setShowMarksModal(true)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: '700' }}
                    >
                        <Edit2 size={18} /> Enter Student Marks
                    </button>
                </div>
            </div>

            {/* Exam Schedules */}
            <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '1rem' }}>Scheduled Examinations</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {activeSchedules.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-secondary)' }}>No active upcoming exams scheduled. Click "Schedule Exam" to add one.</div>
                    ) : (
                        activeSchedules.map(sc => (
                            <div key={sc.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--brand-secondary)', textTransform: 'uppercase' }}>
                                    {sc.subjectName || 'Python'} • {sc.className || 'CS101-A'}
                                </div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{sc.examName}</h4>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span>📅 Date: {new Date(sc.examDate).toLocaleDateString()}</span>
                                    <span>⏰ Time: {sc.timeSlot || '10:00 AM - 12:00 PM'}</span>
                                    <span>📍 Venue: {sc.roomNumber || 'Lab 301'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Entered Results Roster */}
            <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '1rem' }}>Published Grades & Results</h3>
                <div className="glass-panel" style={{ padding: '1.25rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '0.75rem' }}>Student Name</th>
                                <th style={{ padding: '0.75rem' }}>Roll Number</th>
                                <th style={{ padding: '0.75rem' }}>Marks Obtained</th>
                                <th style={{ padding: '0.75rem' }}>Grade</th>
                                <th style={{ padding: '0.75rem' }}>Teacher Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No exam marks entered yet. Click "Enter Student Marks" above.</td>
                                </tr>
                            ) : (
                                results.map((res, i) => {
                                    const st = students.find(s => s.id === res.student_id);
                                    return (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{st?.name || `Student #${res.student_id}`}</td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{st?.rollNumber || 'CS202401'}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: '800', color: 'var(--brand-primary)' }}>{res.marks_obtained} / 100</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '0.4rem', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', fontWeight: '800' }}>
                                                    {res.grade}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{res.remarks || 'Good performance'}"</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Schedule Exam Modal */}
            <AnimatePresence>
                {showExamModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', width: '100%' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.25rem' }}>Schedule New Examination</h3>
                            <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Exam Name *</label>
                                    <input type="text" required value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Mid-Term Examination 2026" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }} />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Subject *</label>
                                    <select value={subjectId} onChange={e => setSubjectId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                                        {Array.from(
                                            new Map(
                                                subjects.map(s => {
                                                    const subId = s.subjectId?._id || s.subjectId?.id || s.id;
                                                    const subName = s.subjectId?.name || s.subjectId?.subjectName || s.name || 'Subject';
                                                    return [String(subId), { id: subId, name: subName }];
                                                })
                                            ).values()
                                        ).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Exam Date *</label>
                                    <input type="date" required value={examDate} onChange={e => setExamDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Start Time *</label>
                                        <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>End Time *</label>
                                        <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }} />
                                    </div>
                                </div>

                                {/* Formatted Time Slot Preview Card */}
                                <div style={{
                                    background: 'rgba(59,130,246,0.08)', padding: '0.65rem 1rem', borderRadius: '0.65rem',
                                    border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    fontSize: '0.82rem', fontWeight: '700', color: 'var(--brand-primary)'
                                }}>
                                    <span>Formatted Exam Slot:</span>
                                    <span>🕒 {formatTimeRange(startTime, endTime)}</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Venue / Room Number *</label>
                                        <input type="text" required value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="e.g. Lab 301 or Room C5-05" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Max Marks</label>
                                        <input type="number" min="10" max="1000" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} placeholder="100" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowExamModal(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Saving...' : 'Save Schedule'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Enter Marks Modal */}
            <AnimatePresence>
                {showMarksModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', width: '100%' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.25rem' }}>Input Student Exam Marks</h3>
                            <form onSubmit={handleSubmitMarks} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Select Examination & Subject *</label>
                                    <select value={selectedScheduleId} onChange={e => setSelectedScheduleId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                                        {schedules.map(sc => (
                                            <option key={sc.id} value={sc.id}>
                                                {sc.examName} — {sc.subjectName || 'Python'} ({sc.className || 'CS101-A'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Select Student *</label>
                                    <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                                        {students.map(st => (
                                            <option key={st.id} value={st.id}>{st.name} ({st.rollNumber})</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Marks Obtained (out of 100) *</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            required
                                            value={marksObtained}
                                            onChange={e => setMarksObtained(e.target.value)}
                                            placeholder="e.g. 92"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Grade Override (Optional)</label>
                                        <select
                                            value={overrideGrade}
                                            onChange={e => setOverrideGrade(e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }}
                                        >
                                            <option value="">Auto (Use Evaluated Grade)</option>
                                            <option value="A+">A+ (Outstanding)</option>
                                            <option value="A">A (Very Good)</option>
                                            <option value="B+">B+ (Good)</option>
                                            <option value="B">B (Above Average)</option>
                                            <option value="C">C (Average)</option>
                                            <option value="D">D (Pass)</option>
                                            <option value="F">F (Fail)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Real-time Live Grade Evaluation Card */}
                                {(() => {
                                    const preview = calculateGradePreview(marksObtained);
                                    const activeGrade = overrideGrade || preview.grade;
                                    return (
                                        <div style={{
                                            background: 'rgba(139,92,246,0.08)', padding: '0.85rem 1.25rem', borderRadius: '0.75rem',
                                            border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                                    Evaluated Grade Breakdown
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '600', marginTop: '0.1rem' }}>
                                                    {overrideGrade ? `Manual Override Active: ${overrideGrade}` : preview.label}
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '0.35rem 0.85rem', borderRadius: '0.6rem', background: 'var(--brand-primary)',
                                                color: 'white', fontWeight: '900', fontSize: '1.25rem'
                                            }}>
                                                {activeGrade}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Teacher Remarks</label>
                                    <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Excellent conceptual understanding" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowMarksModal(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Publishing...' : 'Publish Grade'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherExams;
