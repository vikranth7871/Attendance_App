import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Plus, Download, Users, FileText, CheckCircle, AlertCircle, Trash2, Pencil, X, Save, Loader2, UserCheck, Eye } from 'lucide-react';
import Papa from 'papaparse';
import UserProfileView from '../../components/UserProfileView';

const UserManage = () => {
    const [activeTab, setActiveTab] = useState('students'); // 'manual', 'csv', 'students', 'teachers', 'parents'
    const [departments, setDepartments] = useState([]);
    const [classes, setClasses] = useState([]);

    // Directory State
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [parents, setParents] = useState([]);
    const [filterDept, setFilterDept] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [userInitialEditMode, setUserInitialEditMode] = useState(false);

    // Edit User Modal State
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({
        id: '',
        name: '',
        email: '',
        password: '',
        role: 'student',
        departmentId: '',
        classId: '',
        rollNumber: '',
        parentEmail: ''
    });
    const [savingUser, setSavingUser] = useState(false);

    // Manual Form State
    const [manualForm, setManualForm] = useState({
        name: '', email: '', password: '', role: 'student', departmentId: '', classId: '', rollNumber: '', parentEmail: ''
    });

    // CSV State
    const [csvFile, setCsvFile] = useState(null);
    const [csvPreview, setCsvPreview] = useState([]);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);

    useEffect(() => {
        fetchDepartmentsAndClasses();
    }, []);

    const fetchDepartmentsAndClasses = async () => {
        try {
            const [deptRes, classRes] = await Promise.all([
                axios.get('/admin/departments'),
                axios.get('/admin/classes')
            ]);
            setDepartments(deptRes.data);
            setClasses(classRes.data);
        } catch (err) {
            console.error('Failed to fetch departments/classes', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'students') fetchStudents();
        if (activeTab === 'teachers') fetchTeachers();
        if (activeTab === 'parents') fetchParents();
    }, [activeTab, filterDept, filterClass]);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/admin/students', { params: { classId: filterClass || undefined } });
            let data = res.data;
            if (filterDept && !filterClass) {
                data = data.filter(s => s.departmentId?._id === filterDept || s.departmentId === filterDept);
            }
            setStudents(data);
        } catch (err) {
            console.error('Failed to fetch students', err);
        }
    };

    const fetchTeachers = async () => {
        try {
            const res = await axios.get('/admin/teachers', { params: { departmentId: filterDept || undefined } });
            setTeachers(res.data);
        } catch (err) {
            console.error('Failed to fetch teachers', err);
        }
    };

    const fetchParents = async () => {
        try {
            const res = await axios.get('/admin/parents');
            setParents(res.data);
        } catch (err) {
            console.error('Failed to fetch parents', err);
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Are you sure you want to permanently delete the ${user.role || 'user'} "${user.name}"? This action cannot be undone.`)) return;

        try {
            await axios.delete(`/admin/user/${user._id || user.id}`);
            alert('User deleted successfully');

            if (activeTab === 'students') fetchStudents();
            if (activeTab === 'teachers') fetchTeachers();
            if (activeTab === 'parents') fetchParents();
        } catch (err) {
            console.error('Failed to delete user', err);
            alert(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditForm({
            id: user._id || user.id,
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role || (activeTab === 'teachers' ? 'teacher' : activeTab === 'parents' ? 'parent' : 'student'),
            departmentId: user.departmentId?._id || user.departmentId || '',
            classId: user.classId?._id || user.classId || '',
            rollNumber: user.rollNumber || user.roll_number || '',
            parentEmail: user.parentEmail || user.parent_email || ''
        });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setSavingUser(true);
        try {
            const payload = {
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
                departmentId: editForm.departmentId || null,
                classId: editForm.classId || null,
                rollNumber: editForm.rollNumber || null,
                parentEmail: editForm.parentEmail || null
            };
            if (editForm.password && editForm.password.trim().length > 0) {
                payload.password = editForm.password;
            }

            await axios.put(`/admin/update-user/${editForm.id}`, payload);
            alert('User details updated successfully!');
            setEditingUser(null);

            if (activeTab === 'students') fetchStudents();
            if (activeTab === 'teachers') fetchTeachers();
            if (activeTab === 'parents') fetchParents();
        } catch (err) {
            console.error('Failed to update user', err);
            alert('Failed to update user details: ' + (err.response?.data?.message || err.message));
        } finally {
            setSavingUser(false);
        }
    };

    // --- Manual Entry Logic ---
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...manualForm };
            if (!payload.departmentId) delete payload.departmentId;
            if (!payload.classId) delete payload.classId;
            if (!payload.rollNumber) delete payload.rollNumber;

            await axios.post('/admin/create-user', payload);
            alert(`Successfully created ${manualForm.role}`);
            setManualForm({ name: '', email: '', password: '', role: 'student', departmentId: '', classId: '', rollNumber: '', parentEmail: '' });
            
            if (activeTab === 'students') fetchStudents();
            if (activeTab === 'teachers') fetchTeachers();
            if (activeTab === 'parents') fetchParents();
        } catch (err) {
            alert('Error creating user: ' + (err.response?.data?.message || err.message));
        }
    };

    // --- CSV Upload Logic ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCsvFile(file);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    setCsvHeaders(results.meta.fields || []);
                    setCsvPreview(results.data.slice(0, 5));
                }
            });
            setUploadResult(null);
        }
    };

    const handleCsvUpload = async () => {
        if (!csvFile) return alert('Please select a file first.');
        setUploading(true);
        setUploadResult(null);

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async function (results) {
                try {
                    const response = await axios.post('/admin/create-users-bulk', { users: results.data });
                    setUploadResult({ success: true, message: response.data.message, data: response.data });
                    setCsvFile(null);
                    setCsvPreview([]);
                } catch (err) {
                    setUploadResult({ success: false, message: err.response?.data?.message || err.message, data: err.response?.data });
                } finally {
                    setUploading(false);
                }
            }
        });
    };

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,name,email,password,role,department,className,rollNumber\nJohn Doe,john@example.com,password123,student,Computer Science,CS101-A,101";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "user_upload_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredClassesManual = classes.filter(c => c.departmentId?._id === manualForm.departmentId || c.departmentId === manualForm.departmentId);
    const filteredClassesEdit = classes.filter(c => c.departmentId?._id === editForm.departmentId || c.departmentId === editForm.departmentId);

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                {selectedUser ? (
                    <UserProfileView user={selectedUser} initialEditMode={userInitialEditMode} onBack={() => { setSelectedUser(null); setUserInitialEditMode(false); }} />
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={24} /> User Management
                            </h2>

                            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-md)', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                {[
                                    { id: 'students', label: 'Students', icon: <Users size={16} /> },
                                    { id: 'teachers', label: 'Teachers', icon: <Users size={16} /> },
                                    { id: 'parents', label: 'Parents', icon: <Users size={16} /> },
                                    { id: 'manual', label: 'Manual Entry', icon: <Plus size={16} /> },
                                    { id: 'csv', label: 'Bulk Upload', icon: <FileText size={16} /> }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{
                                            position: 'relative',
                                            zIndex: 1,
                                            padding: '0.5rem 1rem',
                                            borderRadius: 8,
                                            border: 'none',
                                            background: 'transparent',
                                            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            transition: 'color 0.2s',
                                            whiteSpace: 'nowrap',
                                            flex: '1 1 auto',
                                            justifyContent: 'center',
                                            fontWeight: activeTab === tab.id ? '600' : '400'
                                        }}
                                    >
                                        {tab.icon} {tab.label}
                                        {activeTab === tab.id && (
                                            <motion.div
                                                layoutId="userManageActiveTab"
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                                    borderRadius: 8,
                                                    zIndex: -1,
                                                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                                                }}
                                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Students Tab */}
                        {activeTab === 'students' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                    <select className="input-field" value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterClass(''); }} style={{ width: '200px' }}>
                                        <option value="">All Departments</option>
                                        {departments.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                                    </select>
                                    <select className="input-field" value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ width: '200px' }} disabled={!filterDept}>
                                        <option value="">All Classes</option>
                                        {classes.filter(c => c.departmentId?._id === filterDept || c.departmentId === filterDept).map(c => <option key={c._id} value={c._id}>{c.className}</option>)}
                                    </select>
                                </div>
                                <div className="table-responsive">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '0.75rem' }}>Name</th>
                                                <th style={{ padding: '0.75rem' }}>Email</th>
                                                <th style={{ padding: '0.75rem' }}>Department</th>
                                                <th style={{ padding: '0.75rem' }}>Class</th>
                                                <th style={{ padding: '0.75rem' }}>Roll No</th>
                                                <th style={{ padding: '0.75rem' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map(s => (
                                                <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => setSelectedUser(s)}>
                                                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{s.name}</td>
                                                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{s.email}</td>
                                                    <td style={{ padding: '0.75rem' }}>{s.departmentId?.departmentName || '-'}</td>
                                                    <td style={{ padding: '0.75rem' }}>{s.classId?.className || '-'}</td>
                                                    <td style={{ padding: '0.75rem' }}>{s.rollNumber || '-'}</td>
                                                    <td style={{ padding: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                        <button
                                                            className="btn btn-outline"
                                                            style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedUser(s); setUserInitialEditMode(false); }}
                                                            title="View Details"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                        <button
                                                            className="btn"
                                                            style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', background: 'rgba(79, 70, 229, 0.15)', color: 'var(--brand-primary)', border: '1px solid rgba(79, 70, 229, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => { e.stopPropagation(); handleEditClick(s); }}
                                                            title="Edit Details"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            className="btn"
                                                            style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteUser(s); }}
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {students.length === 0 && <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No students found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* Teachers Tab */}
                        {activeTab === 'teachers' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                    <select className="input-field" value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ width: '200px' }}>
                                        <option value="">All Departments</option>
                                        {departments.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                                    </select>
                                </div>
                                <div className="table-responsive">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '0.75rem' }}>Name</th>
                                                <th style={{ padding: '0.75rem' }}>Email</th>
                                                <th style={{ padding: '0.75rem' }}>Department</th>
                                                <th style={{ padding: '0.75rem' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teachers.map(t => (
                                                <tr key={t._id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => setSelectedUser(t)}>
                                                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{t.name}</td>
                                                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{t.email}</td>
                                                    <td style={{ padding: '0.75rem' }}>{t.departmentId?.departmentName || '-'}</td>
                                                    <td style={{ padding: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                        <button
                                                            className="btn btn-outline"
                                                            style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedUser(t); setUserInitialEditMode(false); }}
                                                            title="View Details"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                        <button
                                                            className="btn"
                                                            style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', background: 'rgba(79, 70, 229, 0.15)', color: 'var(--brand-primary)', border: '1px solid rgba(79, 70, 229, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => { e.stopPropagation(); handleEditClick(t); }}
                                                            title="Edit Details"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            className="btn"
                                                            style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteUser(t); }}
                                                            title="Delete Teacher"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {teachers.length === 0 && <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No teachers found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* Parents Tab */}
                        {activeTab === 'parents' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="table-responsive">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '0.75rem' }}>Name</th>
                                                <th style={{ padding: '0.75rem' }}>Email</th>
                                                <th style={{ padding: '0.75rem' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parents.map(p => (
                                                <tr key={p._id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => setSelectedUser(p)}>
                                                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{p.name}</td>
                                                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{p.email}</td>
                                                    <td style={{ padding: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                        <button
                                                            className="btn btn-outline"
                                                            style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedUser(p); setUserInitialEditMode(false); }}
                                                            title="View Details"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                        <button
                                                            className="btn"
                                                            style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', background: 'rgba(79, 70, 229, 0.15)', color: 'var(--brand-primary)', border: '1px solid rgba(79, 70, 229, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => { e.stopPropagation(); handleEditClick(p); }}
                                                            title="Edit Details"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            className="btn"
                                                            style={{ padding: '0.35rem 0.55rem', borderRadius: '7px', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteUser(p); }}
                                                            title="Delete Parent"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {parents.length === 0 && <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No parents found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* Manual Entry Tab */}
                        {activeTab === 'manual' && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                <form onSubmit={handleManualSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Role *</label>
                                        <select className="input-field" value={manualForm.role} onChange={e => setManualForm({ ...manualForm, role: e.target.value })} required style={{ width: '100%' }}>
                                            <option value="student">Student</option>
                                            <option value="teacher">Teacher</option>
                                            <option value="parent">Parent</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Full Name *</label>
                                        <input type="text" className="input-field" value={manualForm.name} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} required style={{ width: '100%' }} placeholder="e.g. Jane Doe" />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email Address *</label>
                                        <input type="email" className="input-field" value={manualForm.email} onChange={e => setManualForm({ ...manualForm, email: e.target.value })} required style={{ width: '100%' }} placeholder="jane@example.com" />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Temporary Password *</label>
                                        <input type="password" className="input-field" value={manualForm.password} onChange={e => setManualForm({ ...manualForm, password: e.target.value })} required style={{ width: '100%' }} />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Department</label>
                                        <select className="input-field" value={manualForm.departmentId} onChange={e => setManualForm({ ...manualForm, departmentId: e.target.value, classId: '' })} style={{ width: '100%' }}>
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                                        </select>
                                    </div>

                                    {manualForm.role === 'student' && (
                                        <>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Class</label>
                                                <select className="input-field" value={manualForm.classId} onChange={e => setManualForm({ ...manualForm, classId: e.target.value })} style={{ width: '100%' }}>
                                                    <option value="">Select Class</option>
                                                    {filteredClassesManual.map(c => <option key={c._id} value={c._id}>{c.className}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Roll Number</label>
                                                <input type="text" className="input-field" value={manualForm.rollNumber} onChange={e => setManualForm({ ...manualForm, rollNumber: e.target.value })} style={{ width: '100%' }} placeholder="e.g. 1001" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Parent Email</label>
                                                <input type="email" className="input-field" value={manualForm.parentEmail} onChange={e => setManualForm({ ...manualForm, parentEmail: e.target.value })} style={{ width: '100%' }} placeholder="parent@example.com" />
                                            </div>
                                        </>
                                    )}

                                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button type="submit" className="btn btn-primary"><Plus size={18} /> Create User</button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* Bulk Upload CSV Tab */}
                        {activeTab === 'csv' && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', flexWrap: 'wrap', gap: '1.5rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Upload CSV File</h3>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Please ensure your CSV matches the required columns.</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <button type="button" onClick={downloadTemplate} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Download size={16} /> Template
                                            </button>
                                            <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Upload size={16} /> Browse File
                                                <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                                            </label>
                                        </div>
                                    </div>

                                    {csvFile && (
                                        <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--brand-primary)" /> {csvFile.name}</span>
                                                <button onClick={handleCsvUpload} disabled={uploading} className="btn btn-primary" style={{ height: '36px' }}>
                                                    {uploading ? 'Processing...' : 'Upload Users'}
                                                </button>
                                            </div>

                                            {csvPreview.length > 0 && (
                                                <div className="table-responsive" style={{ fontSize: '0.875rem' }}>
                                                    <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Preview (First {csvPreview.length} rows):</p>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                {csvHeaders.map(h => <th key={h} style={{ padding: '0.5rem' }}>{h}</th>)}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {csvPreview.map((row, idx) => (
                                                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                    {csvHeaders.map(h => <td key={h} style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{row[h]}</td>)}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {uploadResult && (
                                        <div style={{
                                            padding: '1rem',
                                            borderRadius: 'var(--radius-md)',
                                            background: uploadResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: uploadResult.success ? '#15803d' : '#b91c1c',
                                            border: `1px solid ${uploadResult.success ? '#22c55e' : '#ef4444'}`,
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.75rem'
                                        }}>
                                            {uploadResult.success ? <CheckCircle size={20} style={{ marginTop: '0.125rem' }} /> : <AlertCircle size={20} style={{ marginTop: '0.125rem' }} />}
                                            <div>
                                                <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{uploadResult.message}</p>
                                                {!uploadResult.success && uploadResult.data?.errors && (
                                                    <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                                        {uploadResult.data.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                                                        {uploadResult.data.errors.length > 5 && <li>...and {uploadResult.data.errors.length - 5} more errors.</li>}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </div>

            {/* Quick Edit User Modal */}
            <AnimatePresence>
                {editingUser && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 99999,
                            background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                            style={{
                                background: 'var(--bg-primary)', padding: '1.75rem', borderRadius: '20px',
                                border: '1px solid var(--border-color)', width: '100%', maxWidth: '540px',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Pencil size={20} className="text-brand-primary" /> Edit User Details
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                        System Role
                                    </label>
                                    <select
                                        className="input-field"
                                        value={editForm.role}
                                        onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="parent">Parent</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="input-field"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            className="input-field"
                                            value={editForm.email}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                        Department
                                    </label>
                                    <select
                                        className="input-field"
                                        value={editForm.departmentId}
                                        onChange={e => setEditForm({ ...editForm, departmentId: e.target.value, classId: '' })}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                                    </select>
                                </div>

                                {editForm.role === 'student' && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                                    Class
                                                </label>
                                                <select
                                                    className="input-field"
                                                    value={editForm.classId}
                                                    onChange={e => setEditForm({ ...editForm, classId: e.target.value })}
                                                    style={{ width: '100%' }}
                                                >
                                                    <option value="">Select Class</option>
                                                    {filteredClassesEdit.map(c => <option key={c._id} value={c._id}>{c.className}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                                    Roll Number
                                                </label>
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={editForm.rollNumber}
                                                    onChange={e => setEditForm({ ...editForm, rollNumber: e.target.value })}
                                                    style={{ width: '100%' }}
                                                    placeholder="e.g. 1001"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                                Parent Email
                                            </label>
                                            <input
                                                type="email"
                                                className="input-field"
                                                value={editForm.parentEmail}
                                                onChange={e => setEditForm({ ...editForm, parentEmail: e.target.value })}
                                                style={{ width: '100%' }}
                                                placeholder="parent@example.com"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                        New Password <span style={{ fontSize: '0.75rem', fontWeight: '400', color: 'var(--text-secondary)' }}>(Leave blank to keep current)</span>
                                    </label>
                                    <input
                                        type="password"
                                        className="input-field"
                                        value={editForm.password}
                                        onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                        style={{ width: '100%' }}
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingUser}
                                        className="btn btn-primary"
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '10px',
                                            fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                        }}
                                    >
                                        {savingUser ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                                        {savingUser ? 'Saving...' : 'Save Changes'}
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

export default UserManage;
