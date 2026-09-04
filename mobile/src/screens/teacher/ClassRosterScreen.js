import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Search,
  X,
  GraduationCap,
  Mail,
  Phone,
  Hash,
  Edit3,
  Flame,
  Award,
  Check,
  Save,
  UserCheck,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ClassRosterScreen = () => {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);

  // Profile Dossier & Coordinator Edit State
  const [profileStats, setProfileStats] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', rollNumber: '', email: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/teacher/class-roster');
      setStudents(data || []);
      setFiltered(data || []);
      const list = Array.isArray(data) ? data : (data?.students || []);
      setStudents(list);
      setFiltered(list);
    } catch (err) {
      console.error('Roster fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleSelectStudent = async (student) => {
    setSelected(student);
    setIsEditing(false);
    setEditForm({
      name: student.name || '',
      rollNumber: student.roll_number || student.rollNumber || '',
      email: student.email || '',
    });
    setLoadingProfile(true);
    try {
      const studentId = student.id || student._id;
      const { data } = await api.get(`/teacher/student/${studentId}/profile`);
      setProfileStats(data);
    } catch (err) {
      console.error('Student profile load error:', err);
      setProfileStats(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveStudent = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      Alert.alert('Required Fields', 'Name and Email are required.');
      return;
    }
    setSavingEdit(true);
    try {
      const studentId = selected.id || selected._id;
      await api.put(`/teacher/student/${studentId}/update`, {
        name: editForm.name.trim(),
        rollNumber: editForm.rollNumber.trim(),
        email: editForm.email.trim().toLowerCase(),
      });
      Alert.alert('✅ Student Updated', 'Student profile updated successfully.');
      setIsEditing(false);
      fetchStudents();
      if (selected) {
        setSelected(prev => ({
          ...prev,
          name: editForm.name.trim(),
          roll_number: editForm.rollNumber.trim(),
          email: editForm.email.trim().toLowerCase(),
        }));
      }
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not update student.');
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    if (!search.trim()) { setFiltered(students); return; }
    const q = search.toLowerCase();
    setFiltered(students.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    ));
  }, [search, students]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchStudents(); }, []);

  const getAttendanceBadgeColor = (pct) => {
    if (pct >= 90) return colors.success;
    if (pct >= 75) return colors.warning;
    return colors.danger;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Class Roster" subtitle={`${students.length} students`} />

      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search students..."
          placeholderTextColor={colors.textMuted}
        />
        {!!search && <TouchableOpacity onPress={() => setSearch('')}><X size={16} color={colors.textMuted} /></TouchableOpacity>}
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => {
            const pct = item.attendance_percentage ?? item.attendance_pct;
            const badgeColor = pct !== undefined ? getAttendanceBadgeColor(pct) : colors.textMuted;
            return (
              <TouchableOpacity
                style={[styles.studentCard, shadows.sm]}
                onPress={() => setSelected(item)}
                onPress={() => handleSelectStudent(item)}
                activeOpacity={0.75}
              >
                <View style={[styles.avatar, { backgroundColor: colors.student + '22' }]}>
                  <GraduationCap size={20} color={colors.student} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{item.roll_number} {item.class_name ? `• ${item.class_name}` : ''}</Text>
                  <Text style={styles.meta}>{item.roll_number || item.rollNumber} {item.class_name ? `• ${item.class_name}` : ''}</Text>
                </View>
                {pct !== undefined && (
                  <View style={[styles.attendanceBadge, { backgroundColor: badgeColor + '22' }]}>
                    <Text style={[styles.attendanceText, { color: badgeColor }]}>{pct}%</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <GraduationCap size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          }
        />
      )}

      {/* Student Detail Modal */}
      {/* Student Detail & Coordinator Edit Modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalAvatar, { backgroundColor: colors.student + '22' }]}>
                    <GraduationCap size={30} color={colors.student} />
                  </View>
                  <Text style={styles.modalName}>{selected.name}</Text>
                  <Text style={styles.modalClass}>
                    {selected.class_name || selected.className || 'Class'} {selected.section ? `• Section ${selected.section}` : ''}
                  </Text>
                </View>
                <View style={styles.detailRows}>
                  {selected.roll_number && <DetailRow icon={<Hash size={15} color={colors.textMuted} />} label="Roll No" value={selected.roll_number} />}
                  {selected.email && <DetailRow icon={<Mail size={15} color={colors.textMuted} />} label="Email" value={selected.email} />}
                  {selected.phone && <DetailRow icon={<Phone size={15} color={colors.textMuted} />} label="Phone" value={selected.phone} />}
                  {selected.attendance_percentage !== undefined && (
                    <DetailRow label="Attendance" value={`${selected.attendance_percentage}%`} />
                  )}
                </View>

                {loadingProfile ? (
                  <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.teacher} />
                  </View>
                ) : (
                  <>
                    {/* Attendance & Streak KPIs */}
                    <View style={styles.kpiRow}>
                      <View style={styles.kpiCard}>
                        <Text style={styles.kpiVal}>
                          {profileStats?.stats?.attendancePercentage ?? selected.attendance_percentage ?? '—'}%
                        </Text>
                        <Text style={styles.kpiLbl}>Attendance</Text>
                      </View>
                      <View style={styles.kpiCard}>
                        <Text style={styles.kpiVal}>
                          {profileStats?.stats?.presentCount ?? '—'} / {profileStats?.stats?.totalClasses ?? '—'}
                        </Text>
                        <Text style={styles.kpiLbl}>Lectures</Text>
                      </View>
                      <View style={styles.kpiCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Flame size={14} color={colors.warning} />
                          <Text style={[styles.kpiVal, { color: colors.warning }]}>
                            {profileStats?.student?.streakCount ?? 0}
                          </Text>
                        </View>
                        <Text style={styles.kpiLbl}>Day Streak</Text>
                      </View>
                    </View>

                    {isEditing ? (
                      /* Coordinator Editing Form */
                      <View style={styles.editSection}>
                        <Text style={styles.editSectionTitle}>Coordinator Student Edit</Text>

                        <Text style={styles.fieldLabel}>Full Name</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={editForm.name}
                          onChangeText={v => setEditForm(f => ({ ...f, name: v }))}
                          placeholder="Student Name"
                          placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.fieldLabel}>Roll Number</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={editForm.rollNumber}
                          onChangeText={v => setEditForm(f => ({ ...f, rollNumber: v }))}
                          placeholder="e.g. 2024CS01"
                          placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.fieldLabel}>Email Address</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={editForm.email}
                          onChangeText={v => setEditForm(f => ({ ...f, email: v }))}
                          placeholder="student@example.com"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />

                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={styles.cancelEditBtn}
                            onPress={() => setIsEditing(false)}
                            disabled={savingEdit}
                          >
                            <Text style={styles.cancelEditText}>Cancel</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.saveEditBtn, savingEdit && { opacity: 0.6 }]}
                            onPress={handleSaveStudent}
                            disabled={savingEdit}
                          >
                            {savingEdit ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Save size={15} color="#fff" />
                                <Text style={styles.saveEditText}>Save Changes</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* Read-Only Dossier */
                      <>
                        <View style={styles.detailRows}>
                          {(selected.roll_number || selected.rollNumber) && (
                            <DetailRow icon={<Hash size={15} color={colors.textMuted} />} label="Roll No" value={selected.roll_number || selected.rollNumber} />
                          )}
                          {selected.email && (
                            <DetailRow icon={<Mail size={15} color={colors.textMuted} />} label="Email" value={selected.email} />
                          )}
                          {selected.phone && (
                            <DetailRow icon={<Phone size={15} color={colors.textMuted} />} label="Phone" value={selected.phone} />
                          )}
                        </View>

                        <TouchableOpacity
                          style={styles.openEditBtn}
                          onPress={() => setIsEditing(true)}
                        >
                          <Edit3 size={15} color={colors.teacher} />
                          <Text style={styles.openEditText}>Edit Student Profile</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    {icon && <View style={{ width: 22 }}>{icon}</View>}
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, margin: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: colors.textPrimary, ...typography.sm },
  list: { padding: spacing.md, paddingTop: 0 },
  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  info: { flex: 1 },
  name: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  meta: { ...typography.sm, color: colors.textMuted, marginTop: 2 },
  attendanceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  attendanceText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 50 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  modalHeader: { alignItems: 'center', marginBottom: spacing.lg },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  modalName: { ...typography.xl, ...typography.bold, color: colors.textPrimary },
  modalClass: { ...typography.sm, color: colors.textSecondary, marginTop: 4 },
  detailRows: { gap: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { ...typography.sm, color: colors.textMuted, width: 90 },
  detailValue: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiVal: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  kpiLbl: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  openEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.teacher + '15',
    borderWidth: 1,
    borderColor: colors.teacher + '44',
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.md,
  },
  openEditText: {
    ...typography.sm,
    ...typography.bold,
    color: colors.teacher,
  },
  editSection: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  editSectionTitle: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.xs,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 6,
  },
  fieldInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...typography.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelEditBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelEditText: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  saveEditBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.teacher,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  saveEditText: {
    ...typography.xs,
    ...typography.bold,
    color: '#fff',
  },
});

export default ClassRosterScreen;
