import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen, Plus, Search, Trash2, Edit2, UserPlus,
  Users, Building, X, ChevronRight, Clock, Calendar
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SubjectManageScreen = ({ navigation }) => {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Form states
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    department_id: '',
    credits: '3',
  });

  const [allocForm, setAllocForm] = useState({
    subject_id: '',
    class_id: '',
    teacher_id: '',
    day_of_week: 'Monday',
    time_slot: '09:00 AM - 10:00 AM',
    room_number: '101',
  });

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [subRes, deptRes, classRes, teachRes] = await Promise.all([
        api.get('/admin/subjects'),
        api.get('/admin/departments').catch(() => ({ data: [] })),
        api.get('/admin/classes').catch(() => ({ data: [] })),
        api.get('/admin/teachers').catch(() => ({ data: [] })),
      ]);
      setSubjects(Array.isArray(subRes.data) ? subRes.data : []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
      setTeachers(Array.isArray(teachRes.data) ? teachRes.data : []);
    } catch (err) {
      console.error('Fetch subjects error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const handleCreateSubject = async () => {
    if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
      Alert.alert('Required Fields', 'Subject name and code are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/subjects', {
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim().toUpperCase(),
        department_id: subjectForm.department_id || (departments[0]?.id || null),
        credits: parseInt(subjectForm.credits, 10) || 3,
      });
      setShowAddSubject(false);
      setSubjectForm({ name: '', code: '', department_id: '', credits: '3' });
      Alert.alert('Success', 'Subject created successfully.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create subject.');
    } finally {
      setSaving(false);
    }
  };

  const handleAllocate = async () => {
    if (!allocForm.class_id || !allocForm.teacher_id) {
      Alert.alert('Required Fields', 'Please select both class and teacher.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/assign-subject', {
        subject_id: allocForm.subject_id,
        class_id: allocForm.class_id,
        teacher_id: allocForm.teacher_id,
        day_of_week: allocForm.day_of_week,
        time_slot: allocForm.time_slot,
        room_number: allocForm.room_number,
      });
      setShowAllocate(false);
      Alert.alert('Success', 'Subject allocated to class schedule successfully.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to allocate subject.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (subject) => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete ${subject.name || subject.subject_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/subjects/${subject.id}`);
              fetchData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete subject.');
            }
          }
        }
      ]
    );
  };

  const filtered = subjects.filter(s => {
    const q = search.toLowerCase();
    return !q ||
      (s.name || s.subject_name || '').toLowerCase().includes(q) ||
      (s.code || s.subject_code || '').toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Subjects & Allocations"
        subtitle={`${subjects.length} subjects registered`}
        rightAction={
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowAddSubject(true)}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        }
        navigation={navigation}
      />

      {/* Search Row */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search subjects by name or code..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, shadows.sm]}>
              <View style={styles.cardTop}>
                <View style={[styles.codeBadge, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={[styles.codeBadgeText, { color: colors.primary }]}>
                    {item.code || item.subject_code || 'SUB'}
                  </Text>
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.subjectTitle}>{item.name || item.subject_name}</Text>
                  <Text style={styles.deptText}>{item.department_name || 'General Department'}</Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Credits:</Text>
                  <Text style={styles.detailValue}>{item.credits || 3}</Text>
                </View>
                {item.teacher_name && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Faculty:</Text>
                    <Text style={styles.detailValue}>{item.teacher_name}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.allocBtn]}
                  onPress={() => {
                    setSelectedSubject(item);
                    setAllocForm(prev => ({ ...prev, subject_id: item.id }));
                    setShowAllocate(true);
                  }}
                >
                  <UserPlus size={14} color={colors.teacher} />
                  <Text style={[styles.actionBtnText, { color: colors.teacher }]}>Allocate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item)}
                >
                  <Trash2 size={14} color={colors.danger} />
                  <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <BookOpen size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Subjects Found</Text>
              <Text style={styles.emptySub}>Tap + above to create a new subject</Text>
            </View>
          }
        />
      )}

      {/* Add Subject Modal */}
      <Modal visible={showAddSubject} transparent animationType="slide" onRequestClose={() => setShowAddSubject(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.sheet} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Create Subject</Text>

            <Text style={styles.label}>Subject Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Operating Systems"
              placeholderTextColor={colors.textMuted}
              value={subjectForm.name}
              onChangeText={v => setSubjectForm(f => ({ ...f, name: v }))}
            />

            <Text style={styles.label}>Subject Code *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CS401"
              placeholderTextColor={colors.textMuted}
              value={subjectForm.code}
              onChangeText={v => setSubjectForm(f => ({ ...f, code: v }))}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {departments.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, subjectForm.department_id === d.id && styles.chipActive]}
                  onPress={() => setSubjectForm(f => ({ ...f, department_id: d.id }))}
                >
                  <Text style={[styles.chipText, subjectForm.department_id === d.id && { color: colors.primary }]}>
                    {d.department_name || d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Credits</Text>
            <TextInput
              style={styles.input}
              placeholder="3"
              placeholderTextColor={colors.textMuted}
              value={subjectForm.credits}
              onChangeText={v => setSubjectForm(f => ({ ...f, credits: v }))}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddSubject(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleCreateSubject}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Allocate Modal */}
      <Modal visible={showAllocate} transparent animationType="slide" onRequestClose={() => setShowAllocate(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.sheet} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Allocate {selectedSubject?.name || 'Subject'}</Text>

            <Text style={styles.label}>Select Class *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {classes.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, allocForm.class_id === c.id && styles.chipActive]}
                  onPress={() => setAllocForm(f => ({ ...f, class_id: c.id }))}
                >
                  <Text style={[styles.chipText, allocForm.class_id === c.id && { color: colors.teacher }]}>
                    {c.class_name || c.name} ({c.section || 'A'})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Select Faculty Teacher *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {teachers.map((t, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, allocForm.teacher_id === t.id && styles.chipActive]}
                  onPress={() => setAllocForm(f => ({ ...f, teacher_id: t.id }))}
                >
                  <Text style={[styles.chipText, allocForm.teacher_id === t.id && { color: colors.teacher }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Day of Week</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {DAYS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, allocForm.day_of_week === d && styles.chipActive]}
                  onPress={() => setAllocForm(f => ({ ...f, day_of_week: d }))}
                >
                  <Text style={[styles.chipText, allocForm.day_of_week === d && { color: colors.primary }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Time Slot</Text>
            <TextInput
              style={styles.input}
              value={allocForm.time_slot}
              onChangeText={v => setAllocForm(f => ({ ...f, time_slot: v }))}
              placeholder="e.g. 09:00 AM - 10:00 AM"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Room Number</Text>
            <TextInput
              style={styles.input}
              value={allocForm.room_number}
              onChangeText={v => setAllocForm(f => ({ ...f, room_number: v }))}
              placeholder="e.g. 101"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAllocate(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.teacher }, saving && { opacity: 0.6 }]}
                onPress={handleAllocate}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Allocate</Text>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  headerBtn: { backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, margin: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  searchInput: { flex: 1, color: colors.textPrimary, ...typography.sm },
  list: { padding: spacing.md, paddingTop: 0 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  codeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  codeBadgeText: { ...typography.xs, ...typography.bold },
  cardHeaderInfo: { flex: 1 },
  subjectTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  deptText: { ...typography.xs, color: colors.textMuted, marginTop: 1 },
  cardDetails: { flexDirection: 'row', gap: spacing.lg, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border + '66', marginBottom: spacing.sm },
  detailItem: { flexDirection: 'row', gap: 4 },
  detailLabel: { ...typography.xs, color: colors.textMuted },
  detailValue: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1 },
  allocBtn: { borderColor: colors.teacher + '44', backgroundColor: colors.teacher + '12' },
  deleteBtn: { borderColor: colors.danger + '44', backgroundColor: colors.danger + '12' },
  actionBtnText: { ...typography.xs, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.base, ...typography.semibold, color: colors.textSecondary },
  emptySub: { ...typography.sm, color: colors.textMuted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { ...typography.xl, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  label: { ...typography.sm, ...typography.semibold, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.base, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', marginBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, marginRight: spacing.xs },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  chipText: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bgElevated, alignItems: 'center' },
  cancelBtnText: { ...typography.sm, ...typography.semibold, color: colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default SubjectManageScreen;
