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
    const [csvAllRows, setCsvAllRows] = useState([]);
    const [csvErrors, setCsvErrors] = useState({}); // rowIdx -> error string
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [templateRole, setTemplateRole] = useState('student');
    const [uploadProgress, setUploadProgress] = useState(0);

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
    const REQUIRED_HEADERS = ['name', 'email', 'password', 'role'];

    const STUDENT_REQUIRED = ['name', 'email', 'password', 'role', 'parentEmail'];
    const ROLE_TEMPLATES = {
        student: {
            headers: ['name', 'email', 'password', 'role', 'department', 'className', 'section', 'rollNumber', 'parentEmail'],
            required: STUDENT_REQUIRED,
            sample: [
                ['Alice Student', 'alice@example.com', 'student123', 'student', 'Computer Science', 'CS101-A', 'A', '1001', 'alice.parent@example.com'],
                ['Bob Student', 'bob@example.com', 'student123', 'student', 'Computer Science', 'CS101-A', 'A', '1002', 'bob.parent@example.com'],
            ]
        },
        teacher: {
            headers: ['name', 'email', 'password', 'role', 'department', 'className'],
            sample: [
                ['Jane Teacher', 'jane.teacher@example.com', 'teacher123', 'teacher', 'Computer Science', 'CS101-A'],
                ['Tom Faculty', 'tom.faculty@example.com', 'teacher123', 'teacher', 'Mathematics', 'MA202-B'],
            ]
        },
        parent: {
            headers: ['name', 'email', 'password', 'role'],
            sample: [
                ['Alice Parent', 'alice.parent@example.com', 'parent123', 'parent'],
                ['Bob Parent', 'bob.parent@example.com', 'parent123', 'parent'],
            ]
        },
        admin: {
            headers: ['name', 'email', 'password', 'role'],
            sample: [
                ['Admin User', 'newadmin@example.com', 'admin123', 'admin'],
            ]
        },
    };

    const validateRows = (rows, headers) => {
        const errors = {};
        const seenEmails = new Set();
        rows.forEach((row, idx) => {
            const errs = [];
            if (!row.name?.trim()) errs.push('Missing name');
            if (!row.email?.trim()) errs.push('Missing email');
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) errs.push('Invalid email format');
            if (!row.password?.trim()) errs.push('Missing password');
            if (!row.role?.trim()) errs.push('Missing role');
            else if (!['student', 'teacher', 'parent', 'admin'].includes(row.role.trim().toLowerCase())) errs.push(`Invalid role "${row.role}"`);
            // parentEmail is required for students
            if (row.role?.trim().toLowerCase() === 'student' && !row.parentEmail?.trim()) errs.push('Missing parentEmail (required for students)');
            if (row.email && seenEmails.has(row.email.trim().toLowerCase())) errs.push('Duplicate email in this file');
            if (row.email) seenEmails.add(row.email.trim().toLowerCase());
            if (errs.length > 0) errors[idx] = errs.join(', ');
        });
        return errors;
    };

    // Inline cell edit handler — updates the row and re-validates all rows live
    const handleCellEdit = (rowIdx, header, value) => {
        const updated = csvPreview.map((row, i) =>
            i === rowIdx ? { ...row, [header]: value } : row
        );
        setCsvPreview(updated);
        setCsvAllRows(updated);
        setCsvErrors(validateRows(updated, csvHeaders));
    };

    // Remove single row from preview
    const handleDeleteRow = (rowIdx) => {
        const updated = csvPreview.filter((_, i) => i !== rowIdx);
        setCsvPreview(updated);
        setCsvAllRows(updated);
        setCsvErrors(validateRows(updated, csvHeaders));
    };

    // Clear and remove the current attachment
    const handleClearAttachment = () => {
        setCsvFile(null);
        setCsvPreview([]);
        setCsvAllRows([]);
        setCsvHeaders([]);
        setCsvErrors({});
        setUploadResult(null);
        setUploadProgress(0);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCsvFile(file);
            setUploadResult(null);
            setUploadProgress(0);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    const headers = results.meta.fields || [];
                    const rows = results.data;
                    setCsvHeaders(headers);
                    setCsvAllRows(rows);
                    setCsvPreview(rows);
                    setCsvErrors(validateRows(rows, headers));
                }
            });
            e.target.value = '';
        }
    };

    const handleCsvUpload = async () => {
        if (!csvFile) return alert('Please select a file first.');
        const errorCount = Object.keys(csvErrors).length;
        if (errorCount > 0 && !window.confirm(`${errorCount} row(s) have validation errors and will likely fail. Continue anyway?`)) return;

        setUploading(true);
        setUploadResult(null);
        setUploadProgress(10);

        try {
            setUploadProgress(40);
            const response = await axios.post('/admin/create-users-bulk', { users: csvPreview });
            setUploadProgress(100);
            setUploadResult({ success: true, data: response.data });
            setCsvFile(null);
            setCsvPreview([]);
            setCsvAllRows([]);
            setCsvErrors({});
            fetchStudents();
            fetchTeachers();
            fetchParents();
        } catch (err) {
            setUploadProgress(0);
            setUploadResult({ success: false, data: err.response?.data, message: err.response?.data?.message || err.message });
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const tmpl = ROLE_TEMPLATES[templateRole];
        const rows = [tmpl.headers, ...tmpl.sample];
        const csvContent = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `iAttend_${templateRole}_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

                                    {/* Template Download Section */}
                                    <div style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>Download Template</h3>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    Select a role to download its pre-filled CSV template with sample rows.
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <select
                                                    value={templateRole}
                                                    onChange={e => setTemplateRole(e.target.value)}
                                                    style={{
                                                        padding: '0.55rem 0.9rem',
                                                        borderRadius: '0.5rem',
                                                        border: '1px solid var(--border-color)',
                                                        background: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '0.875rem',
                                                        outline: 'none',
                                                        cursor: 'pointer',
                                                        fontWeight: '500',
                                                        transition: 'border-color 0.2s, box-shadow 0.2s'
                                                    }}
                                                    onFocus={e => {
                                                        e.target.style.borderColor = 'var(--brand-primary)';
                                                        e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.25)';
                                                    }}
                                                    onBlur={e => {
                                                        e.target.style.borderColor = 'var(--border-color)';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="teacher">Teacher</option>
                                                    <option value="parent">Parent</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <button
                                                    onClick={downloadTemplate}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.55rem 1rem',
                                                        borderRadius: '0.5rem',
                                                        border: '1px solid var(--border-color)',
                                                        background: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                        fontWeight: '600',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <Download size={15} /> Download {templateRole} template
                                                </button>
                                            </div>
                                        </div>
                                        {/* Column hints */}
                                        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            {(ROLE_TEMPLATES[templateRole]?.headers || []).map(h => (
                                                <span key={h} style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', background: (ROLE_TEMPLATES[templateRole]?.required || ['name','email','password','role']).includes(h) ? 'rgba(239,68,68,0.12)' : 'rgba(91,80,230,0.1)', color: (ROLE_TEMPLATES[templateRole]?.required || ['name','email','password','role']).includes(h) ? 'var(--danger)' : 'var(--brand-primary)' }}>
                                                    {h}{(ROLE_TEMPLATES[templateRole]?.required || ['name','email','password','role']).includes(h) ? ' *' : ''}
                                                </span>
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>* Required fields</p>
                                    </div>

                                    {/* File Upload */}
                                    <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border-color)', textAlign: 'center' }}>
                                        <Upload size={28} style={{ marginBottom: '0.5rem', color: 'var(--brand-primary)' }} />
                                        <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Upload your CSV file</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Supports all roles in a single file — students, teachers, parents, admins</p>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: 'var(--brand-primary)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
                                                    <FileText size={16} /> {csvFile ? csvFile.name : 'Browse CSV File'}
                                                    <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                                                </label>
                                            </div>

                                            {csvFile && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearAttachment}
                                                    title="Remove attachment"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        width: '28px', height: '28px', borderRadius: '50%',
                                                        background: 'rgba(239,68,68,0.12)', color: 'var(--danger)',
                                                        border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseOver={e => {
                                                        e.currentTarget.style.background = 'var(--danger)';
                                                        e.currentTarget.style.color = '#fff';
                                                    }}
                                                    onMouseOut={e => {
                                                        e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                                                        e.currentTarget.style.color = 'var(--danger)';
                                                    }}
                                                >
                                                    <X size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Live Preview Table */}
                                    {csvPreview.length > 0 && (
                                        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                                                        <FileText size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem', color: 'var(--brand-primary)' }} />
                                                        {csvFile?.name} — {csvPreview.length} rows
                                                    </span>
                                                    {Object.keys(csvErrors).length > 0 && (
                                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: '700' }}>
                                                            {Object.keys(csvErrors).length} error{Object.keys(csvErrors).length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                    {Object.keys(csvErrors).length === 0 && (
                                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(16,185,129,0.12)', color: 'var(--success)', fontSize: '0.75rem', fontWeight: '700' }}>
                                                            ✓ All rows valid
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={handleCsvUpload}
                                                    disabled={uploading}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', background: uploading ? '#6b7280' : 'var(--brand-primary)', color: '#fff', border: 'none', fontWeight: '700', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                                                >
                                                    {uploading ? <><Loader2 size={15} className="spin" /> Uploading...</> : <><Upload size={15} /> Upload {csvPreview.length} Users</>}
                                                </button>
                                            </div>

                                            {/* Progress bar */}
                                            {uploading && (
                                                <div style={{ height: '4px', background: 'var(--border-color)' }}>
                                                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--brand-primary)', transition: 'width 0.4s ease', borderRadius: '999px' }} />
                                                </div>
                                            )}

                                            <div style={{ overflowX: 'auto', maxHeight: '360px', overflowY: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                                                        <tr>
                                                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: '600', whiteSpace: 'nowrap' }}>#</th>
                                                            {csvHeaders.map(h => (
                                                                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                                                            ))}
                                                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: '600' }}>Status</th>
                                                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: '600' }}>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {csvPreview.map((row, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: csvErrors[idx] ? 'rgba(239,68,68,0.04)' : 'rgba(16,185,129,0.02)', transition: 'background 0.2s' }}>
                                                                <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-light)', fontWeight: '600', fontSize: '0.75rem' }}>{idx + 1}</td>
                                                                {csvHeaders.map(h => {
                                                                    const isRequired = (ROLE_TEMPLATES[row.role?.trim().toLowerCase()]?.required || ['name','email','password','role']).includes(h);
                                                                    const isEmpty = !row[h]?.trim();
                                                                    const isRoleField = h === 'role';
                                                                    return (
                                                                        <td key={h} style={{ padding: '0.2rem 0.4rem' }}>
                                                                            {isRoleField ? (
                                                                                <select
                                                                                    value={row[h] || ''}
                                                                                    onChange={e => handleCellEdit(idx, h, e.target.value)}
                                                                                    style={{
                                                                                        width: '100%', padding: '0.3rem 0.4rem',
                                                                                        borderRadius: '0.35rem', fontSize: '0.78rem',
                                                                                        border: `1px solid ${isEmpty && isRequired ? 'var(--danger)' : 'var(--border-color)'}`,
                                                                                        background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                                                                        outline: 'none', cursor: 'pointer'
                                                                                    }}
                                                                                >
                                                                                    <option value="">— select —</option>
                                                                                    <option value="student">student</option>
                                                                                    <option value="teacher">teacher</option>
                                                                                    <option value="parent">parent</option>
                                                                                    <option value="admin">admin</option>
                                                                                </select>
                                                                            ) : (
                                                                                <input
                                                                                    type={h === 'password' ? 'text' : 'text'}
                                                                                    value={row[h] || ''}
                                                                                    onChange={e => handleCellEdit(idx, h, e.target.value)}
                                                                                    placeholder={isRequired ? `${h} *` : h}
                                                                                    style={{
                                                                                        width: '100%', minWidth: h === 'email' || h === 'parentEmail' ? '160px' : '80px',
                                                                                        padding: '0.3rem 0.5rem',
                                                                                        borderRadius: '0.35rem', fontSize: '0.78rem',
                                                                                        border: `1px solid ${isEmpty && isRequired ? 'var(--danger)' : 'var(--border-color)'}`,
                                                                                        background: isEmpty && isRequired ? 'rgba(239,68,68,0.05)' : 'var(--bg-primary)',
                                                                                        color: 'var(--text-primary)', outline: 'none',
                                                                                        transition: 'border-color 0.15s, background 0.15s'
                                                                                    }}
                                                                                />
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td style={{ padding: '0.45rem 0.75rem', whiteSpace: 'nowrap', minWidth: '120px' }}>
                                                                    {csvErrors[idx]
                                                                        ? <span title={csvErrors[idx]} style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: '600', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}><span style={{flexShrink:0}}>⚠</span>{csvErrors[idx]}</span>
                                                                        : <span style={{ color: 'var(--success)', fontSize: '0.72rem', fontWeight: '600' }}>✓ OK</span>
                                                                    }
                                                                </td>
                                                                <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteRow(idx)}
                                                                        title="Remove row"
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: 'var(--text-light)',
                                                                            cursor: 'pointer',
                                                                            padding: '0.25rem',
                                                                            borderRadius: '0.25rem',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                        onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                                                                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-light)'}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload Result Summary */}
                                    {uploadResult && (
                                        <div style={{ borderRadius: 'var(--radius-md)', border: `1px solid ${uploadResult.success ? 'var(--success)' : 'var(--danger)'}`, overflow: 'hidden' }}>
                                            <div style={{ padding: '1rem 1.25rem', background: uploadResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                {uploadResult.success ? <CheckCircle size={20} color="var(--success)" /> : <AlertCircle size={20} color="var(--danger)" />}
                                                <div>
                                                    <p style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.1rem' }}>{uploadResult.data?.message || uploadResult.message}</p>
                                                    {uploadResult.success && (
                                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                                            <span style={{ color: 'var(--success)' }}>✅ {uploadResult.data?.successfulCount || 0} created</span>
                                                            <span style={{ color: 'var(--warning)' }}>⚠️ {uploadResult.data?.skippedCount || 0} skipped (duplicates)</span>
                                                            <span style={{ color: 'var(--danger)' }}>❌ {uploadResult.data?.failedCount || 0} failed</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {uploadResult.success && uploadResult.data?.skipped?.length > 0 && (
                                                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--warning)', marginBottom: '0.4rem' }}>⚠️ Skipped Duplicates:</p>
                                                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                        {uploadResult.data.skipped.map((s, i) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {uploadResult.data?.errors?.length > 0 && (
                                                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--danger)', marginBottom: '0.4rem' }}>❌ Failed Rows:</p>
                                                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                        {uploadResult.data.errors.map((err, i) => <li key={i}>{err}</li>)}
                                                    </ul>
                                                </div>
                                            )}
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
