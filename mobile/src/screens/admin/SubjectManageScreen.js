import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Modal, TextInput, ActivityIndicator, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen, Plus, Trash2, Edit2, ChevronRight, Layers,
  GraduationCap, Building2, UserCheck, Users, X, Save,
  Search, CheckSquare, Square, AlertTriangle,
  CheckCircle, AlertCircle,
} from 'lucide-react-native';
import Header from '../../components/Header';
import api from '../../api/client';
import { colors, spacing, radius } from '../../styles/theme';

/* ─── helpers ─── */
const getDId      = d  => d._id || d.id;
const getDName    = d  => d.departmentName || d.name || '';
const getSubId    = s  => s._id || s.id;
const getSubName  = s  => s.subjectName || s.name || '';

/* ─── Banner ─── */
const Banner = ({ type, message, onDismiss }) => {
  if (!message) return null;
  const isErr = type === 'error';
  return (
    <View style={[bs.wrap, isErr ? bs.err : bs.ok]}>
      {isErr ? <AlertCircle size={14} color="#EF4444" /> : <CheckCircle size={14} color="#10B981" />}
      <Text style={[bs.txt, { color: isErr ? '#EF4444' : '#10B981' }]}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={13} color={isErr ? '#EF4444' : '#10B981'} />
      </TouchableOpacity>
    </View>
  );
};
const bs = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 12 },
  err:  { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  ok:   { backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  txt:  { flex: 1, fontSize: 13, fontWeight: '600' },
});

/* ─── Delete Confirm Modal ─── */
const DeleteDialog = ({ target, deptName, deleting, onConfirm, onCancel }) => {
  const isInDept = Boolean(deptName);
  const multiDept = target && target.assignedDepartments && target.assignedDepartments.length > 1;

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => !deleting && onCancel()}>
      <View style={dd.overlay}>
        <View style={dd.card}>
          <View style={dd.badge}>
            <AlertTriangle size={24} color={colors.danger} />
          </View>
          <Text style={dd.title}>Delete Subject?</Text>
          <Text style={dd.name}>"{target?.subjectName}"</Text>

          {isInDept && multiDept ? (
            <>
              <Text style={dd.warn}>
                This subject is offered in {target.assignedDepartments.length} departments. Choose how to remove it:
              </Text>

              <TouchableOpacity
                style={[dd.optBtn, deleting && { opacity: 0.5 }]}
                onPress={() => onConfirm(false)}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <>
                    <Trash2 size={14} color={colors.danger} />
                    <View style={{ flex: 1 }}>
                      <Text style={dd.optTitle}>Remove from "{deptName}" only</Text>
                      <Text style={dd.optHint}>Keeps the subject in other departments</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[dd.optBtnAll, deleting && { opacity: 0.5 }]}
                onPress={() => onConfirm(true)}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Trash2 size={14} color="#fff" />
                    <View style={{ flex: 1 }}>
                      <Text style={dd.optTitleAll}>Delete from all departments</Text>
                      <Text style={dd.optHintAll}>Permanently removes subject everywhere</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[dd.cancel, { width: '100%', marginTop: 4 }]} onPress={onCancel} disabled={deleting}>
                <Text style={dd.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={dd.warn}>
                {isInDept
                  ? `This will remove "${target?.subjectName}" from the ${deptName} department and its class allocations.`
                  : 'This will remove the subject from all assigned departments and class allocations.'}
              </Text>
              <View style={dd.row}>
                <TouchableOpacity style={dd.cancel} onPress={onCancel} disabled={deleting}>
                  <Text style={dd.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[dd.confirm, deleting && { opacity: 0.6 }]}
                  onPress={() => onConfirm(!isInDept)}
                  disabled={deleting}
                >
                  {deleting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Trash2 size={14} color="#fff" /><Text style={dd.confirmTxt}>Delete</Text></>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const dd = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card:        { width: '100%', maxWidth: 370, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  badge:       { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title:       { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  name:        { fontSize: 15, fontWeight: '600', color: colors.danger, marginBottom: spacing.xs },
  warn:        { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: spacing.md },
  row:         { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  cancel:      { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bgElevated, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelTxt:   { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  confirm:     { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  confirmTxt:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  optBtn:      { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', padding: 12, borderRadius: radius.md, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1.5, borderColor: colors.danger, marginBottom: 8 },
  optTitle:    { fontSize: 13, fontWeight: '700', color: colors.danger },
  optHint:     { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  optBtnAll:   { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', padding: 12, borderRadius: radius.md, backgroundColor: colors.danger, marginBottom: 8 },
  optTitleAll: { fontSize: 13, fontWeight: '700', color: '#fff' },
  optHintAll:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
});

/* ══════════════════════════════════════════════════════════════ */
const SubjectManageScreen = () => {
  const [rawSubjects,  setRawSubjects]  = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  /* navigation state */
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [search, setSearch] = useState('');

  /* banner */
  const [banner, setBanner] = useState({ type: '', message: '' });
  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4500);
  };

  /* create/edit modal */
  const [showModal,  setShowModal]  = useState(false);
  const [isEditing,  setIsEditing]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');
  const [form, setForm] = useState({ subjectIds: [], subjectName: '', departmentIds: [] });

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  /* ─── fetch ─── */
  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [sRes, dRes] = await Promise.all([
        api.get('/admin/subjects').catch(() => ({ data: [] })),
        api.get('/admin/departments').catch(() => ({ data: [] })),
      ]);
      setRawSubjects(Array.isArray(sRes.data) ? sRes.data : []);
      setDepartments(Array.isArray(dRes.data) ? dRes.data : []);
    } catch (e) {
      console.error('SubjectManage fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

  /* ─── Group raw subjects by name (same logic as web) ─── */
  const groupedSubjects = useMemo(() => {
    const map = new Map();
    rawSubjects.forEach(sub => {
      const subName = (sub.subjectName || sub.name || '').trim();
      if (!subName) return;
      const key = subName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          _id: sub._id || sub.id,
          subjectName: subName,
          subjectIds: [],
          departmentIds: new Set(),
          assignedDepartments: [],
          handlingTeachers: [],
        });
      }
      const item = map.get(key);
      const subId = sub._id || sub.id;
      if (subId && !item.subjectIds.includes(subId)) item.subjectIds.push(subId);

      (sub.assignedDepartments || []).forEach(d => {
        const dName = (d.departmentName || d.name || '').trim();
        if (dName && !item.assignedDepartments.some(ex => ex.departmentName.toLowerCase() === dName.toLowerCase())) {
          item.assignedDepartments.push({ id: d.id || d._id, departmentName: dName });
        }
        if (d.id || d._id) item.departmentIds.add(String(d.id || d._id));
      });

      if (sub.departmentId) {
        const pId   = String(sub.departmentId._id || sub.departmentId.id || sub.departmentId);
        const pName = (sub.departmentId.departmentName || sub.departmentId.name || '').trim();
        item.departmentIds.add(pId);
        if (pName && !item.assignedDepartments.some(ex => ex.departmentName.toLowerCase() === pName.toLowerCase())) {
          item.assignedDepartments.push({ id: pId, departmentName: pName });
        }
      }

      (sub.handlingTeachers || []).forEach(t => {
        const k = `${t.teacherId}-${t.className || ''}`;
        if (!item.handlingTeachers.some(ex => `${ex.teacherId}-${ex.className || ''}` === k)) {
          item.handlingTeachers.push(t);
        }
      });
    });
    return Array.from(map.values()).map(item => ({
      ...item,
      departmentIds: Array.from(item.departmentIds),
    }));
  }, [rawSubjects]);

  /* ─── Department stats (subject count per dept) ─── */
  const departmentStats = useMemo(() => {
    const seen = new Set();
    return departments
      .filter(dept => {
        const key = getDName(dept).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(dept => {
        const dIdStr   = String(getDId(dept));
        const dNameLow = getDName(dept).toLowerCase();
        const count    = groupedSubjects.filter(s =>
          s.departmentIds.includes(dIdStr) ||
          s.assignedDepartments.some(d => d.departmentName.toLowerCase() === dNameLow)
        ).length;
        return { ...dept, departmentName: getDName(dept), subjectCount: count };
      });
  }, [groupedSubjects, departments]);

  const activeDept = useMemo(() =>
    departments.find(d => String(getDId(d)) === String(selectedDeptId)),
    [departments, selectedDeptId]
  );

  /* ─── Filtered subjects for dept view ─── */
  const filteredSubjects = useMemo(() => {
    if (!selectedDeptId) return groupedSubjects;
    const dIdStr  = String(selectedDeptId);
    const dNameLow = (activeDept ? getDName(activeDept) : '').toLowerCase();
    return groupedSubjects.filter(s => {
      const matchDept = s.departmentIds.includes(dIdStr) ||
        s.assignedDepartments.some(d => d.departmentName.toLowerCase() === dNameLow);
      const matchSearch = search.trim()
        ? s.subjectName.toLowerCase().includes(search.toLowerCase())
        : true;
      return matchDept && matchSearch;
    });
  }, [groupedSubjects, selectedDeptId, activeDept, search]);

  /* ─── CRUD ─── */
  const openCreate = () => {
    setIsEditing(false);
    setFormError('');
    setForm({
      subjectIds: [],
      subjectName: '',
      departmentIds: selectedDeptId ? [String(selectedDeptId)] : [],
    });
    setShowModal(true);
  };

  const openEdit = (subject) => {
    setIsEditing(true);
    setFormError('');
    setForm({
      subjectIds: subject.subjectIds || [subject._id],
      subjectName: subject.subjectName,
      departmentIds: subject.departmentIds || [],
    });
    setShowModal(true);
  };

  const toggleDept = (dId) => {
    const idStr = String(dId);
    setForm(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(idStr)
        ? prev.departmentIds.filter(i => i !== idStr)
        : [...prev.departmentIds, idStr],
    }));
  };

  const toggleSelectAll = () => {
    setForm(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.length === departments.length
        ? []
        : departments.map(d => String(getDId(d))),
    }));
  };

  const handleSave = async () => {
    setFormError('');
    const name = form.subjectName.trim();
    if (!name)                      { setFormError('Subject name is required.'); return; }
    if (form.departmentIds.length === 0) { setFormError('Select at least one department.'); return; }
    setSaving(true);
    try {
      const payload = {
        subjectName:   name,
        departmentIds: form.departmentIds,
        departmentId:  form.departmentIds[0],
      };
      if (isEditing) {
        const targetId = form.subjectIds[0] || form._id;
        await api.put(`/admin/subjects/${targetId}`, payload);
        showBanner('success', `"${name}" updated.`);
      } else {
        await api.post('/admin/subjects', payload);
        showBanner('success', `"${name}" created successfully.`);
      }
      setShowModal(false);
      fetchData(true);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteDelete = async (deleteAll) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteAll) {
        // Delete from ALL departments — send all IDs
        const primaryId = deleteTarget.subjectIds[0] || deleteTarget._id;
        await api.delete(`/admin/subjects/${primaryId}`, {
          data: { ids: deleteTarget.subjectIds, name: deleteTarget.subjectName },
        });
        showBanner('success', `"${deleteTarget.subjectName}" deleted from all departments.`);
      } else {
        // Delete only from current department — find the matching single subject ID
        const deptIdStr = String(selectedDeptId);
        const deptNameLow = activeDept ? getDName(activeDept).toLowerCase() : '';
        const matchingRaw = rawSubjects.find(r => {
          const rName = (r.subjectName || r.name || '').trim().toLowerCase();
          if (rName !== deleteTarget.subjectName.toLowerCase()) return false;
          const rDeptId = String(
            r.departmentId?._id || r.departmentId?.id || r.departmentId || ''
          );
          if (rDeptId === deptIdStr) return true;
          return (r.assignedDepartments || []).some(d => {
            const dId = String(d.id || d._id || '');
            const dName = (d.departmentName || d.name || '').toLowerCase();
            return dId === deptIdStr || dName === deptNameLow;
          });
        });

        const targetId = matchingRaw
          ? (matchingRaw._id || matchingRaw.id)
          : (deleteTarget.subjectIds[0] || deleteTarget._id);

        await api.delete(`/admin/subjects/${targetId}`);
        showBanner('success', `"${deleteTarget.subjectName}" removed from ${activeDept ? getDName(activeDept) : 'this department'}.`);
      }
      setDeleteTarget(null);
      fetchData(true);
    } catch (err) {
      showBanner('error', err.response?.data?.message || 'Failed to delete subject.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  /* ─────────────── render ─────────────── */
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header
        title={selectedDeptId ? (activeDept ? getDName(activeDept) : 'Subjects') : 'Manage Subjects'}
        subtitle={selectedDeptId ? `Subjects in ${activeDept ? getDName(activeDept) : ''}` : 'Select a department to manage curriculum'}
        showBack={!!selectedDeptId}
        onBack={() => { setSelectedDeptId(null); setSearch(''); }}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Banner */}
        <Banner type={banner.type} message={banner.message} onDismiss={() => setBanner({ type: '', message: '' })} />

        {/* Search bar — dept view only */}
        {selectedDeptId && (
          <View style={s.searchBar}>
            <Search size={15} color={colors.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Search subjects…"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── DEPARTMENT CARDS (initial view) ── */}
        {!selectedDeptId && (
          loading ? (
            <View style={s.deptGrid}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={[s.deptCard, s.skeleton]} />
              ))}
            </View>
          ) : departmentStats.length === 0 ? (
            <View style={s.emptyBox}>
              <BookOpen size={40} color={colors.textMuted} />
              <Text style={s.emptyTitle}>No Departments Found</Text>
              <Text style={s.emptyHint}>Add departments first to manage subjects.</Text>
            </View>
          ) : (
            <View style={s.deptGrid}>
              {departmentStats.map(dept => (
                <TouchableOpacity
                  key={String(getDId(dept))}
                  style={s.deptCard}
                  onPress={() => setSelectedDeptId(getDId(dept))}
                  activeOpacity={0.75}
                >
                  <View style={s.deptCardTop}>
                    <View style={s.deptIconBadge}>
                      <Layers size={20} color={colors.primary} />
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </View>
                  <Text style={s.deptCardName} numberOfLines={2}>{dept.departmentName}</Text>
                  <View style={s.deptCardCount}>
                    <BookOpen size={13} color={colors.textSecondary} />
                    <Text style={s.deptCardCountTxt}>{dept.subjectCount} {dept.subjectCount === 1 ? 'Subject' : 'Subjects'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* ── SUBJECT CARDS (dept drill-down view) ── */}
        {selectedDeptId && (
          loading ? (
            <View style={{ gap: spacing.md }}>
              {[...Array(3)].map((_, i) => <View key={i} style={[s.subjectCard, s.skeleton, { height: 140 }]} />)}
            </View>
          ) : filteredSubjects.length === 0 ? (
            <View style={s.emptyBox}>
              <BookOpen size={40} color={colors.textMuted} />
              <Text style={s.emptyTitle}>No Subjects Found</Text>
              <Text style={s.emptyHint}>
                {search ? 'No subjects match your search.' : 'No subjects listed in this department yet.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {filteredSubjects.map(subject => (
                <View key={subject.subjectName} style={s.subjectCard}>
                  {/* Card header */}
                  <View style={s.subjectCardHeader}>
                    <View style={s.subjectIconBadge}>
                      <GraduationCap size={18} color="#fff" />
                    </View>
                    <Text style={s.subjectName} numberOfLines={2}>{subject.subjectName}</Text>
                    <View style={s.subjectActions}>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => openEdit(subject)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Edit2 size={14} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
                        onPress={() => setDeleteTarget(subject)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Trash2 size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Assigned Departments */}
                  <View style={s.infoBlock}>
                    <View style={s.infoBlockLabel}>
                      <Building2 size={12} color={colors.primary} />
                      <Text style={s.infoBlockLabelTxt}>Offered in Departments</Text>
                    </View>
                    <View style={s.chipRow}>
                      {subject.assignedDepartments.length > 0 ? (
                        subject.assignedDepartments.map((d, idx) => (
                          <View key={d.id || idx} style={s.deptChip}>
                            <Text style={s.deptChipTxt}>{d.departmentName}</Text>
                          </View>
                        ))
                      ) : (
                        <View style={s.deptChip}>
                          <Text style={s.deptChipTxt}>{activeDept ? getDName(activeDept) : 'General'}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Handling Faculty */}
                  <View style={s.infoBlock}>
                    <View style={s.infoBlockLabel}>
                      <UserCheck size={12} color="#10B981" />
                      <Text style={[s.infoBlockLabelTxt, { color: '#10B981' }]}>Handling Faculty</Text>
                    </View>
                    <View style={s.chipRow}>
                      {subject.handlingTeachers.length > 0 ? (
                        subject.handlingTeachers.map((t, idx) => (
                          <View key={t.teacherId || idx} style={s.teacherChip}>
                            <Users size={11} color="#10B981" />
                            <Text style={s.teacherChipTxt}>
                              {t.teacherName}{t.className ? ` (${t.className})` : ''}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={s.noFacultyTxt}>No faculty allocated yet</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>

      {/* ─── Floating Action Button (bottom-right) ─── */}
      <TouchableOpacity style={s.fab} onPress={openCreate} activeOpacity={0.85}>
        <Plus size={22} color="#fff" />
      </TouchableOpacity>

      {/* ─── Delete Confirmation Modal ─── */}
      <DeleteDialog
        target={deleteTarget}
        deptName={selectedDeptId && activeDept ? getDName(activeDept) : null}
        deleting={deleting}
        onConfirm={handleExecuteDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />

      {/* ─── Create / Edit Subject Modal ─── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => !saving && setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />

              {/* Modal title row */}
              <View style={s.modalTitleRow}>
                <View style={s.modalIconBadge}>
                  <GraduationCap size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalTitle}>{isEditing ? 'Edit Subject' : 'New Subject'}</Text>
                  <Text style={s.modalSubtitle}>
                    {isEditing ? 'Update subject and department assignments' : 'Add a subject across one or more departments'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowModal(false)} disabled={saving}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Error banner */}
              <Banner type="error" message={formError} onDismiss={() => setFormError('')} />

              {/* Subject Name */}
              <Text style={s.formLabel}>Subject Name *</Text>
              <TextInput
                style={s.formInput}
                placeholder="e.g. Data Structures & Algorithms"
                placeholderTextColor={colors.textMuted}
                value={form.subjectName}
                onChangeText={v => setForm(f => ({ ...f, subjectName: v }))}
              />

              {/* Department multi-select */}
              <View style={s.deptSelectHeader}>
                <Text style={s.formLabel}>
                  Assigned Departments * ({form.departmentIds.length} selected)
                </Text>
                <TouchableOpacity onPress={toggleSelectAll}>
                  <Text style={s.selectAllTxt}>
                    {form.departmentIds.length === departments.length ? 'Clear All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={s.deptCheckScroll} nestedScrollEnabled>
                <View style={s.deptCheckGrid}>
                  {departments.map(dept => {
                    const idStr     = String(getDId(dept));
                    const isChecked = form.departmentIds.includes(idStr);
                    return (
                      <TouchableOpacity
                        key={idStr}
                        style={[s.deptCheckItem, isChecked && s.deptCheckItemActive]}
                        onPress={() => toggleDept(idStr)}
                        activeOpacity={0.7}
                      >
                        {isChecked
                          ? <CheckSquare size={16} color={colors.primary} />
                          : <Square size={16} color={colors.textMuted} />}
                        <Text style={[s.deptCheckTxt, isChecked && s.deptCheckTxtActive]} numberOfLines={1}>
                          {getDName(dept)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Action buttons */}
              <View style={s.formBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)} disabled={saving}>
                  <Text style={s.cancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Save size={14} color="#fff" /><Text style={s.saveBtnTxt}>{isEditing ? 'Update Subject' : 'Create Subject'}</Text></>
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

/* ─── Styles ─── */
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bgPrimary },
  scroll:       { flex: 1 },
  scrollContent:{ padding: spacing.md, paddingBottom: 90 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },

  /* Dept Grid */
  deptGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
  },
  deptCard: {
    width: '47%', backgroundColor: colors.bgCard,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  deptCardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  deptIconBadge:    { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  deptCardName:     { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 6, lineHeight: 20 },
  deptCardCount:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deptCardCountTxt: { fontSize: 12, color: colors.textSecondary },

  skeleton: { backgroundColor: colors.bgCard, opacity: 0.4, height: 120 },

  /* Subject Card */
  subjectCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    gap: spacing.sm,
  },
  subjectCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subjectIconBadge:  {
    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  subjectName:    { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary, lineHeight: 20 },
  subjectActions: { flexDirection: 'row', gap: 8 },
  actionBtn:      { padding: 7, borderRadius: radius.sm, backgroundColor: colors.primary + '14', alignItems: 'center', justifyContent: 'center' },

  infoBlock:      { backgroundColor: colors.bgElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, gap: 6 },
  infoBlockLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoBlockLabelTxt: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  deptChip:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary + '40' },
  deptChipTxt:    { fontSize: 11, fontWeight: '600', color: colors.primary },
  teacherChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  teacherChipTxt: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  noFacultyTxt:   { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },

  /* Empty state */
  emptyBox:   { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  emptyHint:  { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  /* FAB */
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8,
  },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: 40, maxHeight: '90%',
  },
  modalHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  modalTitleRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  modalIconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalTitle:     { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  modalSubtitle:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  formLabel: {
    fontSize: 11, color: colors.textSecondary, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.4,
    marginBottom: 6, marginTop: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.bgElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    color: colors.textPrimary, fontSize: 14,
    paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: 4,
  },

  deptSelectHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  selectAllTxt:     { fontSize: 12, fontWeight: '700', color: colors.primary },

  deptCheckScroll: { maxHeight: 180, marginTop: 6 },
  deptCheckGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  deptCheckItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.sm, paddingVertical: 8,
    borderRadius: 8, backgroundColor: colors.bgElevated,
    borderWidth: 1.5, borderColor: colors.border,
    maxWidth: '48%',
  },
  deptCheckItemActive: { backgroundColor: colors.primary + '18', borderColor: colors.primary },
  deptCheckTxt:        { fontSize: 12, color: colors.textSecondary, flex: 1 },
  deptCheckTxtActive:  { color: colors.primary, fontWeight: '700' },

  formBtns:      { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:     { flex: 1, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.bgElevated, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelBtnTxt:  { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  saveBtn:       { flex: 2, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveBtnTxt:    { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default SubjectManageScreen;
