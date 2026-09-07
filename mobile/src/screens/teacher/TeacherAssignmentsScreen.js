import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  Plus,
  Calendar,
  X,
  Eye,
  Edit2,
  Trash2,
  Save,
  Users,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

// Helper: check if assignment due date is pending (due >= today)
const isAssignmentPending = (dueDateStr) => {
  if (!dueDateStr) return true;
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due >= today;
};

// ─── Submissions & Grading Sheet Component ─────────────────────────────────────
const SubmissionsModal = ({ assignment, onClose, onGraded }) => {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [gradeInput, setGradeInput] = useState('A+');
  const [commentsInput, setCommentsInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const fetchSubmissions = async () => {
    if (!assignment?.id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/teacher/assignments/${assignment.id}/submissions`);
      setSubmissions(data?.submissions || []);
    } catch (err) {
      console.error('Submissions error:', err);
      Alert.alert('Error', 'Could not load student submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assignment?.id]);

  const handleOpenGrade = (student) => {
    if (editingStudentId === student.student_id) {
      setEditingStudentId(null);
    } else {
      setEditingStudentId(student.student_id);
      setGradeInput(student.grade || 'A+');
      setCommentsInput(student.teacher_comments || '');
    }
  };

  const handleSaveGrade = async (studentId) => {
    if (!gradeInput.trim()) {
      Alert.alert('Required', 'Please enter a grade or score.');
      return;
    }
    setSavingGrade(true);
    try {
      await api.post(`/teacher/assignments/${assignment.id}/grade`, {
        studentId,
        grade: gradeInput.trim(),
        teacherComments: commentsInput.trim(),
      });
      Alert.alert('✅ Saved', 'Grade and feedback saved successfully.');
      setEditingStudentId(null);
      await fetchSubmissions();
      if (onGraded) onGraded();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save grade.');
    } finally {
      setSavingGrade(false);
    }
  };

  if (!assignment) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.subModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subModalTag}>
                📚 {assignment.subject_name || 'Subject'} • {assignment.class_name || 'Class'}
              </Text>
              <Text style={styles.subModalTitle} numberOfLines={1}>
                {assignment.title}
              </Text>
              <Text style={styles.subModalDue}>
                Due Date: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Submissions List */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading submissions…</Text>
            </View>
          ) : (
            <FlatList
              data={submissions}
              keyExtractor={(item) => item.student_id?.toString()}
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => {
                const isEditing = editingStudentId === item.student_id;
                const isSubmitted = item.status === 'completed' || item.status === 'submitted' || item.status === 'graded';
                const isGraded = item.status === 'graded';

                return (
                  <View style={styles.submissionCard}>
                    <View style={styles.subCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subStudentName}>{item.student_name}</Text>
                        <Text style={styles.subStudentMeta}>
                          Roll: {item.roll_number || 'N/A'} • {item.email}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.subStatusBadge,
                          isGraded
                            ? { backgroundColor: colors.success + '22' }
                            : isSubmitted
                            ? { backgroundColor: colors.primary + '22' }
                            : { backgroundColor: colors.danger + '22' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subStatusText,
                            {
                              color: isGraded
                                ? colors.success
                                : isSubmitted
                                ? colors.primary
                                : colors.danger,
                            },
                          ]}
                        >
                          {isGraded ? `Graded (${item.grade})` : isSubmitted ? 'Submitted' : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {item.submission_date && (
                      <Text style={styles.subDateText}>
                        Submitted: {new Date(item.submission_date).toLocaleString()}
                      </Text>
                    )}

                    {item.teacher_comments && !isEditing && (
                      <Text style={styles.subCommentsText}>
                        Feedback: {item.teacher_comments}
                      </Text>
                    )}

                    {/* Grade Action / Toggle */}
                    <View style={styles.subActionRow}>
                      <TouchableOpacity
                        style={styles.gradeToggleBtn}
                        onPress={() => handleOpenGrade(item)}
                      >
                        <Text style={styles.gradeToggleText}>
                          {isEditing ? 'Cancel' : item.grade ? 'Edit Grade' : 'Grade Submission'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Inline Grading Form */}
                    {isEditing && (
                      <View style={styles.inlineGradeBox}>
                        <Text style={styles.fieldLabel}>Grade / Score</Text>
                        <TextInput
                          style={styles.inputField}
                          value={gradeInput}
                          onChangeText={setGradeInput}
                          placeholder="e.g. A+, 95/100"
                          placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.fieldLabel}>Teacher Comments</Text>
                        <TextInput
                          style={[styles.inputField, { height: 60, textAlignVertical: 'top' }]}
                          value={commentsInput}
                          onChangeText={setCommentsInput}
                          placeholder="Feedback for student & parent..."
                          placeholderTextColor={colors.textMuted}
                          multiline
                        />

                        <TouchableOpacity
                          style={[styles.saveGradeBtn, savingGrade && { opacity: 0.6 }]}
                          onPress={() => handleSaveGrade(item.student_id)}
                          disabled={savingGrade}
                        >
                          {savingGrade ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Save size={14} color="#fff" />
                              <Text style={styles.saveGradeBtnText}>Save Grade & Notify</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyCenter}>
                  <Users size={36} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No students enrolled in this class.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Create / Edit Assignment Modal ────────────────────────────────────────────
const AssignmentFormModal = ({
  visible,
  assignment,
  subjects,
  onClose,
  onSaved,
}) => {
  const isEditing = !!assignment;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedAllocKey, setSelectedAllocKey] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Group unique subject/class allocations
  const allocations = useMemo(() => {
    const list = [];
    const seen = new Set();
    subjects.forEach((s) => {
      const subId = s.subjectId?._id || s.subjectId?.id || s.subject_id || s.id;
      const clsId = s.classId?._id || s.classId?.id || s.class_id || 1;
      const subName = s.subjectId?.name || s.subjectId?.subjectName || s.subject_name || s.name || 'Subject';
      const clsName = s.classId?.name || s.classId?.className || s.class_name || 'Class';
      const key = `${subId}-${clsId}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ key, subId, clsId, subName, clsName });
      }
    });
    return list;
  }, [subjects]);

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title || '');
      setDescription(assignment.description || '');
      const d = assignment.due_date ? new Date(assignment.due_date).toISOString().split('T')[0] : '';
      setDueDate(d);
      setAttachmentUrl(assignment.attachment_url || '');
      const found = allocations.find(
        (a) => a.subName === assignment.subject_name && a.clsName === assignment.class_name
      );
      if (found) setSelectedAllocKey(found.key);
      else if (allocations.length > 0) setSelectedAllocKey(allocations[0].key);
    } else {
      setTitle('');
      setDescription('');
      const future = new Date();
      future.setDate(future.getDate() + 7);
      setDueDate(future.toISOString().split('T')[0]);
      setAttachmentUrl('');
      if (allocations.length > 0) setSelectedAllocKey(allocations[0].key);
    }
  }, [assignment, allocations]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an assignment title.');
      return;
    }
    if (!dueDate.trim()) {
      Alert.alert('Required', 'Please enter a due date (YYYY-MM-DD).');
      return;
    }

    const alloc = allocations.find((a) => a.key === selectedAllocKey) || allocations[0];
    const payload = {
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate.trim(),
      subjectId: alloc?.subId,
      classId: alloc?.clsId,
      attachmentUrl: attachmentUrl.trim() || null,
    };

    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/teacher/assignments/${assignment.id}`, payload);
        Alert.alert('✅ Updated', 'Assignment updated successfully.');
      } else {
        await api.post('/teacher/assignments', payload);
        Alert.alert('✅ Created', 'Assignment published and notifications sent!');
      }
      onSaved();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save assignment.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.formHeader}>
              <Text style={styles.sheetTitle}>
                {isEditing ? '✏️ Edit Homework' : '📚 Assign New Homework'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.inputField}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Python Pandas Worksheet"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Instructions / Description</Text>
            <TextInput
              style={[styles.inputField, { height: 75, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the homework tasks, reference materials, etc."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={styles.fieldLabel}>Subject & Class Section</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
              <View style={styles.pillRowInline}>
                {allocations.map((a) => {
                  const isSel = selectedAllocKey === a.key;
                  return (
                    <TouchableOpacity
                      key={a.key}
                      style={[styles.allocChip, isSel && styles.allocChipActive]}
                      onPress={() => setSelectedAllocKey(a.key)}
                    >
                      <BookOpen size={11} color={isSel ? '#fff' : colors.textMuted} />
                      <Text style={[styles.allocChipText, isSel && styles.allocChipTextActive]}>
                        {a.clsName} · {a.subName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>Due Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.inputField}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="2026-05-15"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Resource Link / Attachment URL (Optional)</Text>
            <TextInput
              style={styles.inputField}
              value={attachmentUrl}
              onChangeText={setAttachmentUrl}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={15} color="#fff" />
                    <Text style={styles.submitBtnText}>
                      {isEditing ? 'Update Assignment' : 'Publish Assignment'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={{ height: 25 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen Component ─────────────────────────────────────────────────────
const TeacherAssignmentsScreen = () => {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pending' | 'finished'

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submissionsModalAssignment, setSubmissionsModalAssignment] = useState(null);

  const fetchData = async () => {
    try {
      const [asgRes, subjRes] = await Promise.all([
        api.get('/teacher/assignments').catch(() => ({ data: [] })),
        api.get('/teacher/subjects').catch(() => ({ data: [] })),
      ]);
      setAssignments(asgRes.data || []);
      setSubjects(subjRes.data || []);
    } catch (err) {
      console.error('Assignments fetch error:', err);
      Alert.alert('Error', 'Could not load assignments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Filter calculations
  const pendingCount = useMemo(
    () => assignments.filter((a) => isAssignmentPending(a.due_date)).length,
    [assignments]
  );
  const finishedCount = useMemo(
    () => assignments.filter((a) => !isAssignmentPending(a.due_date)).length,
    [assignments]
  );

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const pending = isAssignmentPending(item.due_date);
      if (filterTab === 'pending') return pending;
      if (filterTab === 'finished') return !pending;
      return true; // 'all'
    });
  }, [assignments, filterTab]);

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Homework',
      `Are you sure you want to delete "${item.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/teacher/assignments/${item.id}`);
              Alert.alert('Deleted', 'Assignment removed.');
              fetchData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete assignment.');
            }
          },
        },
      ]
    );
  };

  const renderAssignmentCard = ({ item }) => {
    const pending = isAssignmentPending(item.due_date);
    const dueDateStr = item.due_date ? new Date(item.due_date).toLocaleDateString() : '—';
    const subCount = item.submission_count || 0;

    return (
      <View style={[styles.assignmentCard, shadows.sm]}>
        {/* Top Tag & Status */}
        <View style={styles.cardHeaderRow}>
          <Text style={styles.subjectClassTag} numberOfLines={1}>
            📚 {item.subject_name || 'Subject'} • {item.class_name || 'Class'}
          </Text>
          <View
            style={[
              styles.statusPill,
              pending ? styles.statusPillActive : styles.statusPillClosed,
            ]}
          >
            <Text style={[styles.statusPillText, pending ? { color: colors.primary } : { color: colors.textMuted }]}>
              {pending ? 'ACTIVE' : 'CLOSED'}
            </Text>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description || 'No instructions provided.'}
        </Text>

        {/* Middle Info: Due Date & Submission Badge */}
        <View style={styles.cardMetaRow}>
          <View style={[styles.dueBadge, pending && styles.dueBadgeActive]}>
            <Calendar size={13} color={pending ? colors.danger : colors.textMuted} />
            <Text style={[styles.dueBadgeText, pending && { color: colors.danger }]}>
              Due: {dueDateStr}
            </Text>
          </View>

          <View style={styles.submissionsCountPill}>
            <Text style={styles.submissionsCountText}>{subCount} Submissions</Text>
          </View>
        </View>

        {/* Bottom Actions Row */}
        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.viewSubmissionsBtn}
            onPress={() => setSubmissionsModalAssignment(item)}
            activeOpacity={0.8}
          >
            <Eye size={14} color="#fff" />
            <Text style={styles.viewSubmissionsText}>View Submissions</Text>
          </TouchableOpacity>

          <View style={styles.subActionGroup}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                setEditingAssignment(item);
                setShowFormModal(true);
              }}
              activeOpacity={0.7}
            >
              <Edit2 size={13} color={colors.textPrimary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <Trash2 size={13} color={colors.danger} />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Assignments" subtitle="Homework & Assignment Manager" />

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsRow}>
          {[
            { id: 'all', label: 'All Assignments', count: assignments.length },
            { id: 'pending', label: '⏳ Pending / Active', count: pendingCount },
            { id: 'finished', label: '✅ Finished / Closed', count: finishedCount },
          ].map((tab) => {
            const isSel = filterTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterTab, isSel && styles.filterTabActive]}
                onPress={() => setFilterTab(tab.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTabText, isSel && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.filterTabCount, isSel && styles.filterTabCountActive]}>
                  <Text style={[styles.filterTabCountText, isSel && styles.filterTabCountTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Assignments List */}
      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredAssignments}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderAssignmentCard}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <BookOpen size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                No {filterTab !== 'all' ? filterTab : ''} assignments found
              </Text>
              <Text style={styles.emptySubtitle}>
                {filterTab === 'pending'
                  ? 'No active pending homework for your classes.'
                  : 'Tap the "+" button below to post a new assignment.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingAssignment(null);
          setShowFormModal(true);
        }}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Create / Edit Modal */}
      <AssignmentFormModal
        visible={showFormModal}
        assignment={editingAssignment}
        subjects={subjects}
        onClose={() => {
          setShowFormModal(false);
          setEditingAssignment(null);
        }}
        onSaved={() => {
          setShowFormModal(false);
          setEditingAssignment(null);
          fetchData();
        }}
      />

      {/* Submissions & Grading Modal */}
      {submissionsModalAssignment && (
        <SubmissionsModal
          assignment={submissionsModalAssignment}
          onClose={() => setSubmissionsModalAssignment(null)}
          onGraded={fetchData}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  // Filter Tabs
  filterTabsContainer: {
    marginVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  filterTabsRow: { paddingHorizontal: spacing.md, gap: 8, flexDirection: 'row', paddingVertical: 4 },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterTabTextActive: { color: '#fff', fontWeight: '800' },
  filterTabCount: {
    backgroundColor: colors.bgInput,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  filterTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterTabCountText: { fontSize: 10, fontWeight: '800', color: colors.textMuted },
  filterTabCountTextActive: { color: '#fff' },

  // Assignment Card
  list: { padding: spacing.md, paddingTop: 6, paddingBottom: 80 },
  assignmentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subjectClassTag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusPillActive: { backgroundColor: colors.primary + '18' },
  statusPillClosed: { backgroundColor: colors.bgElevated },
  statusPillText: { fontSize: 9, fontWeight: '800' },
  cardTitle: {
    ...typography.base,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    ...typography.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dueBadgeActive: {
    backgroundColor: colors.danger + '10',
    borderColor: colors.danger + '33',
  },
  dueBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  submissionsCountPill: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  submissionsCountText: { fontSize: 11, fontWeight: '800', color: colors.primary },

  // Card Action Row
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
    flexWrap: 'wrap',
  },
  viewSubmissionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  viewSubmissionsText: { ...typography.xs, fontWeight: '800', color: '#fff' },
  subActionGroup: { flexDirection: 'row', gap: 6 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editBtnText: { ...typography.xs, fontWeight: '700', color: colors.textPrimary },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger + '14',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger + '33',
  },
  deleteBtnText: { ...typography.xs, fontWeight: '700', color: colors.danger },

  // FAB (Floating Action Button)
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    ...Platform.select({
      web: { boxShadow: '0px 6px 16px rgba(99, 102, 241, 0.45)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },

  // Empty View
  emptyCenter: { alignItems: 'center', paddingTop: 60, paddingBottom: 40, gap: 10 },
  emptyTitle: { ...typography.base, fontWeight: '800', color: colors.textSecondary },
  emptySubtitle: { ...typography.sm, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },

  // Modal Common
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: { ...typography.lg, fontWeight: '800', color: colors.textPrimary },
  closeBtn: { padding: 4 },

  // Submissions Modal
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  subModalTag: { fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  subModalTitle: { ...typography.base, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  subModalDue: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  loadingText: { ...typography.xs, color: colors.textMuted, marginTop: 8 },
  submissionCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subStudentName: { ...typography.sm, fontWeight: '800', color: colors.textPrimary },
  subStudentMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  subStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  subStatusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  subDateText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  subCommentsText: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  subActionRow: { marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'flex-end' },
  gradeToggleBtn: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  gradeToggleText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  inlineGradeBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveGradeBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  saveGradeBtnText: { ...typography.xs, fontWeight: '800', color: '#fff' },

  // Form Modal
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4, marginTop: 8 },
  inputField: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...typography.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  pillRowInline: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  allocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allocChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  allocChipText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  allocChipTextActive: { color: '#fff', fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { ...typography.sm, color: colors.textSecondary },
  submitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: radius.sm,
  },
  submitBtnText: { ...typography.sm, fontWeight: '800', color: '#fff' },
});

export default TeacherAssignmentsScreen;
