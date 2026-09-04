import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl,
  Alert, Modal, TextInput, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Layers, BookOpen, Plus, Trash2, Edit2, X } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const SectionHeader = ({ title, icon: Icon, count, color, onAdd }) => (
  <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
    <Icon size={16} color={color} />
    <Text style={[styles.sectionHeaderTitle, { color }]}>{title}</Text>
    <View style={[styles.countBadge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.countText, { color }]}>{count}</Text>
    </View>
    {onAdd && (
      <TouchableOpacity style={[styles.addSectionBtn, { backgroundColor: color + '22' }]} onPress={onAdd}>
        <Plus size={14} color={color} />
        <Text style={[styles.addSectionBtnText, { color }]}>Add</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ItemCard = ({ item, sectionKey, color, onEdit, onDelete }) => (
  <View style={[styles.itemCard, shadows.sm]}>
    <View style={[styles.itemDot, { backgroundColor: color }]} />
    <View style={styles.itemInfo}>
      <Text style={styles.itemName}>
        {item.name || item.className || item.departmentName || item.subjectName}
      </Text>
      {item.code && <Text style={styles.itemMeta}>Code: {item.code}</Text>}
      {item.academic_year && <Text style={styles.itemMeta}>Year: {item.academic_year}</Text>}
      {item.department_name && <Text style={styles.itemMeta}>{item.department_name}</Text>}
      {item.student_count !== undefined && (
        <Text style={styles.itemMeta}>{item.student_count} students</Text>
      )}
    </View>

    <View style={styles.cardActions}>
      {sectionKey === 'classes' && onEdit && (
        <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(item)}>
          <Edit2 size={15} color={colors.primary} />
        </TouchableOpacity>
      )}
      {(sectionKey === 'departments' || sectionKey === 'classes') && onDelete && (
        <TouchableOpacity style={styles.iconBtn} onPress={() => onDelete(item)}>
          <Trash2 size={15} color={colors.danger} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const AcademicManageScreen = () => {
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [submittingDept, setSubmittingDept] = useState(false);

  const [showClassModal, setShowClassModal] = useState(false);
  const [classForm, setClassForm] = useState({
    className: '',
    departmentId: '',
    year: new Date().getFullYear().toString(),
  });
  const [submittingClass, setSubmittingClass] = useState(false);

  const [editingClass, setEditingClass] = useState(null);
  const [editClassForm, setEditClassForm] = useState({
    className: '',
    departmentId: '',
    year: '',
  });
  const [submittingEditClass, setSubmittingEditClass] = useState(false);

  const fetchData = async () => {
    try {
      const [depRes, classRes, subjRes] = await Promise.all([
        api.get('/admin/departments').catch(() => ({ data: [] })),
        api.get('/admin/classes').catch(() => ({ data: [] })),
        api.get('/admin/subjects').catch(() => ({ data: [] })),
      ]);
      setDepartments(depRes.data || []);
      setClasses(classRes.data || []);
      setSubjects(subjRes.data || []);
      if (depRes.data?.length > 0 && !classForm.departmentId) {
        setClassForm(f => ({ ...f, departmentId: depRes.data[0].id }));
      }
    } catch (err) {
      console.error('Academic fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Department Handlers
  const handleCreateDept = async () => {
    if (!newDeptName.trim()) {
      Alert.alert('Required Field', 'Please enter a department name.');
      return;
    }
    setSubmittingDept(true);
    try {
      await api.post('/admin/create-department', { departmentName: newDeptName.trim() });
      setShowDeptModal(false);
      setNewDeptName('');
      Alert.alert('✅ Created', 'Department created successfully.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create department.');
    } finally {
      setSubmittingDept(false);
    }
  };

  const handleDeleteDept = (dept) => {
    Alert.alert(
      'Delete Department',
      `Deleting "${dept.name || dept.departmentName}" may affect associated classes and subjects. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/department/${dept.id}`);
              Alert.alert('Success', 'Department deleted.');
              fetchData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete department.');
            }
          },
        },
      ]
    );
  };

  // Class Handlers
  const handleCreateClass = async () => {
    if (!classForm.className.trim()) {
      Alert.alert('Required Field', 'Please enter a class name.');
      return;
    }
    setSubmittingClass(true);
    try {
      await api.post('/admin/create-class', {
        className: classForm.className.trim(),
        departmentId: classForm.departmentId || (departments[0]?.id || null),
        year: classForm.year || new Date().getFullYear().toString(),
      });
      setShowClassModal(false);
      setClassForm({
        className: '',
        departmentId: departments[0]?.id || '',
        year: new Date().getFullYear().toString(),
      });
      Alert.alert('✅ Created', 'Class created successfully.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create class.');
    } finally {
      setSubmittingClass(false);
    }
  };

  const handleOpenEditClass = (cls) => {
    setEditingClass(cls);
    setEditClassForm({
      className: cls.name || cls.className || '',
      departmentId: cls.department_id || cls.departmentId || '',
      year: cls.academic_year || cls.year || new Date().getFullYear().toString(),
    });
  };

  const handleUpdateClass = async () => {
    if (!editClassForm.className.trim()) {
      Alert.alert('Required Field', 'Class name is required.');
      return;
    }
    setSubmittingEditClass(true);
    try {
      await api.put(`/admin/class/${editingClass.id}`, {
        className: editClassForm.className.trim(),
        departmentId: editClassForm.departmentId,
        year: editClassForm.year,
      });
      setEditingClass(null);
      Alert.alert('✅ Updated', 'Class updated successfully.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update class.');
    } finally {
      setSubmittingEditClass(false);
    }
  };

  const handleDeleteClass = (cls) => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete class "${cls.name || cls.className}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/class/${cls.id}`);
              Alert.alert('Success', 'Class deleted.');
              fetchData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete class.');
            }
          },
        },
      ]
    );
  };

  if (loading) return <FullPageLoader message="Loading academic data..." />;

  const sections = [
    {
      key: 'departments',
      title: 'Departments',
      icon: Building2,
      color: colors.primary,
      data: departments,
      onAdd: () => setShowDeptModal(true),
    },
    {
      key: 'classes',
      title: 'Classes',
      icon: Layers,
      color: colors.teacher,
      data: classes,
      onAdd: () => setShowClassModal(true),
    },
    {
      key: 'subjects',
      title: 'Subjects',
      icon: BookOpen,
      color: colors.student,
      data: subjects,
      onAdd: null,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Academic Structure" subtitle="Departments, Classes & Subjects" />
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => item.id?.toString() || i.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            title={section.title}
            icon={section.icon}
            count={section.data.length}
            color={section.color}
            onAdd={section.onAdd}
          />
        )}
        renderItem={({ item, section }) => (
          <ItemCard
            item={item}
            sectionKey={section.key}
            color={section.color}
            onEdit={section.key === 'classes' ? handleOpenEditClass : null}
            onDelete={section.key === 'departments' ? handleDeleteDept : section.key === 'classes' ? handleDeleteClass : null}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No academic data found</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
      />

      {/* Add Department Modal */}
      <Modal visible={showDeptModal} transparent animationType="slide" onRequestClose={() => setShowDeptModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Department</Text>
            <Text style={styles.formLabel}>Department Name *</Text>
            <TextInput
              style={styles.formInput}
              value={newDeptName}
              onChangeText={setNewDeptName}
              placeholder="e.g. Computer Science & Engineering"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowDeptModal(false)} disabled={submittingDept}>
                <Text style={styles.formCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formSaveBtn, submittingDept && { opacity: 0.6 }]} onPress={handleCreateDept} disabled={submittingDept}>
                {submittingDept ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.formSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Class Modal */}
      <Modal visible={showClassModal} transparent animationType="slide" onRequestClose={() => setShowClassModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Class / Section</Text>

            <Text style={styles.formLabel}>Class Name *</Text>
            <TextInput
              style={styles.formInput}
              value={classForm.className}
              onChangeText={v => setClassForm(f => ({ ...f, className: v }))}
              placeholder="e.g. CS101-A"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.formLabel}>Academic Year</Text>
            <TextInput
              style={styles.formInput}
              value={classForm.year}
              onChangeText={v => setClassForm(f => ({ ...f, year: v }))}
              placeholder="e.g. 2026"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            {departments.length > 0 && (
              <>
                <Text style={styles.formLabel}>Select Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                  {departments.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.chip, classForm.departmentId === d.id && styles.chipActive]}
                      onPress={() => setClassForm(f => ({ ...f, departmentId: d.id }))}
                    >
                      <Text style={[styles.chipText, classForm.departmentId === d.id && styles.chipTextActive]}>
                        {d.name || d.departmentName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowClassModal(false)} disabled={submittingClass}>
                <Text style={styles.formCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formSaveBtn, submittingClass && { opacity: 0.6 }]} onPress={handleCreateClass} disabled={submittingClass}>
                {submittingClass ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.formSaveText}>Create Class</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Class Modal */}
      <Modal visible={!!editingClass} transparent animationType="slide" onRequestClose={() => setEditingClass(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Class</Text>

            <Text style={styles.formLabel}>Class Name *</Text>
            <TextInput
              style={styles.formInput}
              value={editClassForm.className}
              onChangeText={v => setEditClassForm(f => ({ ...f, className: v }))}
              placeholder="Class Name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.formLabel}>Academic Year</Text>
            <TextInput
              style={styles.formInput}
              value={editClassForm.year}
              onChangeText={v => setEditClassForm(f => ({ ...f, year: v }))}
              placeholder="Academic Year"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            {departments.length > 0 && (
              <>
                <Text style={styles.formLabel}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                  {departments.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.chip, editClassForm.departmentId === d.id && styles.chipActive]}
                      onPress={() => setEditClassForm(f => ({ ...f, departmentId: d.id }))}
                    >
                      <Text style={[styles.chipText, editClassForm.departmentId === d.id && styles.chipTextActive]}>
                        {d.name || d.departmentName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.formCancelBtn} onPress={() => setEditingClass(null)} disabled={submittingEditClass}>
                <Text style={styles.formCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formSaveBtn, submittingEditClass && { opacity: 0.6 }]} onPress={handleUpdateClass} disabled={submittingEditClass}>
                {submittingEditClass ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.formSaveText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  list: { padding: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeaderTitle: {
    ...typography.base,
    ...typography.bold,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  addSectionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  itemInfo: { flex: 1 },
  itemName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  itemMeta: { ...typography.sm, color: colors.textMuted, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: { padding: 6, borderRadius: radius.sm, backgroundColor: colors.bgElevated },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { ...typography.base, color: colors.textMuted },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: { ...typography.xl, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  formLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: spacing.xs },
  formInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...typography.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary,
  },
  chipText: { ...typography.xs, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  formButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  formCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bgElevated, alignItems: 'center' },
  formCancelText: { ...typography.sm, ...typography.semibold, color: colors.textSecondary },
  formSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  formSaveText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default AcademicManageScreen;
