import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BookOpen, Plus, Trash2, Edit2, Search, ChevronRight, ArrowLeft, Layers, GraduationCap, Building2, UserCheck, CheckSquare, Square, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const SubjectManage = () => {
    const [rawSubjects, setRawSubjects] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Navigation & Filters
    const [selectedDeptId, setSelectedDeptId] = useState(null); // Track drill-down
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        _id: null,
        subjectIds: [],
        subjectName: '',
        departmentIds: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subRes, deptRes] = await Promise.all([
                axios.get('/admin/subjects'),
                axios.get('/admin/departments')
            ]);
            setRawSubjects(subRes.data);
            setDepartments(deptRes.data);
        } catch (error) {
            console.error('Error fetching subject management data:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Group raw database subjects by Subject Name to eliminate duplicate cards
     */
    const groupedSubjects = useMemo(() => {
        const map = new Map();

        rawSubjects.forEach(sub => {
            const subName = (sub.subjectName || sub.name || '').trim();
            if (!subName) return;
            const nameKey = subName.toLowerCase();

            if (!map.has(nameKey)) {
                map.set(nameKey, {
                    _id: sub._id || sub.id,
                    subjectName: subName,
                    subjectIds: [],
                    departmentIds: new Set(),
                    assignedDepartments: [],
                    handlingTeachers: []
                });
            }

            const item = map.get(nameKey);
            const subId = sub._id || sub.id;
            if (subId && !item.subjectIds.includes(subId)) {
                item.subjectIds.push(subId);
            }

            // Aggregate assigned departments (deduplicated by case-insensitive name)
            const deptsList = sub.assignedDepartments || [];
            if (deptsList.length > 0) {
                deptsList.forEach(d => {
                    const dName = (d.departmentName || d.name || '').trim();
                    if (dName && !item.assignedDepartments.some(ex => ex.departmentName.toLowerCase() === dName.toLowerCase())) {
                        item.assignedDepartments.push({
                            id: d.id || d._id,
                            departmentName: dName
                        });
                    }
                    if (d.id || d._id) {
                        item.departmentIds.add(String(d.id || d._id));
                    }
                });
            }

            if (sub.departmentId) {
                const pId = String(sub.departmentId._id || sub.departmentId.id || sub.departmentId);
                const pName = (sub.departmentId.departmentName || sub.departmentId.name || '').trim();
                item.departmentIds.add(pId);
                if (pName && !item.assignedDepartments.some(ex => ex.departmentName.toLowerCase() === pName.toLowerCase())) {
                    item.assignedDepartments.push({
                        id: pId,
                        departmentName: pName
                    });
                }
            }

            // Aggregate handling teachers (deduplicated by teacherId + className)
            const teachersList = sub.handlingTeachers || [];
            teachersList.forEach(t => {
                const key = `${t.teacherId}-${t.className || ''}`;
                if (!item.handlingTeachers.some(ex => `${ex.teacherId}-${ex.className || ''}` === key)) {
                    item.handlingTeachers.push(t);
                }
            });
        });

        // Convert departmentIds Set to Array
        return Array.from(map.values()).map(item => ({
            ...item,
            departmentIds: Array.from(item.departmentIds)
        }));
    }, [rawSubjects]);

    /**
     * Active Department Object
     */
    const activeDept = useMemo(() =>
        departments.find(d => String(d._id || d.id) === String(selectedDeptId)),
        [departments, selectedDeptId]);

    /**
     * Calculate subject counts per department on main screen (deduplicated by department name)
     */
    const departmentStats = useMemo(() => {
        const statsMap = new Map();

        departments.forEach(dept => {
            const dName = (dept.departmentName || dept.name || '').trim();
            if (!dName) return;
            const nameKey = dName.toLowerCase();
            const deptIdStr = String(dept._id || dept.id);

            const count = groupedSubjects.filter(sub => {
                const hasDeptId = sub.departmentIds.includes(deptIdStr);
                const hasDeptName = sub.assignedDepartments.some(d => d.departmentName.toLowerCase() === nameKey);
                return hasDeptId || hasDeptName;
            }).length;

            if (!statsMap.has(nameKey)) {
                statsMap.set(nameKey, {
                    ...dept,
                    departmentName: dName,
                    subjectCount: count
                });
            }
        });

        return Array.from(statsMap.values());
    }, [groupedSubjects, departments]);

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    /**
     * Filter grouped subjects for the active department view
     */
    const filteredSubjects = useMemo(() => {
        if (!selectedDeptId) return groupedSubjects;

        const deptIdStr = String(selectedDeptId);
        const deptNameLower = (activeDept?.departmentName || '').trim().toLowerCase();

        return groupedSubjects.filter(sub => {
            const matchDept = sub.departmentIds.includes(deptIdStr) ||
                sub.assignedDepartments.some(d => d.departmentName.toLowerCase() === deptNameLower);
            const matchSearch = searchTerm
                ? sub.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
                : true;
            return matchDept && matchSearch;
        });
    }, [groupedSubjects, selectedDeptId, activeDept, searchTerm]);

    const handleOpenModal = (subject = null) => {
        if (subject) {
            setIsEditing(true);
            setForm({
                _id: subject._id,
                subjectIds: subject.subjectIds || [subject._id],
                subjectName: subject.subjectName,
                departmentIds: subject.departmentIds || []
            });
        } else {
            setIsEditing(false);
            setForm({
                _id: null,
                subjectIds: [],
                subjectName: '',
                departmentIds: selectedDeptId ? [String(selectedDeptId)] : []
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const toggleDepartmentId = (deptId) => {
        const idStr = String(deptId);
        setForm(prev => {
            const exists = prev.departmentIds.includes(idStr);
            const updated = exists
                ? prev.departmentIds.filter(id => id !== idStr)
                : [...prev.departmentIds, idStr];
            return { ...prev, departmentIds: updated };
        });
    };

    const toggleSelectAllDepartments = () => {
        if (form.departmentIds.length === departments.length) {
            setForm(prev => ({ ...prev, departmentIds: [] }));
        } else {
            setForm(prev => ({ ...prev, departmentIds: departments.map(d => String(d._id || d.id)) }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.departmentIds.length === 0) {
            alert('Please select at least one department for this subject.');
            return;
        }
        try {
            const payload = {
                subjectName: form.subjectName,
                departmentIds: form.departmentIds,
                departmentId: form.departmentIds[0] // primary
            };

            if (isEditing) {
                const targetId = form.subjectIds[0] || form._id;
                await axios.put(`/admin/subjects/${targetId}`, payload);
            } else {
                await axios.post('/admin/subjects', payload);
            }
            fetchData();
            handleCloseModal();
        } catch (error) {
            console.error('Failed to save subject:', error);
            alert(error.response?.data?.message || 'Failed to save subject');
        }
    };

    const handleDelete = async (subject) => {
        if (!window.confirm(`Are you sure you want to delete subject "${subject.subjectName}"? It will be removed from all assigned departments and class allocations.`)) return;
        try {
            const primaryId = subject.subjectIds[0] || subject._id;
            await axios.delete(`/admin/subjects/${primaryId}`, {
                data: { ids: subject.subjectIds, name: subject.subjectName }
            });
            fetchData();
        } catch (error) {
            console.error('Failed to delete subject:', error);
            alert(error.response?.data?.message || 'Failed to delete subject');
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {selectedDeptId && (
                        <button
                            onClick={() => setSelectedDeptId(null)}
                            className="btn btn-outline"
                            style={{ padding: '0.5rem', borderRadius: '50%', minWidth: '40px', height: '40px', border: 'none', background: 'var(--bg-secondary)' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <GraduationCap className="text-brand-primary" size={32} />
                            {selectedDeptId ? activeDept?.departmentName : 'Manage Subjects'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {selectedDeptId
                                ? `Showing all subjects offered under ${activeDept?.departmentName} department.`
                                : 'Select a department to view or manage its curriculum across multiple departments.'}
                        </p>
                    </div>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Create Subject
                </button>
            </div>

            {/* Search Bar within detailed view */}
            {selectedDeptId && (
                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
                    <div style={{ position: 'relative', maxWidth: '400px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Search subjects..."
                            style={{ paddingLeft: '2.5rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
                    <div className="loader" style={{ margin: '0 auto 1.5rem auto' }}></div>
                    Crunching curriculum data...
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {!selectedDeptId ? (
                        /* INITIAL VIEW: Department Cards */
                        <motion.div
                            key="dept-list"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}
                        >
                            {departmentStats.map(dept => (
                                <div
                                    key={dept._id || dept.id}
                                    className="glass-panel hover-card"
                                    style={{ padding: '1.75rem', cursor: 'pointer', transition: 'all 0.3s' }}
                                    onClick={() => setSelectedDeptId(dept._id || dept.id)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                        <div style={{ background: 'var(--brand-primary-light)', padding: '0.75rem', borderRadius: '12px', color: 'var(--brand-primary)' }}>
                                            <Layers size={24} />
                                        </div>
                                        <ChevronRight size={20} style={{ color: 'var(--text-light)' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                        {dept.departmentName}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        <BookOpen size={14} />
                                        <span>{dept.subjectCount} Subjects</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        /* DETAILED VIEW: Subjects in Department */
                        <motion.div
                            key="subject-list"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                                {filteredSubjects.map(subject => {
                                    const depts = subject.assignedDepartments || [];
                                    const teachers = subject.handlingTeachers || [];

                                    return (
                                        <div key={subject.subjectName} className="glass-panel hover-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            {/* Top Row: Icon + Name + Actions */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                                                    <div style={{
                                                        width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
                                                        background: 'linear-gradient(135deg, var(--brand-primary), #6366f1)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)'
                                                    }}>
                                                        <GraduationCap size={22} />
                                                    </div>
                                                    <div>
                                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, lineHeight: '1.3' }}>
                                                            {subject.subjectName}
                                                        </h3>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(subject); }}
                                                        className="action-btn"
                                                        title="Edit Subject"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(subject); }}
                                                        className="action-btn danger"
                                                        title="Delete Subject"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Middle Row: Assigned Departments */}
                                            <div style={{ background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <Building2 size={13} style={{ color: 'var(--brand-primary)' }} /> Offered in Departments:
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {depts.length > 0 ? (
                                                        depts.map((d, idx) => (
                                                            <span key={d.id || idx} style={{
                                                                fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '6px',
                                                                background: 'rgba(99, 102, 241, 0.12)', color: 'var(--brand-primary)',
                                                                fontWeight: '600', border: '1px solid rgba(99, 102, 241, 0.25)'
                                                            }}>
                                                                {d.departmentName}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--brand-primary)', fontWeight: '600' }}>
                                                            {activeDept?.departmentName || 'General'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bottom Row: Teachers Handling This Subject */}
                                            <div style={{ background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <UserCheck size={13} style={{ color: '#10b981' }} /> Handling Faculty:
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {teachers.length > 0 ? (
                                                        teachers.map((t, idx) => (
                                                            <span key={t.teacherId || idx} style={{
                                                                fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '999px',
                                                                background: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
                                                                fontWeight: '600', border: '1px solid rgba(16, 185, 129, 0.25)',
                                                                display: 'flex', alignItems: 'center', gap: '0.35rem'
                                                            }}>
                                                                <Users size={12} />
                                                                {t.teacherName} {t.className ? `(${t.className})` : ''}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                                                            No faculty allocated yet
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {filteredSubjects.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-secondary)', borderRadius: '1.5rem', border: '1px dashed var(--border-color)' }}>
                                    <BookOpen size={48} style={{ margin: '0 auto 1.25rem auto', color: 'var(--text-light)', opacity: 0.5 }} />
                                    <h3 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No Subjects Found</h3>
                                    <p style={{ color: 'var(--text-light)' }}>There are no subjects listed in this department yet.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Create/Edit Modal via Portal */}
            {createPortal(
                <AnimatePresence>
                    {showModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(5px)',
                            zIndex: 100000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            padding: '1rem'
                        }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '2rem',
                                    width: '100%',
                                    maxWidth: '480px',
                                    borderRadius: '24px',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                                    border: '1px solid var(--border-color)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        width: '48px', height: '48px', background: 'var(--brand-primary-light)',
                                        borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 0.75rem auto', color: 'var(--brand-primary)',
                                        boxShadow: '0 8px 16px rgba(67, 56, 186, 0.15)'
                                    }}>
                                        <GraduationCap size={24} />
                                    </div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                        {isEditing ? 'Edit Subject' : 'New Subject'}
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                        {isEditing ? 'Update subject and department assignments' : 'Configure new module across single or multiple departments'}
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.4rem', fontWeight: '600' }}>Subject Name *</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            required
                                            value={form.subjectName}
                                            onChange={e => setForm({ ...form, subjectName: e.target.value })}
                                            placeholder="e.g. Data Structures & Algorithms"
                                            style={{ height: '44px', fontSize: '0.9rem', padding: '0 1rem' }}
                                        />
                                    </div>

                                    {/* Multi-Department Selection */}
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <label className="form-label" style={{ fontSize: '0.75rem', margin: 0, fontWeight: '600' }}>
                                                Assigned Departments * ({form.departmentIds.length} selected)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={toggleSelectAllDepartments}
                                                style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                                            >
                                                {form.departmentIds.length === departments.length ? 'Clear All' : 'Select All'}
                                            </button>
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                            gap: '0.5rem',
                                            maxHeight: '180px',
                                            overflowY: 'auto',
                                            padding: '0.65rem',
                                            background: 'var(--bg-primary)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            {departments.map(dept => {
                                                const dIdStr = String(dept._id || dept.id);
                                                const isSelected = form.departmentIds.includes(dIdStr);

                                                return (
                                                    <div
                                                        key={dIdStr}
                                                        onClick={() => toggleDepartmentId(dIdStr)}
                                                        style={{
                                                            padding: '0.5rem 0.75rem',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            fontSize: '0.8rem',
                                                            background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                                                            border: `1.5px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                                                            color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)',
                                                            fontWeight: isSelected ? '600' : '400',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        {isSelected ? <CheckSquare size={16} color="var(--brand-primary)" /> : <Square size={16} style={{ opacity: 0.4 }} />}
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {dept.departmentName}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="btn btn-secondary"
                                            style={{ flex: 1, height: '44px', fontSize: '0.9rem' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ flex: 2, height: '44px', fontSize: '0.9rem' }}
                                        >
                                            {isEditing ? 'Update Subject' : 'Create Subject'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default SubjectManage;
