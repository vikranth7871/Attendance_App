import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, UserCheck, Plus, Check, Calendar, Clock, MapPin, Building2, ChevronRight, LayoutGrid, X } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM',
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM',
    '03:00 PM - 04:00 PM'
];

const Assignments = () => {
    const [activeTab, setActiveTab] = useState('subject'); // 'subject' or 'coordinator'

    // Data states
    const [departments, setDepartments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [bookedFacultySlots, setBookedFacultySlots] = useState([]);
    const [coordinators, setCoordinators] = useState([]);

    // Coordinator Filter states
    const [coordFilterDept, setCoordFilterDept] = useState('');
    const [coordFilterClass, setCoordFilterClass] = useState('');
    const [coordSearch, setCoordSearch] = useState('');

    // Form states
    const [subjectForm, setSubjectForm] = useState({ departmentId: '', classId: '', teacherId: '', subjectId: '', timeSlot: '', roomNumber: '', dayOfWeek: '', startTime: '', endTime: '' });
    const [coordinatorForm, setCoordinatorForm] = useState({ departmentId: '', classId: '', teacherId: '' });

    // UI states
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [fetchError, setFetchError] = useState('');

    const [activeDay, setActiveDay] = useState('Monday');
    const [selectedSlots, setSelectedSlots] = useState([]); // Array of { dayOfWeek, timeSlot, startTime, endTime }

    // Fetch existing allocations when teacherId changes to highlight booked slots
    useEffect(() => {
        if (!subjectForm.classId && !subjectForm.teacherId) {
            setBookedFacultySlots([]);
            return;
        }
        axios.get(`/admin/timetable-conflicts?classId=${subjectForm.classId || ''}&teacherId=${subjectForm.teacherId || ''}`)
            .then(res => setBookedFacultySlots(res.data || []))
            .catch(() => setBookedFacultySlots([]));
    }, [subjectForm.classId, subjectForm.teacherId]);

    const getFacultyBooking = (day, time) => {
        if (!bookedFacultySlots.length) return null;
        const matchingAlloc = bookedFacultySlots.find(alloc => {
            const matchDay = (alloc.day_of_week || '').toLowerCase().trim() === (day || '').toLowerCase().trim();
            if (!matchDay) return false;

            const targetTime = time.trim().toLowerCase();
            const allocTimeSlot = (alloc.time_slot || '').trim().toLowerCase();
            const allocStartTime = (alloc.start_time || '').trim().toLowerCase();
            const allocEndTime = (alloc.end_time || '').trim().toLowerCase();

            // 1. Exact match on time_slot string (e.g. "10:00 am - 11:00 am")
            if (allocTimeSlot && allocTimeSlot === targetTime) return true;

            // 2. Exact match on start_time and end_time formatted as "start - end"
            if (allocStartTime && allocEndTime) {
                const formattedAlloc = `${allocStartTime} - ${allocEndTime}`;
                if (formattedAlloc === targetTime) return true;
            }

            // 3. Exact match on start_time alone matching target start time
            if (allocStartTime) {
                const targetStart = targetTime.split('-')[0].trim();
                if (allocStartTime === targetStart) return true;
            }

            return false;
        });

        if (!matchingAlloc) return null;

        const isClassConflict = String(matchingAlloc.class_id) === String(subjectForm.classId);
        const isTeacherConflict = String(matchingAlloc.teacher_id) === String(subjectForm.teacherId);

        let conflictType = 'class';
        if (isClassConflict && isTeacherConflict) conflictType = 'both';
        else if (isTeacherConflict) conflictType = 'teacher';

        return {
            ...matchingAlloc,
            conflictType
        };
    };

    const isSlotSelected = (day, time) => {
        return selectedSlots.some(s => s.dayOfWeek === day && s.timeSlot === time);
    };

    const toggleSlot = (day, time) => {
        if (!day) return;
        const booking = getFacultyBooking(day, time);
        if (booking) {
            let conflictMsg = '';
            if (booking.conflictType === 'class') {
                conflictMsg = `⚠️ Class Slot Occupied: This class already has ${booking.subject_name || 'a subject'} (${booking.teacher_name || 'Faculty'}) scheduled on ${day} (${time}).`;
            } else if (booking.conflictType === 'teacher') {
                conflictMsg = `⚠️ Faculty Conflict: ${booking.teacher_name || 'Selected Faculty'} is already teaching ${booking.subject_name || 'Subject'} (${booking.class_name || 'Class'}) on ${day} (${time}).`;
            } else {
                conflictMsg = `⚠️ Already Assigned: ${booking.subject_name || 'Subject'} is already allocated for ${day} (${time}).`;
            }
            setMessage({ type: 'error', text: conflictMsg });
            return;
        }

        const parts = time.split(' - ');
        const startTime = parts[0];
        const endTime = parts[1];

        setSelectedSlots(prev => {
            const exists = prev.some(s => s.dayOfWeek === day && s.timeSlot === time);
            if (exists) {
                return prev.filter(s => !(s.dayOfWeek === day && s.timeSlot === time));
            } else {
                return [...prev, { dayOfWeek: day, timeSlot: time, startTime, endTime }];
            }
        });
    };

    const toggleAllSlotsForActiveDay = () => {
        const allSelected = TIMES.every(t => isSlotSelected(activeDay, t));
        setSelectedSlots(prev => {
            if (allSelected) {
                return prev.filter(s => s.dayOfWeek !== activeDay);
            } else {
                const filtered = prev.filter(s => s.dayOfWeek !== activeDay);
                TIMES.forEach(t => {
                    const parts = t.split(' - ');
                    filtered.push({ dayOfWeek: activeDay, timeSlot: t, startTime: parts[0], endTime: parts[1] });
                });
                return filtered;
            }
        });
    };

    const applyActiveDayToAllDays = () => {
        const activeDaySlots = selectedSlots.filter(s => s.dayOfWeek === activeDay);
        if (activeDaySlots.length === 0) return;

        setSelectedSlots(prev => {
            const newSlots = [];
            DAYS.forEach(day => {
                activeDaySlots.forEach(slot => {
                    newSlots.push({
                        ...slot,
                        dayOfWeek: day
                    });
                });
            });
            return newSlots;
        });
    };

    const removeSlot = (day, time) => {
        setSelectedSlots(prev => prev.filter(s => !(s.dayOfWeek === day && s.timeSlot === time)));
    };

    useEffect(() => {
        fetchInitialData();
        fetchCoordinators();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [deptRes, teacherRes, subjectRes] = await Promise.all([
                axios.get('/admin/departments'),
                axios.get('/admin/teachers'),
                axios.get('/admin/subjects')
            ]);
            setDepartments(deptRes.data);
            setTeachers(teacherRes.data);
            setSubjects(subjectRes.data);
        } catch (error) {
            console.error("Failed to fetch initial data", error);
            setFetchError(error.response?.data?.message || error.message || "Failed to load data");
        }
    };

    const fetchCoordinators = async () => {
        try {
            const res = await axios.get('/admin/coordinators');
            setCoordinators(res.data || []);
        } catch (error) {
            console.error("Failed to fetch coordinators", error);
        }
    };

    // Fetch classes when department changes
    useEffect(() => {
        const fetchClasses = async (deptId) => {
            if (!deptId) return setClasses([]);
            try {
                const res = await axios.get(`/admin/classes?departmentId=${deptId}`);
                setClasses(res.data);
            } catch (error) {
                console.error("Failed to fetch classes", error);
            }
        };

        const activeDeptId = activeTab === 'subject' ? subjectForm.departmentId : coordinatorForm.departmentId;
        fetchClasses(activeDeptId);
    }, [subjectForm.departmentId, coordinatorForm.departmentId, activeTab]);

    const handleSubjectSubmit = async (e) => {
        e.preventDefault();
        if (selectedSlots.length === 0) {
            return setMessage({ type: 'error', text: 'Please select at least one schedule time slot.' });
        }
        setLoading(true);
        setMessage({ type: '', text: '' });

        const payload = {
            ...subjectForm,
            slots: selectedSlots
        };

        try {
            await axios.post('/admin/assign-subject', payload);
            setMessage({ type: 'success', text: `Successfully assigned subject for ${selectedSlots.length} schedule slot(s)!` });
            setSubjectForm(prev => ({ ...prev, subjectId: '', teacherId: '', roomNumber: '' }));
            setSelectedSlots([]);
            if (subjectForm.classId || subjectForm.teacherId) {
                const conflictRes = await axios.get(`/admin/timetable-conflicts?classId=${subjectForm.classId || ''}&teacherId=${subjectForm.teacherId || ''}`);
                setBookedFacultySlots(conflictRes.data || []);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to assign subject' });
        } finally {
            setLoading(false);
        }
    };

    const handleCoordinatorSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await axios.post('/admin/assign-class-coordinator', coordinatorForm);
            setMessage({ type: 'success', text: 'Class Coordinator appointed successfully!' });
            setCoordinatorForm({ ...coordinatorForm, teacherId: '' });
            fetchCoordinators();
            fetchInitialData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to appoint coordinator' });
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeCoordinator = async (teacherId, teacherName, className) => {
        if (!window.confirm(`Are you sure you want to revoke ${teacherName} as Class Coordinator for ${className}?`)) return;
        setLoading(true);
        try {
            await axios.post('/admin/revoke-class-coordinator', { teacherId });
            setMessage({ type: 'success', text: `Successfully revoked ${teacherName}'s coordinator status for ${className}.` });
            fetchCoordinators();
            fetchInitialData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to revoke coordinator' });
        } finally {
            setLoading(false);
        }
    };

    const filteredCoordinators = coordinators.filter(c => {
        const matchSearch = !coordSearch || 
            (c.teacher_name || '').toLowerCase().includes(coordSearch.toLowerCase()) ||
            (c.teacher_email || '').toLowerCase().includes(coordSearch.toLowerCase()) ||
            (c.class_name || '').toLowerCase().includes(coordSearch.toLowerCase());
        
        const matchDept = !coordFilterDept || String(c.department_id) === String(coordFilterDept);
        const matchClass = !coordFilterClass || String(c.class_id) === String(coordFilterClass);

        return matchSearch && matchDept && matchClass;
    });

    return (
        <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>

            {/* Header */}
            <header style={{ marginBottom: '3rem', position: 'relative' }}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ position: 'relative', zIndex: 1 }}
                >
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Academic <span style={{ color: 'var(--brand-primary)' }}>Assignments</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', lineHeight: '1.6' }}>
                        Architect your institution's schedule by seamlessly allocating subjects to faculty and classes.
                    </p>
                </motion.div>

                {/* Decorative background glow */}
                <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '200px', height: '200px', background: 'var(--brand-primary)', filter: 'blur(100px)', opacity: 0.1, pointerEvents: 'none' }} />
            </header>

            {/* Navigation Pill */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                background: 'var(--bg-secondary)',
                padding: '0.4rem',
                borderRadius: '1rem',
                border: '1px solid var(--border-color)',
                marginBottom: '3rem',
                position: 'relative'
            }}>
                {[
                    { id: 'subject', label: 'Assign Subjects', icon: <BookOpen size={18} /> },
                    { id: 'coordinator', label: 'Appoint Coordinators', icon: <UserCheck size={18} /> }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setMessage({ type: '', text: '' }); }}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: 12,
                            border: 'none',
                            background: 'transparent',
                            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            position: 'relative',
                            zIndex: 1,
                            transition: 'color 0.3s'
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                    borderRadius: 12,
                                    zIndex: -1,
                                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                                }}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {fetchError && (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '0.5rem', marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {fetchError}
                </div>
            )}

            {/* Notification */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        key="notification"
                        initial={{ opacity: 0, scale: 0.9, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        style={{
                            padding: '1.2rem 1.5rem',
                            marginBottom: '2rem',
                            borderRadius: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: message.type === 'success' ? '#10b981' : '#ef4444',
                            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            backdropFilter: 'blur(10px)',
                            fontWeight: '600',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        <div style={{
                            background: message.type === 'success' ? '#10b981' : '#ef4444',
                            color: 'white',
                            borderRadius: '50%',
                            padding: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
                        </div>
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div style={{ position: 'relative' }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'subject' ? (
                        <motion.div
                            key="subject-form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="glass-panel"
                            style={{
                                padding: '2.5rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
                            }}
                        >
                            <form onSubmit={handleSubjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                                {/* Section 1: Basic Info */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                                    <FormGroup label="Department" icon={<Building2 size={16} />}>
                                        <select
                                            className="form-input" required
                                            value={subjectForm.departmentId}
                                            onChange={(e) => setSubjectForm({ ...subjectForm, departmentId: e.target.value, classId: '' })}
                                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '0.8rem 1rem' }}
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                                        </select>
                                    </FormGroup>

                                    <FormGroup label="Class & Section" icon={<LayoutGrid size={16} />}>
                                        <select
                                            className="form-input" required disabled={!subjectForm.departmentId}
                                            value={subjectForm.classId}
                                            onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value })}
                                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '0.8rem 1rem' }}
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map(c => <option key={c._id} value={c._id}>{c.className}</option>)}
                                        </select>
                                    </FormGroup>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                                    <FormGroup label="Subject Name" icon={<BookOpen size={16} />}>
                                        <select
                                            className="form-input" required disabled={!subjectForm.departmentId}
                                            value={subjectForm.subjectId}
                                            onChange={(e) => setSubjectForm({ ...subjectForm, subjectId: e.target.value })}
                                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '0.8rem 1rem' }}
                                        >
                                            <option value="">Select Subject</option>
                                            {subjects.filter(s => s.departmentId === subjectForm.departmentId || s.departmentId?._id === subjectForm.departmentId).map(s => (
                                                <option key={s._id} value={s._id}>{s.subjectName}</option>
                                            ))}
                                        </select>
                                    </FormGroup>
                                    <FormGroup label="Room No." icon={<MapPin size={16} />}>
                                        <input
                                            type="text" className="form-input" placeholder="e.g. Hall 402"
                                            value={subjectForm.roomNumber}
                                            onChange={(e) => setSubjectForm({ ...subjectForm, roomNumber: e.target.value })}
                                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '0.8rem 1rem' }}
                                        />
                                    </FormGroup>
                                </div>

                                {/* Section 2: Teacher Assignment */}
                                <FormGroup label="Faculty Assignment" icon={<UserCheck size={16} />}>
                                    <select
                                        className="form-input" required
                                        value={subjectForm.teacherId}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
                                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '0.8rem 1rem' }}
                                    >
                                        <option value="">Select Faculty Member</option>
                                        {teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
                                    </select>
                                </FormGroup>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

                                {/* Section 3: Schedule Picker */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                            <Calendar size={18} color="var(--brand-primary)" /> Weekly Schedule Selection
                                        </label>
                                        {selectedSlots.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedSlots([])}
                                                style={{ fontSize: '0.8rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                                Clear All ({selectedSlots.length})
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                        {/* Day Row */}
                                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            {DAYS.map(day => {
                                                const count = selectedSlots.filter(s => s.dayOfWeek === day).length;
                                                const isActive = activeDay === day;
                                                return (
                                                    <motion.button
                                                        key={day}
                                                        type="button"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setActiveDay(day)}
                                                        style={{
                                                            padding: '0.6rem 1.2rem',
                                                            borderRadius: '0.75rem',
                                                            border: '1px solid',
                                                            borderColor: isActive ? 'var(--brand-primary)' : 'var(--border-color)',
                                                            background: isActive ? 'var(--brand-primary)' : 'var(--bg-primary)',
                                                            color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem'
                                                        }}
                                                    >
                                                        {day.substring(0, 3)}
                                                        {count > 0 && (
                                                            <span style={{
                                                                background: isActive ? '#ffffff' : 'var(--brand-primary)',
                                                                color: isActive ? 'var(--brand-primary)' : '#ffffff',
                                                                borderRadius: '50%',
                                                                width: '18px',
                                                                height: '18px',
                                                                fontSize: '0.7rem',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: '700'
                                                            }}>
                                                                {count}
                                                            </span>
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>

                                        {/* Action Toolbar */}
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={toggleAllSlotsForActiveDay}
                                                style={{
                                                    fontSize: '0.8rem',
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '0.5rem',
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                {TIMES.every(t => isSlotSelected(activeDay, t)) ? `Deselect All (${activeDay})` : `Select All Slots (${activeDay})`}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={applyActiveDayToAllDays}
                                                disabled={selectedSlots.filter(s => s.dayOfWeek === activeDay).length === 0}
                                                style={{
                                                    fontSize: '0.8rem',
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '0.5rem',
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontWeight: '600',
                                                    opacity: selectedSlots.filter(s => s.dayOfWeek === activeDay).length === 0 ? 0.5 : 1
                                                }}
                                            >
                                                Copy {activeDay} Slots to Everyday
                                            </button>

                                            {/* Schedule Status Legend */}
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.5rem 0.75rem', background: 'var(--bg-primary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}>
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--brand-primary)' }}></span> Selected
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', color: '#ef4444' }}>
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span> Class Occupied
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', color: '#f59e0b' }}>
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span> Faculty Busy
                                                </span>
                                            </div>
                                        </div>

                                        {/* Time Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.8rem' }}>
                                            {TIMES.map(time => {
                                                const selected = isSlotSelected(activeDay, time);
                                                const booking = getFacultyBooking(activeDay, time);

                                                let borderColor = selected ? 'var(--brand-primary)' : 'var(--border-color)';
                                                let bg = selected ? 'rgba(79, 70, 229, 0.12)' : 'var(--bg-primary)';
                                                let textColor = selected ? 'var(--brand-primary)' : 'var(--text-secondary)';
                                                let badgeText = '';
                                                let badgeBg = 'rgba(239,68,68,0.2)';
                                                let badgeColor = '#dc2626';

                                                if (booking) {
                                                    if (booking.conflictType === 'class') {
                                                        badgeText = 'CLASS BOOKED';
                                                        borderColor = 'rgba(239,68,68,0.6)';
                                                        bg = 'rgba(239,68,68,0.08)';
                                                        textColor = '#dc2626';
                                                        badgeBg = 'rgba(239,68,68,0.2)';
                                                        badgeColor = '#dc2626';
                                                    } else if (booking.conflictType === 'teacher') {
                                                        badgeText = 'FACULTY BUSY';
                                                        borderColor = 'rgba(245, 158, 11, 0.6)';
                                                        bg = 'rgba(245, 158, 11, 0.08)';
                                                        textColor = '#d97706';
                                                        badgeBg = 'rgba(245, 158, 11, 0.2)';
                                                        badgeColor = '#b45309';
                                                    } else {
                                                        badgeText = 'SLOT OCCUPIED';
                                                        borderColor = 'rgba(239,68,68,0.6)';
                                                        bg = 'rgba(239,68,68,0.08)';
                                                        textColor = '#dc2626';
                                                        badgeBg = 'rgba(239,68,68,0.2)';
                                                        badgeColor = '#dc2626';
                                                    }
                                                }

                                                return (
                                                    <motion.button
                                                        key={time}
                                                        type="button"
                                                        whileHover={{ y: -2 }}
                                                        onClick={() => toggleSlot(activeDay, time)}
                                                        style={{
                                                            padding: '0.85rem 1rem',
                                                            borderRadius: '0.75rem',
                                                            border: '1.5px solid',
                                                            borderColor,
                                                            background: bg,
                                                            color: textColor,
                                                            fontWeight: selected || booking ? '700' : '500',
                                                            fontSize: '0.85rem',
                                                            cursor: booking ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'flex-start',
                                                            gap: '0.35rem',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <Clock size={14} opacity={selected || booking ? 1 : 0.5} />
                                                                {time}
                                                            </div>
                                                            {booking ? (
                                                                <span style={{ fontSize: '0.62rem', fontWeight: '800', background: badgeBg, color: badgeColor, padding: '0.12rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                                    {badgeText}
                                                                </span>
                                                            ) : selected ? (
                                                                <Check size={16} color="var(--brand-primary)" />
                                                            ) : (
                                                                <Plus size={14} opacity={0.4} />
                                                            )}
                                                        </div>

                                                        {booking && (
                                                            <div style={{ fontSize: '0.72rem', color: badgeColor, fontWeight: '600', textAlign: 'left', marginTop: '0.1rem' }}>
                                                                {booking.conflictType === 'class' ? (
                                                                    <>⚠️ {booking.subject_name || 'Subject'} ({booking.teacher_name || 'Faculty'})</>
                                                                ) : booking.conflictType === 'teacher' ? (
                                                                    <>⚠️ {booking.subject_name || 'Subject'} ({booking.class_name || 'Class'})</>
                                                                ) : (
                                                                    <>⚠️ {booking.subject_name || 'Subject'}</>
                                                                )}
                                                            </div>
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>

                                        {/* Selected Slots Summary Chips */}
                                        <AnimatePresence>
                                            {selectedSlots.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    style={{
                                                        padding: '1.2rem 1.5rem',
                                                        background: 'linear-gradient(135deg, var(--brand-primary), #6366f1)',
                                                        borderRadius: '0.75rem',
                                                        color: 'white',
                                                        boxShadow: '0 10px 20px rgba(79, 70, 229, 0.2)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <Calendar size={18} />
                                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.05em' }}>
                                                                SELECTED SCHEDULE ({selectedSlots.length} SLOT{selectedSlots.length > 1 ? 'S' : ''})
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                                        {selectedSlots.map((slot, idx) => (
                                                            <span
                                                                key={idx}
                                                                style={{
                                                                    background: 'rgba(255, 255, 255, 0.2)',
                                                                    backdropFilter: 'blur(5px)',
                                                                    padding: '0.35rem 0.75rem',
                                                                    borderRadius: '2rem',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: '600',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.4rem'
                                                                }}
                                                            >
                                                                {slot.dayOfWeek.substring(0, 3)}: {slot.timeSlot}
                                                                <X
                                                                    size={14}
                                                                    style={{ cursor: 'pointer' }}
                                                                    onClick={() => removeSlot(slot.dayOfWeek, slot.timeSlot)}
                                                                />
                                                            </span>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        padding: '1.2rem',
                                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                        color: 'white',
                                        borderRadius: '1rem',
                                        border: 'none',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontWeight: '800',
                                        fontSize: '1.1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.8rem',
                                        marginTop: '1rem',
                                        boxShadow: '0 15px 30px rgba(79, 70, 229, 0.3)'
                                    }}
                                >
                                    {loading ? 'Processing Allocation...' : <><Plus size={22} /> Assign Subject</>}
                                </motion.button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="coordinator-form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="glass-panel"
                            style={{
                                padding: '3rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            <form onSubmit={handleCoordinatorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                                    <FormGroup label="Department" icon={<Building2 size={16} />}>
                                        <select
                                            className="form-input" required
                                            value={coordinatorForm.departmentId}
                                            onChange={(e) => setCoordinatorForm({ ...coordinatorForm, departmentId: e.target.value, classId: '' })}
                                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem' }}
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                                        </select>
                                    </FormGroup>

                                    <FormGroup label="Class & Section" icon={<LayoutGrid size={16} />}>
                                        <select
                                            className="form-input" required disabled={!coordinatorForm.departmentId}
                                            value={coordinatorForm.classId}
                                            onChange={(e) => setCoordinatorForm({ ...coordinatorForm, classId: e.target.value })}
                                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem' }}
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map(c => <option key={c._id} value={c._id}>{c.className}</option>)}
                                        </select>
                                    </FormGroup>
                                </div>

                                <FormGroup label="Appoint Faculty" icon={<UserCheck size={16} />}>
                                    <select
                                        className="form-input" required
                                        value={coordinatorForm.teacherId}
                                        onChange={(e) => setCoordinatorForm({ ...coordinatorForm, teacherId: e.target.value })}
                                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem' }}
                                    >
                                        <option value="">Select Faculty Member</option>
                                        {teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
                                    </select>
                                </FormGroup>

                                <motion.div
                                    style={{
                                        padding: '1.5rem',
                                        background: 'rgba(245, 158, 11, 0.05)',
                                        borderRadius: '1rem',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid rgba(245, 158, 11, 0.2)',
                                        lineHeight: '1.6'
                                    }}
                                >
                                    <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '0.3rem' }}>Elevated Privileges</strong>
                                    Appointing a Class Coordinator grants this faculty member the authority to oversee leaf approvals, monitor class-wide attendance, and manage student performance metrics.
                                </motion.div>

                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        padding: '1.2rem',
                                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                        color: 'white',
                                        borderRadius: '1rem',
                                        border: 'none',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontWeight: '800',
                                        fontSize: '1.1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.8rem',
                                        boxShadow: '0 15px 30px rgba(79, 70, 229, 0.3)'
                                    }}
                                >
                                    {loading ? 'Appointing...' : <><UserCheck size={22} /> Appoint Coordinator</>}
                                </motion.button>
                            </form>

                            {/* Active Coordinators Directory */}
                            <div style={{ marginTop: '3.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <UserCheck size={22} color="var(--brand-primary)" /> Active Class Coordinators ({filteredCoordinators.length})
                                    </h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0 0' }}>
                                        Overview of faculty members appointed to manage specific classes.
                                    </p>
                                </div>

                                {/* Filter Toolbar */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                                    {/* Search */}
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Search Faculty / Email / Class..."
                                        value={coordSearch}
                                        onChange={e => setCoordSearch(e.target.value)}
                                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                                    />

                                    {/* Dept Filter */}
                                    <select
                                        className="form-input"
                                        value={coordFilterDept}
                                        onChange={e => { setCoordFilterDept(e.target.value); setCoordFilterClass(''); }}
                                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(d => (
                                            <option key={d._id || d.id} value={d._id || d.id}>{d.departmentName || d.name}</option>
                                        ))}
                                    </select>

                                    {/* Class Filter */}
                                    <select
                                        className="form-input"
                                        value={coordFilterClass}
                                        onChange={e => setCoordFilterClass(e.target.value)}
                                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                                    >
                                        <option value="">All Classes</option>
                                        {classes
                                            .filter(c => !coordFilterDept || String(c.departmentId?._id || c.departmentId) === String(coordFilterDept))
                                            .map(c => (
                                                <option key={c._id || c.id} value={c._id || c.id}>{c.className || c.name}</option>
                                            ))}
                                    </select>

                                    {/* Reset button */}
                                    {(coordFilterDept || coordFilterClass || coordSearch) && (
                                        <button
                                            type="button"
                                            onClick={() => { setCoordFilterDept(''); setCoordFilterClass(''); setCoordSearch(''); }}
                                            style={{ fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                </div>

                                {/* Table */}
                                <div className="table-responsive" style={{ background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '1rem 1.2rem' }}>Faculty Member</th>
                                                <th style={{ padding: '1rem 1.2rem' }}>Department</th>
                                                <th style={{ padding: '1rem 1.2rem' }}>Coordinating Class</th>
                                                <th style={{ padding: '1rem 1.2rem', textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCoordinators.map(c => (
                                                <tr key={c.teacher_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '1rem 1.2rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-primary), #6366f1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem' }}>
                                                                {c.teacher_name ? c.teacher_name.charAt(0).toUpperCase() : 'T'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{c.teacher_name}</div>
                                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.teacher_email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.2rem' }}>
                                                        <span style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '0.8rem', fontWeight: '600' }}>
                                                            {c.department_name || '-'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.2rem' }}>
                                                        <span style={{ padding: '0.35rem 0.75rem', borderRadius: '2rem', background: 'rgba(79, 70, 229, 0.15)', color: 'var(--brand-primary)', border: '1px solid rgba(79, 70, 229, 0.3)', fontSize: '0.82rem', fontWeight: '700' }}>
                                                            🏫 {c.class_name}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.2rem', textAlign: 'right' }}>
                                                        <button
                                                            className="btn"
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '6px', cursor: 'pointer' }}
                                                            onClick={() => handleRevokeCoordinator(c.teacher_id, c.teacher_name, c.class_name)}
                                                            title="Revoke Coordinator Status"
                                                        >
                                                            <X size={14} /> Revoke
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredCoordinators.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                        No active class coordinators found matching your filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Global Styles for custom selects and transitions */}
            <style>{`
                .form-input {
                    color: var(--text-primary);
                    width: 100%;
                    box-sizing: border-box;
                    font-family: inherit;
                    transition: all 0.2s ease;
                }
                .form-input::placeholder {
                    color: var(--text-light);
                    opacity: 0.7;
                }
                .form-input:focus {
                    border-color: var(--brand-primary) !important;
                    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1) !important;
                    outline: none;
                }
                select.form-input {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 1rem center;
                    background-size: 1.2rem;
                }
            `}</style>
        </div>
    );
};

// Internal components for layout
const FormGroup = ({ label, icon, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--text-secondary)'
        }}>
            <span style={{ color: 'var(--brand-primary)', opacity: 0.8 }}>{icon}</span> {label}
        </label>
        {children}
    </div>
);

export default Assignments;
