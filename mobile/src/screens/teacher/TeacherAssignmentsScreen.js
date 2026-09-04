import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Plus, Calendar, X, ChevronDown, Users, CheckCircle, FileText } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_COLORS = { active: colors.success, submitted: colors.primary, graded: colors.teacher, expired: colors.textMuted };

const TeacherAssignmentsScreen = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', subject_id: '', due_date: '' });

  // Submissions & Grading states
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [gradeForm, setGradeForm] = useState({ grade: 'A', comments: '' });

  const fetchData = async () => {
    try {
      const [asgRes, subjRes] = await Promise.all([
        api.get('/teacher/assignments').catch(() => ({ data: [] })),
        api.get('/teacher/subjects').catch(() => ({ data: [] })),
      ]);
      setAssignments(asgRes.data || []);
      setSubjects(subjRes.data || []);
      if (subjRes.data?.length > 0 && !form.subject_id) {
        setForm(f => ({ ...f, subject_id: subjRes.data[0].subject_id || subjRes.data[0].id }));
      }
    } catch (err) {
      console.error('Assignments fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) { Alert.alert('Missing Field', 'Please enter a title.'); return; }
    if (!form.due_date.trim()) { Alert.alert('Missing Field', 'Please enter a due date (YYYY-MM-DD).'); return; }
    setCreating(true);
    try {
      await api.post('/teacher/assignments', form);
      setShowCreate(false);
      setForm(f => ({ ...f, title: '', description: '', due_date: '' }));
      Alert.alert('✅ Created', 'Assignment created successfully.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create assignment.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmissionsModal(true);
    setLoadingSubmissions(true);
    try {
      const { data } = await api.get(`/teacher/assignments/${assignment.id}/submissions`);
      setSubmissions(data?.submissions || []);
    } catch (err) {
      console.error('Submissions error:', err);
      Alert.alert('Error', 'Could not load student submissions.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!selectedAssignment || !selectedStudent) return;
    try {
      await api.post(`/teacher/assignments/${selectedAssignment.id}/grade`, {
        studentId: selectedStudent.student_id,
        grade: gradeForm.grade,
        teacherComments: gradeForm.comments,
      });
      setShowGradeModal(false);
      Alert.alert('✅ Graded', 'Grade and feedback submitted successfully.');
      // Refresh submissions
      handleOpenSubmissions(selectedAssignment);
    } catch (err) {
      Alert.alert('Grading Error', err.response?.data?.message || 'Failed to submit grade.');
    }
  };

  if (loading) return <FullPageLoader message="Loading assignments..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Assignments"
        subtitle={`${assignments.length} total`}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Plus size={18} color={colors.teacher} />
          </TouchableOpacity>
        }
        showLogout={false}
      />

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || colors.textMuted;
          const dueDate = item.due_date ? new Date(item.due_date).toLocaleDateString() : '—';
          return (
            <View style={[styles.card, shadows.sm]}>
              <View style={styles.cardHeader}>
                <BookOpen size={18} color={colors.teacher} />
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{item.status || 'active'}</Text>
                </View>
              </View>
              {item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
              <View style={styles.cardFooter}>
                <Text style={styles.subjectName}>{item.subject_name || '—'}</Text>
                <View style={styles.dueDateRow}>
                  <Calendar size={13} color={colors.textMuted} />
                  <Text style={styles.dueDate}>{dueDate}</Text>
                </View>
              </View>
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.reviewSubmissionsBtn}
                  onPress={() => handleOpenSubmissions(item)}
                >
                  <Users size={14} color={colors.teacher} />
                  <Text style={styles.reviewSubmissionsText}>Review Submissions</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BookOpen size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No assignments yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyBtnText}>Create First Assignment</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Submissions & Grading Modal */}
      <Modal visible={showSubmissionsModal} transparent animationType="slide" onRequestClose={() => setShowSubmissionsModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '90%' }]}>
            <View style={styles.handle} />
            <View style={styles.submissionsHeader}>
              <View>
                <Text style={styles.sheetTitle}>Submissions</Text>
                <Text style={styles.subSubtitle}>{selectedAssignment?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSubmissionsModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingSubmissions ? (
              <ActivityIndicator size="large" color={colors.teacher} style={{ padding: 40 }} />
            ) : (
              <FlatList
                data={submissions}
                keyExtractor={(item, i) => item.student_id?.toString() || i.toString()}
                renderItem={({ item }) => (
                  <View style={styles.submissionCard}>
                    <View style={styles.subTop}>
                      <Text style={styles.subStudentName}>{item.student_name}</Text>
                      <View style={[styles.statusBadge, {
                        backgroundColor: item.status === 'graded' ? colors.success + '22' : item.status === 'submitted' ? colors.warning + '22' : colors.bgElevated
                      }]}>
                        <Text style={[styles.statusText, {
                          color: item.status === 'graded' ? colors.success : item.status === 'submitted' ? colors.warning : colors.textMuted
                        }]}>{item.status || 'Pending'}</Text>
                      </View>
                    </View>
                    <Text style={styles.subRoll}>Roll: {item.roll_number || '—'}</Text>
                    {item.grade && <Text style={styles.subGrade}>Grade: {item.grade}</Text>}
                    {item.teacher_comments && (
                      <Text style={styles.subComments}>Feedback: {item.teacher_comments}</Text>
                    )}

                    <TouchableOpacity
                      style={styles.gradeBtn}
                      onPress={() => {
                        setSelectedStudent(item);
                        setGradeForm({ grade: item.grade || 'A', comments: item.teacher_comments || '' });
                        setShowGradeModal(true);
                      }}
                    >
                      <Text style={styles.gradeBtnText}>{item.grade ? 'Update Grade' : 'Enter Grade'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={<Text style={styles.emptySubmissionsText}>No students enrolled in this class yet.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Grade Entry Modal */}
      <Modal visible={showGradeModal} transparent animationType="fade" onRequestClose={() => setShowGradeModal(false)}>
        <View style={styles.gradeOverlay}>
          <View style={styles.gradeDialog}>
            <Text style={styles.gradeDialogTitle}>Grade Submission</Text>
            <Text style={styles.gradeDialogSub}>{selectedStudent?.student_name}</Text>

            <Text style={styles.label}>Grade / Score (e.g. A+, 95/100, Excellent)</Text>
            <TextInput
              style={styles.input}
              value={gradeForm.grade}
              onChangeText={v => setGradeForm(f => ({ ...f, grade: v }))}
              placeholder="e.g. A+"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Teacher Feedback (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={gradeForm.comments}
              onChangeText={v => setGradeForm(f => ({ ...f, comments: v }))}
              placeholder="Constructive feedback..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
            />

            <View style={styles.gradeActions}>
              <TouchableOpacity style={styles.gradeCancelBtn} onPress={() => setShowGradeModal(false)}>
                <Text style={styles.gradeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gradeSaveBtn} onPress={handleSaveGrade}>
                <Text style={styles.gradeSaveText}>Submit Grade</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>New Assignment</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} placeholder="Assignment title" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Instructions..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

            <Text style={styles.label}>Subject</Text>
            <View style={styles.picker}>
              {subjects.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.subjectChip, (form.subject_id === (s.subject_id || s.id)) && styles.subjectChipActive]}
                  onPress={() => setForm(f => ({ ...f, subject_id: s.subject_id || s.id }))}
                >
                  <Text style={[styles.subjectChipText, (form.subject_id === (s.subject_id || s.id)) && { color: colors.teacher }]}>
                    {s.subject_name || s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Due Date (YYYY-MM-DD) *</Text>
            <TextInput style={styles.input} value={form.due_date} onChangeText={v => setForm(f => ({ ...f, due_date: v }))} placeholder="2025-12-31" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

            <TouchableOpacity style={[styles.createBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
              {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createBtnText}>Create Assignment</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  addBtn: { padding: spacing.sm, backgroundColor: colors.teacher + '22', borderRadius: radius.md },
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  cardTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardDesc: { ...typography.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectName: { ...typography.xs, color: colors.textMuted },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueDate: { ...typography.xs, color: colors.textMuted },
  submissionCount: { ...typography.xs, color: colors.primary, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  emptyBtn: { backgroundColor: colors.teacher + '22', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  emptyBtnText: { color: colors.teacher, ...typography.sm, ...typography.semibold },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 50 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { ...typography.xl, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  label: { ...typography.sm, ...typography.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, color: colors.textPrimary, ...typography.base,
    paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  subjectChip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  subjectChipActive: { borderColor: colors.teacher, backgroundColor: colors.teacher + '22' },
  subjectChipText: { ...typography.sm, color: colors.textMuted },
  createBtn: { backgroundColor: colors.teacher, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: spacing.sm },
  createBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
  // Submissions review
  cardActionsRow: { marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border + '66', flexDirection: 'row', justifyContent: 'flex-end' },
  reviewSubmissionsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.teacher + '15', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm },
  reviewSubmissionsText: { ...typography.xs, ...typography.semibold, color: colors.teacher },
  submissionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  subSubtitle: { ...typography.xs, color: colors.textSecondary },
  submissionCard: { backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  subTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  subStudentName: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  subRoll: { ...typography.xs, color: colors.textMuted },
  subGrade: { ...typography.xs, color: colors.success, fontWeight: '700', marginTop: 2 },
  subComments: { ...typography.xs, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  gradeBtn: { alignSelf: 'flex-start', backgroundColor: colors.teacher + '22', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, marginTop: spacing.xs },
  gradeBtnText: { ...typography.xs, color: colors.teacher, fontWeight: '600' },
  emptySubmissionsText: { ...typography.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  // Grade Dialog
  gradeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  gradeDialog: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: colors.border },
  gradeDialogTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  gradeDialogSub: { ...typography.xs, color: colors.textSecondary, marginBottom: spacing.md },
  gradeActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  gradeCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bgElevated, alignItems: 'center' },
  gradeCancelText: { ...typography.sm, ...typography.semibold, color: colors.textSecondary },
  gradeSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.teacher, alignItems: 'center' },
  gradeSaveText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default TeacherAssignmentsScreen;
