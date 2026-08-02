import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, Calendar, Clock, MapPin, Edit2, Plus, FileText, CheckCircle2, UserCheck, Search, ArrowUpDown, X, Send, Check, Filter, Trash2, Tag, Users, BarChart3, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Excel-Style Bulk Class Marks Entry Modal ---
const BulkClassMarksModal = ({ schedules, students, results, onClose, onRefresh }) => {
    const [selectedScheduleId, setSelectedScheduleId] = useState(schedules[0]?.id || '');
    const [marksTableData, setMarksTableData] = useState([]);
    const [initialTableData, setInitialTableData] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const currentSchedule = schedules.find(sc => String(sc.id) === String(selectedScheduleId)) || schedules[0];

    useEffect(() => {
        if (!currentSchedule) return;

        const initialRows = students.map(st => {
            const existingResult = results.find(r => String(r.exam_schedule_id) === String(currentSchedule.id) && String(r.student_id) === String(st.id));

            return {
                studentId: st.id,
                studentName: st.name,
                rollNumber: st.rollNumber,
                marksObtained: existingResult?.marks_obtained !== undefined ? String(existingResult.marks_obtained) : '',
                overrideGrade: existingResult?.grade || '',
                remarks: existingResult?.remarks || ''
            };
        });

        setMarksTableData(initialRows);
        setInitialTableData(JSON.parse(JSON.stringify(initialRows)));
    }, [selectedScheduleId, students, results]);

    const isDirty = JSON.stringify(marksTableData) !== JSON.stringify(initialTableData);

    const calculateAutoGrade = (marks) => {
        if (marks === '' || marks === undefined || isNaN(marks)) return '—';
        const m = parseFloat(marks);
        if (m >= 90) return 'A+';
        if (m >= 80) return 'A';
        if (m >= 70) return 'B';
        if (m >= 60) return 'C';
        if (m >= 50) return 'D';
        return 'F';
    };

    const handleRowChange = (index, field, value) => {
        const updated = [...marksTableData];
        updated[index][field] = value;
        setMarksTableData(updated);
    };

    const handlePublishAll = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);
        try {
            const marksData = marksTableData
                .filter(row => row.marksObtained !== '')
                .map(row => ({
                    studentId: row.studentId,
                    marksObtained: row.marksObtained,
                    grade: row.overrideGrade || calculateAutoGrade(row.marksObtained),
                    remarks: row.remarks
                }));

            if (marksData.length === 0) {
                setFeedback({ type: 'error', message: 'Please enter marks for at least one student.' });
                setSubmitting(false);
                return;
            }

            await axios.post('/teacher/exams/marks-bulk', {
                examScheduleId: currentSchedule.id,
                subjectId: currentSchedule.subjectId,
                marksData
            });

            setFeedback({ type: 'success', message: `Successfully published marks for ${marksData.length} students!` });
            await onRefresh();
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err) {
            console.error('Error publishing bulk marks', err);
            setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to publish marks.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1.5rem'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.92, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-panel"
                style={{
                    padding: '2rem', maxWidth: '920px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
                    border: '1px solid var(--border-color)', position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.6, color: 'var(--text-primary)' }}>
                    <X size={24} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--brand-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Whole-Class Mark Entry & Edit
                    </span>
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                    Input & Publish Student Exam Marks
                </h2>

                {/* Exam Schedule Selector & Metadata Banner */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                            Select Examination & Subject *
                        </label>
                        <select
                            value={selectedScheduleId}
                            onChange={e => setSelectedScheduleId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', fontWeight: '700' }}
                        >
                            {schedules.map(sc => (
                                <option key={sc.id} value={sc.id}>
                                    📚 {sc.examName} — {sc.subjectName || 'Subject'} ({sc.className || 'Class'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {currentSchedule && (
                        <div style={{ background: 'rgba(91, 80, 230, 0.08)', padding: '0.85rem 1.2rem', borderRadius: '0.75rem', border: '1px solid rgba(91, 80, 230, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    Exam Details
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--brand-primary)', marginTop: '0.2rem' }}>
                                    {currentSchedule.subjectName} • Max Marks: {currentSchedule.maxMarks || 100}
                                </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><MapPin size={13} /> {currentSchedule.roomNumber || 'Room 301'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={13} /> {new Date(currentSchedule.examDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    )}
                </div>

                {feedback && (
                    <div style={{
                        padding: '0.85rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.25rem', fontWeight: '700', fontSize: '0.9rem',
                        background: feedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${feedback.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                    }}>
                        {feedback.message}
                    </div>
                )}

                {/* Interactive Excel Sheet Table */}
                <form onSubmit={handlePublishAll}>
                    <div style={{ width: '100%', overflowX: 'auto', marginBottom: '1.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>#</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Student Name</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Roll No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '800', width: '150px' }}>Marks (/100)</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Auto Grade</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '800', width: '140px' }}>Override Grade</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {marksTableData.map((row, idx) => {
                                    const autoGrade = calculateAutoGrade(row.marksObtained);

                                    return (
                                        <tr key={row.studentId} style={{ background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{idx + 1}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{row.studentName}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{row.rollNumber || '—'}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="e.g. 85"
                                                    value={row.marksObtained}
                                                    onChange={e => handleRowChange(idx, 'marksObtained', e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                                                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontWeight: '800', fontSize: '0.9rem', outline: 'none'
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{
                                                    padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontWeight: '900', fontSize: '0.9rem',
                                                    background: autoGrade !== '—' ? 'rgba(91, 80, 230, 0.15)' : 'transparent',
                                                    color: autoGrade === 'A+' || autoGrade === 'A' ? 'var(--success)' : autoGrade === 'F' ? 'var(--danger)' : 'var(--brand-primary)'
                                                }}>
                                                    {autoGrade}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <select
                                                    value={row.overrideGrade}
                                                    onChange={e => handleRowChange(idx, 'overrideGrade', e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '0.5rem 0.5rem', borderRadius: '0.5rem',
                                                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.8rem', outline: 'none'
                                                    }}
                                                >
                                                    <option value="">Auto ({autoGrade})</option>
                                                    <option value="A+">A+ (Outstanding)</option>
                                                    <option value="A">A (Very Good)</option>
                                                    <option value="B+">B+ (Good)</option>
                                                    <option value="B">B (Average)</option>
                                                    <option value="C">C (Pass)</option>
                                                    <option value="D">D (Borderline)</option>
                                                    <option value="F">F (Fail)</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Optional remarks..."
                                                    value={row.remarks}
                                                    onChange={e => handleRowChange(idx, 'remarks', e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                                                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none'
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0.75rem 1.35rem', borderRadius: '0.75rem' }}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isDirty || submitting}
                            className="btn btn-primary"
                            style={{
                                padding: '0.75rem 1.6rem',
                                borderRadius: '0.75rem',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: (!isDirty || submitting) ? 0.5 : 1,
                                cursor: (!isDirty || submitting) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Send size={16} /> {submitting ? 'Publishing All Marks...' : 'Publish All Student Marks'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

const TeacherExams = () => {
    const [data, setData] = useState({ schedules: [], students: [], results: [] });
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showExamModal, setShowExamModal] = useState(false);
    const [showMarksModal, setShowMarksModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingExamId, setEditingExamId] = useState(null);

    // Exam Filter state
    const [selectedExamFilter, setSelectedExamFilter] = useState('all');
    const [selectedScheduleTermFilter, setSelectedScheduleTermFilter] = useState('all');

    // Schedule Form states
    const scheduleTerms = (data?.schedules || []).map(sc => sc.term).filter(Boolean);
    const allUniqueTerms = Array.from(new Set(scheduleTerms));

    const [term, setTerm] = useState(allUniqueTerms[0] || '');
    const [isCustomTerm, setIsCustomTerm] = useState(allUniqueTerms.length === 0);
    const [customTermInput, setCustomTermInput] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [examDate, setExamDate] = useState('');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('12:00');
    const [roomNumber, setRoomNumber] = useState('Lab 301');
    const [maxMarks, setMaxMarks] = useState(100);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [examsRes, subRes] = await Promise.all([
                axios.get('/teacher/exams'),
                axios.get('/teacher/subjects')
            ]);
            setData(examsRes.data || { schedules: [], students: [], results: [] });
            setSubjects(subRes.data || []);
            if (subRes.data && subRes.data.length > 0) {
                setSubjectId(subRes.data[0].subjectId?._id || subRes.data[0].subjectId?.id || subRes.data[0].id || 1);
            }
        } catch (err) {
            console.error('Failed to fetch exam management data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatTime12H = (time24) => {
        if (!time24) return '';
        const [h, m] = time24.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m < 10 ? '0' + m : m} ${ampm}`;
    };

    const convertTo24H = (time12) => {
        if (!time12) return '10:00';
        const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return '10:00';
        let [_, h, m, ampm] = match;
        let hours = parseInt(h, 10);
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return `${hours < 10 ? '0' + hours : hours}:${m}`;
    };

    const formatTimeRange = (start, end) => {
        if (!start || !end) return '';
        return `${formatTime12H(start)} - ${formatTime12H(end)}`;
    };

    const handleOpenNewModal = () => {
        setEditingExamId(null);
        setIsCustomTerm(allUniqueTerms.length === 0);
        if (allUniqueTerms.length > 0) setTerm(allUniqueTerms[0]);
        setCustomTermInput('');
        setExamDate('');
        setStartTime('10:00');
        setEndTime('12:00');
        setRoomNumber('Lab 301');
        setMaxMarks(100);
        setShowExamModal(true);
    };

    const handleOpenEditModal = (sc) => {
        setEditingExamId(sc.id);
        setTerm(sc.term || sc.examName);
        setSubjectId(sc.subjectId || 1);
        setExamDate(sc.examDate ? new Date(sc.examDate).toISOString().split('T')[0] : '');
        setRoomNumber(sc.roomNumber || 'Lab 301');
        setMaxMarks(sc.maxMarks || 100);

        if (sc.timeSlot && sc.timeSlot.includes('-')) {
            const [s, e] = sc.timeSlot.split('-').map(t => t.trim());
            setStartTime(convertTo24H(s));
            setEndTime(convertTo24H(e));
        } else {
            setStartTime('10:00');
            setEndTime('12:00');
        }
        setIsCustomTerm(false);
        setCustomTermInput('');
        setShowExamModal(true);
    };

    const handleDeleteExam = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? All associated student marks will also be deleted.`)) return;
        try {
            await axios.delete(`/teacher/exams/${id}`);
            await fetchData();
        } catch (err) {
            console.error('Error deleting exam schedule', err);
            alert('Failed to delete exam schedule');
        }
    };

    const handleCreateExam = async (e) => {
        e.preventDefault();
        if (!examDate || !startTime || !endTime) return;

        const finalExamName = (isCustomTerm || allUniqueTerms.length === 0) ? customTermInput.trim() : term;
        if (!finalExamName) {
            alert('Please specify an Examination Name / Term');
            return;
        }

        setSubmitting(true);
        try {
            const formattedSlot = formatTimeRange(startTime, endTime);
            const payload = {
                term: finalExamName,
                examName: finalExamName,
                subjectId,
                examDate,
                timeSlot: formattedSlot,
                roomNumber,
                maxMarks: parseInt(maxMarks, 10) || 100
            };

            if (editingExamId) {
                await axios.put(`/teacher/exams/${editingExamId}`, payload);
            } else {
                await axios.post('/teacher/exams', payload);
            }

            setShowExamModal(false);
            setEditingExamId(null);
            setExamDate('');
            setTerm(finalExamName);
            setIsCustomTerm(false);
            setCustomTermInput('');
            await fetchData();
        } catch (err) {
            console.error('Error saving exam schedule', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading examination schedules and student marks...</div>;

    const { schedules, students, results } = data;

    const isExamExpired = (examDateStr, timeSlotStr) => {
        if (!examDateStr) return false;
        const examDateObj = new Date(examDateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const examDay = new Date(examDateObj.getFullYear(), examDateObj.getMonth(), examDateObj.getDate());

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

    const activeSchedules = [...schedules]
        .filter(sc => !isExamExpired(sc.examDate, sc.timeSlot))
        .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

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
                        onClick={handleOpenNewModal}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: '700' }}
                    >
                        <Plus size={18} /> Schedule Exam
                    </button>

                    {schedules.length > 0 && (
                        <button
                            onClick={() => setShowMarksModal(true)}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: '700' }}
                        >
                            <Edit2 size={18} /> Mark Entry & Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Scheduled Examinations Section with Term Filter */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Scheduled Examinations</h3>

                    {/* Term Filter Pills */}
                    {allUniqueTerms.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                onClick={() => setSelectedScheduleTermFilter('all')}
                                style={{
                                    padding: '0.4rem 0.9rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: '800',
                                    border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                                    borderColor: selectedScheduleTermFilter === 'all' ? 'var(--brand-primary)' : 'var(--border-color)',
                                    background: selectedScheduleTermFilter === 'all' ? 'rgba(91, 80, 230, 0.15)' : 'var(--bg-secondary)',
                                    color: selectedScheduleTermFilter === 'all' ? 'var(--brand-primary)' : 'var(--text-secondary)'
                                }}
                            >
                                All Exams ({activeSchedules.length})
                            </button>
                            {allUniqueTerms.map(termName => {
                                const count = activeSchedules.filter(sc => (sc.term || sc.examName) === termName).length;
                                if (count === 0) return null;
                                const isSelected = selectedScheduleTermFilter === termName;
                                return (
                                    <button
                                        key={termName}
                                        onClick={() => setSelectedScheduleTermFilter(termName)}
                                        style={{
                                            padding: '0.4rem 0.9rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: '800',
                                            border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                                            borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-color)',
                                            background: isSelected ? 'rgba(91, 80, 230, 0.15)' : 'var(--bg-secondary)',
                                            color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                            display: 'flex', alignItems: 'center', gap: '0.35rem'
                                        }}
                                    >
                                        <Tag size={12} /> {termName} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {activeSchedules.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No active upcoming exams scheduled. Click "Schedule Exam" to add one.
                    </div>
                ) : (
                    (() => {
                        const filteredSchedules = activeSchedules.filter(sc =>
                            selectedScheduleTermFilter === 'all' || (sc.term || sc.examName) === selectedScheduleTermFilter
                        );

                        if (filteredSchedules.length === 0) {
                            return (
                                <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No examinations found for the selected term filter.
                                </div>
                            );
                        }

                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                {filteredSchedules.map(sc => (
                                    <div key={sc.id} className="glass-panel" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRadius: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--brand-secondary)', textTransform: 'uppercase', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {sc.subjectName || 'Subject'} • {sc.className || 'Class'}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--brand-primary)', background: 'rgba(91, 80, 230, 0.12)', padding: '0.2rem 0.55rem', borderRadius: '0.5rem', border: '1px solid rgba(91, 80, 230, 0.25)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Tag size={11} /> {sc.term || sc.examName}
                                                </span>

                                                {/* Compact Edit Icon Button */}
                                                <button
                                                    onClick={() => handleOpenEditModal(sc)}
                                                    title="Edit Examination Schedule"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        width: '28px', height: '28px', borderRadius: '0.5rem',
                                                        background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
                                                        border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Edit2 size={13} />
                                                </button>

                                                {/* Compact Delete Icon Button */}
                                                <button
                                                    onClick={() => handleDeleteExam(sc.id, sc.examName)}
                                                    title="Delete Examination Schedule"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        width: '28px', height: '28px', borderRadius: '0.5rem',
                                                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                                        border: '1px solid rgba(239, 68, 68, 0.25)', cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{sc.examName}</h4>

                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={14} className="text-brand-primary" /> {new Date(sc.examDate).toLocaleDateString()}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={14} className="text-brand-primary" /> {sc.timeSlot}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><MapPin size={14} className="text-brand-primary" /> {sc.roomNumber}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Award size={14} className="text-brand-primary" /> Max: {sc.maxMarks || 100}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()
                )}
            </div>

            {/* Published Marks Overview Table */}
            <div>
                {/* Header Control Bar with Exam Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Award size={20} className="text-brand-primary" /> Published Student Marks
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            Filter student scores and grades by examination
                        </p>
                    </div>

                    {/* Exam-Wise Selector Dropdown */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'var(--bg-secondary)', padding: '0.5rem 0.9rem',
                        borderRadius: '0.85rem', border: '1px solid var(--border-color)'
                    }}>
                        <Filter size={16} style={{ color: 'var(--brand-primary)' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)' }}>Exam:</span>
                        <select
                            value={selectedExamFilter}
                            onChange={e => setSelectedExamFilter(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontWeight: '800',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all" style={{ background: 'var(--bg-primary)' }}>All Examinations ({results.length})</option>
                            {schedules.map(sc => {
                                const count = results.filter(r => String(r.exam_schedule_id) === String(sc.id)).length;
                                return (
                                    <option key={sc.id} value={sc.id} style={{ background: 'var(--bg-primary)' }}>
                                        {sc.examName} — {sc.subjectName || 'Subject'} ({count} graded)
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                {/* Exam Analytics Banner (shown when a specific exam is selected) */}
                {(() => {
                    const filteredResults = selectedExamFilter === 'all'
                        ? results
                        : results.filter(r => String(r.exam_schedule_id) === String(selectedExamFilter));

                    const currentExam = schedules.find(e => String(e.id) === String(selectedExamFilter));

                    if (selectedExamFilter !== 'all' && currentExam) {
                        const totalMarks = filteredResults.reduce((acc, r) => acc + (parseFloat(r.marks_obtained) || 0), 0);
                        const avgMarks = filteredResults.length > 0 ? (totalMarks / filteredResults.length).toFixed(1) : 0;
                        const highestMarks = filteredResults.length > 0 ? Math.max(...filteredResults.map(r => parseFloat(r.marks_obtained) || 0)) : 0;

                        return (
                            <div style={{
                                background: 'rgba(91, 80, 230, 0.08)', padding: '1rem 1.4rem', borderRadius: '1rem',
                                border: '1px solid rgba(91, 80, 230, 0.25)', marginBottom: '1.25rem',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                            }}>
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--brand-secondary)', textTransform: 'uppercase' }}>
                                        Exam Performance Summary
                                    </span>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                                        {currentExam.examName} ({currentExam.subjectName})
                                    </h4>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700' }}>TOTAL GRADED</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--brand-primary)' }}>{filteredResults.length} Students</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700' }}>CLASS AVERAGE</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--success)' }}>{avgMarks} / 100</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700' }}>HIGHEST MARKS</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--brand-secondary)' }}>{highestMarks} / 100</div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Table */}
                <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.75rem' }}>Exam Name</th>
                                <th style={{ padding: '0.75rem' }}>Student Name</th>
                                <th style={{ padding: '0.75rem' }}>Roll No</th>
                                <th style={{ padding: '0.75rem' }}>Marks</th>
                                <th style={{ padding: '0.75rem' }}>Grade</th>
                                <th style={{ padding: '0.75rem' }}>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const filteredResults = selectedExamFilter === 'all'
                                    ? results
                                    : results.filter(r => String(r.exam_schedule_id) === String(selectedExamFilter));

                                if (filteredResults.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                                                {selectedExamFilter === 'all'
                                                    ? 'No exam marks entered yet. Click "Mark Entry & Edit" above to input student marks.'
                                                    : 'No published marks found for this specific examination.'}
                                            </td>
                                        </tr>
                                    );
                                }

                                return filteredResults.map((res) => {
                                    const st = students.find(s => String(s.id) === String(res.student_id));
                                    const exam = schedules.find(e => String(e.id) === String(res.exam_schedule_id));
                                    return (
                                        <tr key={res.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: '700', color: 'var(--brand-secondary)' }}>
                                                {exam?.examName || 'Exam'}
                                            </td>
                                            <td style={{ padding: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{st?.name || `Student #${res.student_id}`}</td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{st?.rollNumber || '—'}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: '800', color: 'var(--brand-primary)' }}>{res.marks_obtained} / 100</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '0.4rem', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', fontWeight: '800' }}>
                                                    {res.grade}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{res.remarks || 'Good performance'}"</td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Schedule Exam Modal */}
            <AnimatePresence>
                {showExamModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', width: '100%' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.25rem' }}>{editingExamId ? 'Edit Examination Schedule' : 'Schedule New Examination'}</h3>
                            <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Examination Name / Term *</label>
                                    {allUniqueTerms.length > 0 && !isCustomTerm ? (
                                        <select
                                            value={term}
                                            onChange={e => {
                                                if (e.target.value === '__custom__') {
                                                    setIsCustomTerm(true);
                                                    setCustomTermInput('');
                                                } else {
                                                    setTerm(e.target.value);
                                                }
                                            }}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: '0.25rem', fontWeight: '700', outline: 'none' }}
                                        >
                                            {allUniqueTerms.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                            <option value="__custom__">+ Create New Examination / Term...</option>
                                        </select>
                                    ) : (
                                        <div style={{ marginTop: '0.25rem' }}>
                                            <input
                                                type="text"
                                                required
                                                value={customTermInput}
                                                onChange={e => setCustomTermInput(e.target.value)}
                                                placeholder="Enter Examination Name (e.g. Mid-Term 2026, CIA 1, Semester 1)"
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: '700', outline: 'none' }}
                                            />
                                            {allUniqueTerms.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsCustomTerm(false); if (allUniqueTerms.length > 0) setTerm(allUniqueTerms[0]); }}
                                                    style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '0.35rem', fontWeight: '700' }}
                                                >
                                                    ← Choose existing examination ({allUniqueTerms.join(', ')})
                                                </button>
                                            )}
                                        </div>
                                    )}
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

                                <div style={{
                                    background: 'rgba(59,130,246,0.08)', padding: '0.65rem 1rem', borderRadius: '0.65rem',
                                    border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    fontSize: '0.82rem', fontWeight: '700', color: 'var(--brand-primary)'
                                }}>
                                    <span>Formatted Exam Slot:</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={14} /> {formatTimeRange(startTime, endTime)}</span>
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
                                    <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Saving...' : editingExamId ? 'Update Schedule' : 'Save Schedule'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Excel Sheet Marks Entry Modal */}
            <AnimatePresence>
                {showMarksModal && (
                    <BulkClassMarksModal
                        schedules={schedules}
                        students={students}
                        results={results}
                        onClose={() => setShowMarksModal(false)}
                        onRefresh={fetchData}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherExams;
