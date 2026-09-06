import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Pencil, X, Save, Building2, Layers, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react-native';
import Header from '../../components/Header';
import api from '../../api/client';
import { colors, spacing, radius } from '../../styles/theme';

/* ─── helpers ─── */
const getDeptName = (cls, departments) => {
  if (cls.departmentId?.departmentName) return cls.departmentId.departmentName;
  if (cls.departmentId?.name)           return cls.departmentId.name;
  if (typeof cls.departmentId === 'string') {
    const d = departments.find(d => d._id === cls.departmentId || d.id === cls.departmentId);
    return d?.departmentName || d?.name || 'N/A';
  }
  return cls.department_name || 'N/A';
};
const getDeptId    = cls => typeof cls.departmentId === 'string' ? cls.departmentId : (cls.departmentId?._id || cls.departmentId?.id || cls.department_id || '');
const getClassId   = c => c._id || c.id;
const getDId       = d => d._id || d.id;
const getClassName = c => c.className || c.name || '';
const getAcYear    = c => c.academicYear || c.year || '';

/* Inline banner component */
const Banner = ({ type, message, onDismiss }) => {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <View style={[bannerStyles.wrap, isError ? bannerStyles.errorWrap : bannerStyles.successWrap]}>
      {isError
        ? <AlertCircle size={15} color="#EF4444" />
        : <CheckCircle size={15} color="#10B981" />}
      <Text style={[bannerStyles.text, { color: isError ? '#EF4444' : '#10B981' }]}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={13} color={isError ? '#EF4444' : '#10B981'} />
        </TouchableOpacity>
      )}
    </View>
  );
};
const bannerStyles = StyleSheet.create({
  wrap:        { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 12, marginBottom: 12 },
  errorWrap:   { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  successWrap: { backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  text:        { flex: 1, fontSize: 13, fontWeight: '600' },
});

/* ─────────────── main component ─────────────── */
const AcademicManageScreen = () => {
  const [departments, setDepartments] = useState([]);
  const [classes,     setClasses]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  /* Banner state */
  const [banner, setBanner] = useState({ type: '', message: '' });
  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4500);
  };

  /* Dept form */
  const [newDeptName, setNewDeptName] = useState('');
  const [savingDept,  setSavingDept]  = useState(false);

  /* Class form */
  const [showClassModal, setShowClassModal] = useState(false);
  const [classForm,      setClassForm]      = useState({ className: '', departmentId: '', year: String(new Date().getFullYear()) });
  const [savingClass,    setSavingClass]    = useState(false);
  const [classError,     setClassError]     = useState('');

  /* Edit class */
  const [editingClass, setEditingClass] = useState(null);
  const [editForm,     setEditForm]     = useState({ className: '', departmentId: '', year: '' });
  const [savingEdit,   setSavingEdit]   = useState(false);
  const [editError,    setEditError]    = useState('');

  /* Delete Confirmation Modal state */
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'dept' | 'class', id, name, warning }
  const [deleting,     setDeleting]     = useState(false);

  /* fetch */
  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [dRes, cRes] = await Promise.all([
        api.get('/admin/departments').catch(() => ({ data: [] })),
        api.get('/admin/classes').catch(() => ({ data: [] })),
      ]);
      setDepartments(dRes.data || []);
      setClasses(cRes.data || []);
    } catch (e) {
      console.error('AcademicManage fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

  /* ─── Department CRUD ─── */
  const handleCreateDept = async () => {
    const name = newDeptName.trim();
    if (!name) { showBanner('error', 'Please enter a department name.'); return; }
    setSavingDept(true);
    try {
      await api.post('/admin/create-department', { departmentName: name });
      setNewDeptName('');
      showBanner('success', `Department "${name}" added successfully.`);
      fetchData(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create department.';
      console.error('createDept error:', err.response?.status, msg);
      showBanner('error', `[${err.response?.status || 'ERR'}] ${msg}`);
    } finally {
      setSavingDept(false);
    }
  };

  const promptDeleteDept = (dept) => {
    const name = dept.departmentName || dept.name;
    setDeleteTarget({
      type: 'dept',
      id: getDId(dept),
      name: name,
      warning: `Deleting "${name}" will also remove all associated classes and subjects within it.`,
    });
  };

  /* ─── Class CRUD ─── */
  const handleCreateClass = async () => {
    setClassError('');
    const name = classForm.className.trim();
    if (!name) { setClassError('Please enter a class name.'); return; }
    setSavingClass(true);
    try {
      await api.post('/admin/create-class', {
        className:    name,
        departmentId: classForm.departmentId || getDId(departments[0]) || null,
        year:         classForm.year || String(new Date().getFullYear()),
      });
      setShowClassModal(false);
      setClassForm({ className: '', departmentId: '', year: String(new Date().getFullYear()) });
      showBanner('success', `Class "${name}" created.`);
      fetchData(true);
    } catch (err) {
      setClassError(err.response?.data?.message || err.message || 'Failed to create class.');
    } finally {
      setSavingClass(false);
    }
  };

  const openEditClass = (cls) => {
    setEditError('');
    setEditingClass(cls);
    setEditForm({ className: getClassName(cls), departmentId: getDeptId(cls), year: String(getAcYear(cls)) });
  };

  const handleUpdateClass = async () => {
    setEditError('');
    const name = editForm.className.trim();
    if (!name) { setEditError('Class name is required.'); return; }
    setSavingEdit(true);
    try {
      await api.put(`/admin/class/${getClassId(editingClass)}`, {
        className:    name,
        departmentId: editForm.departmentId,
        year:         editForm.year,
      });
      setEditingClass(null);
      showBanner('success', `Class "${name}" updated.`);
      fetchData(true);
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'Failed to update class.');
    } finally {
      setSavingEdit(false);
    }
  };

  const promptDeleteClass = (cls) => {
    const name = getClassName(cls);
    setDeleteTarget({
      type: 'class',
      id: getClassId(cls),
      name: name,
      warning: `Deleting "${name}" will remove all subject allocations for this class.`,
    });
  };

  /* ─── Confirm Delete Action ─── */
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'dept') {
        await api.delete(`/admin/department/${deleteTarget.id}`);
        showBanner('success', `Department "${deleteTarget.name}" deleted.`);
      } else {
        await api.delete(`/admin/class/${deleteTarget.id}`);
        showBanner('success', `Class "${deleteTarget.name}" deleted.`);
      }
      setDeleteTarget(null);
      fetchData(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete.';
      console.error('Delete error:', err.response?.status, msg);
      showBanner('error', `[${err.response?.status || 'ERR'}] ${msg}`);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  /* ─── Dept chip picker (shared between modals) ─── */
  const DeptChipPicker = ({ value, onChange }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {departments.map(d => {
        const did = getDId(d);
        const active = value === did;
        return (
          <TouchableOpacity
            key={did}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onChange(did)}
          >
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
              {d.departmentName || d.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  /* ─────────────── render ─────────────── */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Departments & Classes" subtitle="Manage academic structure" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Global banner */}
        <Banner type={banner.type} message={banner.message} onDismiss={() => setBanner({ type: '', message: '' })} />

        {/* ══ DEPARTMENTS ══ */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Building2 size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Departments</Text>
          </View>

          {/* Inline add row */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="New Department Name"
              placeholderTextColor={colors.textMuted}
              value={newDeptName}
              onChangeText={setNewDeptName}
              onSubmitEditing={handleCreateDept}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addBtn, savingDept && { opacity: 0.6 }]}
              onPress={handleCreateDept}
              activeOpacity={0.8}
            >
              {savingDept
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Plus size={14} color="#fff" /><Text style={styles.addBtnText}>Add</Text></>
              }
            </TouchableOpacity>
          </View>

          {/* Dept chip grid */}
          {loading ? (
            <View style={styles.deptGrid}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={[styles.deptChipSkeleton, { width: i % 2 === 0 ? '47%' : '40%' }]} />
              ))}
            </View>
          ) : departments.length === 0 ? (
            <Text style={styles.emptyHint}>No departments yet. Add one above.</Text>
          ) : (
            <View style={styles.deptGrid}>
              {departments.map(dept => (
                <View key={getDId(dept)} style={styles.deptChip}>
                  <Text style={styles.deptChipText} numberOfLines={1}>
                    {dept.departmentName || dept.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => promptDeleteDept(dept)}
                    style={styles.deptDeleteBtn}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={15} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ══ CLASSES ══ */}
        <View style={[styles.section, { marginTop: spacing.md }]}>
          <View style={styles.sectionTitleRow}>
            <Layers size={18} color={colors.teacher || '#a78bfa'} />
            <Text style={[styles.sectionTitle, { color: colors.teacher || '#a78bfa', flex: 1 }]}>Classes</Text>
            <TouchableOpacity style={styles.addClassBtn} onPress={() => { setClassError(''); setShowClassModal(true); }} activeOpacity={0.8}>
              <Plus size={13} color="#fff" />
              <Text style={styles.addClassBtnText}>Add Class</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Class Name</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>Department</Text>
              <Text style={[styles.tableHeaderCell, { width: 46, textAlign: 'center' }]}>Year</Text>
              <Text style={[styles.tableHeaderCell, { width: 72, textAlign: 'center' }]}>Actions</Text>
            </View>

            {loading ? (
              [...Array(5)].map((_, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                  <View style={[styles.skeletonBox, { flex: 1.2, height: 11 }]} />
                  <View style={[styles.skeletonBox, { flex: 1.4, height: 11, marginHorizontal: 6 }]} />
                  <View style={[styles.skeletonBox, { width: 46, height: 11 }]} />
                  <View style={[styles.skeletonBox, { width: 72, height: 11 }]} />
                </View>
              ))
            ) : classes.length === 0 ? (
              <View style={styles.tableEmptyRow}>
                <Text style={styles.tableEmptyText}>No classes found.</Text>
              </View>
            ) : (
              classes.map((cls, index) => (
                <View key={getClassId(cls)} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 1.2 }]} numberOfLines={1}>{getClassName(cls)}</Text>
                  <Text style={[styles.tableCell, { flex: 1.4, color: colors.textSecondary }]} numberOfLines={1}>{getDeptName(cls, departments)}</Text>
                  <Text style={[styles.tableCell, { width: 46, textAlign: 'center', color: colors.textSecondary }]} numberOfLines={1}>{getAcYear(cls)}</Text>
                  <View style={styles.tableActions}>
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => openEditClass(cls)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Pencil size={14} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => promptDeleteClass(cls)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Trash2 size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* ══ DELETE CONFIRMATION MODAL ══ */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteTarget(null)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.deleteDialogCard}>
            <View style={styles.deleteIconBadge}>
              <AlertTriangle size={24} color={colors.danger} />
            </View>

            <Text style={styles.deleteDialogTitle}>
              Delete {deleteTarget?.type === 'dept' ? 'Department' : 'Class'}?
            </Text>

            <Text style={styles.deleteDialogItemName}>
              "{deleteTarget?.name}"
            </Text>

            <Text style={styles.deleteDialogWarning}>
              {deleteTarget?.warning}
            </Text>

            <View style={styles.deleteDialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleting && { opacity: 0.6 }]}
                onPress={handleExecuteDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Trash2 size={15} color="#fff" />
                    <Text style={styles.deleteConfirmBtnText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ ADD CLASS MODAL ══ */}
      <Modal visible={showClassModal} transparent animationType="slide" onRequestClose={() => setShowClassModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Add Class / Section</Text>
                <TouchableOpacity onPress={() => setShowClassModal(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Banner type="error" message={classError} onDismiss={() => setClassError('')} />
              <Text style={styles.formLabel}>Class Name (e.g. CS101-A) *</Text>
              <TextInput style={styles.formInput} value={classForm.className} onChangeText={v => setClassForm(f => ({ ...f, className: v }))} placeholder="Name & Section" placeholderTextColor={colors.textMuted} />
              <Text style={styles.formLabel}>Academic Year</Text>
              <TextInput style={styles.formInput} value={classForm.year} onChangeText={v => setClassForm(f => ({ ...f, year: v }))} placeholder={String(new Date().getFullYear())} placeholderTextColor={colors.textMuted} keyboardType="numeric" />
              {departments.length > 0 && (
                <>
                  <Text style={styles.formLabel}>Select Department</Text>
                  <DeptChipPicker value={classForm.departmentId} onChange={v => setClassForm(f => ({ ...f, departmentId: v }))} />
                </>
              )}
              <View style={styles.formBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowClassModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, savingClass && { opacity: 0.6 }]} onPress={handleCreateClass}>
                  {savingClass ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Add Class</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ EDIT CLASS MODAL ══ */}
      <Modal visible={!!editingClass} transparent animationType="slide" onRequestClose={() => setEditingClass(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Edit Class Details</Text>
                <TouchableOpacity onPress={() => setEditingClass(null)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Banner type="error" message={editError} onDismiss={() => setEditError('')} />
              <Text style={styles.formLabel}>Class Name *</Text>
              <TextInput style={styles.formInput} value={editForm.className} onChangeText={v => setEditForm(f => ({ ...f, className: v }))} placeholder="Name & Section" placeholderTextColor={colors.textMuted} />
              <Text style={styles.formLabel}>Academic Year</Text>
              <TextInput style={styles.formInput} value={editForm.year} onChangeText={v => setEditForm(f => ({ ...f, year: v }))} placeholder="e.g. 2026" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
              {departments.length > 0 && (
                <>
                  <Text style={styles.formLabel}>Department</Text>
                  <DeptChipPicker value={editForm.departmentId} onChange={v => setEditForm(f => ({ ...f, departmentId: v }))} />
                </>
              )}
              <View style={styles.formBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingClass(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, savingEdit && { opacity: 0.6 }]} onPress={handleUpdateClass}>
                  {savingEdit
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Save size={13} color="#fff" /><Text style={[styles.saveBtnText, { marginLeft: 4 }]}>Save Changes</Text></>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

/* ─────────────── styles ─────────────── */
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bgPrimary },
  scroll:        { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 60 },

  section: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  sectionTitle:    { fontSize: 16, fontWeight: '700' },

  addRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  addInput: {
    flex: 1,
    backgroundColor: colors.bgInput || colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 13,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  deptChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingLeft: spacing.sm, paddingRight: 4, paddingVertical: 6,
    gap: 4, maxWidth: '48%',
  },
  deptChipText: {
    fontSize: 13, fontWeight: '500', color: colors.textPrimary,
    flex: 1, minWidth: 0,
  },
  deptDeleteBtn: {
    padding: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deptChipSkeleton: { height: 36, borderRadius: radius.md, backgroundColor: colors.border, opacity: 0.35 },
  emptyHint:        { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },

  addClassBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6,
  },
  addClassBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  tableCard:       { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  tableHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgElevated,
    paddingVertical: 9, paddingHorizontal: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border + '55',
  },
  tableRowAlt:    { backgroundColor: 'rgba(255,255,255,0.02)' },
  tableCell:      { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  tableActions:   { width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionIconBtn:  {
    padding: 6, borderRadius: radius.sm, backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  tableEmptyRow:  { padding: spacing.lg, alignItems: 'center' },
  tableEmptyText: { fontSize: 13, color: colors.textMuted },
  skeletonBox:    { borderRadius: 4, backgroundColor: colors.border, opacity: 0.35, marginRight: 4 },

  /* Bottom sheet modal styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  formLabel: {
    fontSize: 11, color: colors.textSecondary, fontWeight: '600',
    marginBottom: 4, marginTop: spacing.sm,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  formInput: {
    backgroundColor: colors.bgInput || colors.bgElevated,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.textPrimary, fontSize: 14,
    paddingHorizontal: spacing.md, paddingVertical: 11, marginBottom: 4,
  },
  chipScroll: { marginTop: 4, marginBottom: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border,
    marginRight: spacing.xs,
  },
  filterChipActive:     { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  filterChipText:       { fontSize: 12, color: colors.textMuted },
  filterChipTextActive: { color: colors.primary, fontWeight: '700' },
  formBtns:      { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: radius.md,
    backgroundColor: colors.bgElevated, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 13, borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* Delete Confirmation Center Dialog */
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteDialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  deleteIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  deleteDialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  deleteDialogItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  deleteDialogWarning: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  deleteDialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

export default AcademicManageScreen;
