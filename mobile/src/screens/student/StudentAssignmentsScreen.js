import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Calendar, CheckCircle, UploadCloud, FileText, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_COLORS = { pending: colors.warning, submitted: colors.primary, graded: colors.success, overdue: colors.danger };

const StudentAssignmentsScreen = ({ navigation }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  // Submit modal
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitForm, setSubmitForm] = useState({ comments: '', file: null });
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/student/assignments');
      setAssignments(data || []);
    } catch (err) { console.error('Assignments fetch error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAssignments(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchAssignments(); }, []);

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets?.length > 0) {
        setSubmitForm(f => ({ ...f, file: res.assets[0] }));
      }
    } catch (err) {
      console.error('Pick document error:', err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    setSubmitting(true);
    try {
      await api.post(`/student/assignments/${selectedAssignment.id}/submit`, {
        comments: submitForm.comments,
        submissionUrl: submitForm.file?.uri || null,
        fileName: submitForm.file?.name || null,
      });
      setSelectedAssignment(null);
      setSubmitForm({ comments: '', file: null });
      Alert.alert('✅ Submitted', 'Your assignment has been submitted successfully.');
      fetchAssignments();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const FILTERS = ['all', 'pending', 'submitted', 'graded'];
  const filtered = filter === 'all' ? assignments : assignments.filter(a => a.status === filter);

  if (loading) return <FullPageLoader message="Loading assignments..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Assignments" subtitle={`${assignments.length} total`} navigation={navigation} />

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || colors.textMuted;
          const dueDate = item.due_date ? new Date(item.due_date) : null;
          const isOverdue = dueDate && dueDate < new Date() && item.status !== 'submitted' && item.status !== 'graded';
          const canSubmit = item.status === 'pending' || isOverdue;

          return (
            <View style={[styles.card, shadows.sm, isOverdue && styles.overdueCard]}>
              <View style={styles.cardHeader}>
                <BookOpen size={18} color={isOverdue ? colors.danger : colors.student} />
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (isOverdue ? colors.danger : statusColor) + '22' }]}>
                  <Text style={[styles.statusText, { color: isOverdue ? colors.danger : statusColor }]}>
                    {isOverdue ? 'overdue' : (item.status || 'pending')}
                  </Text>
                </View>
              </View>
              {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
              <View style={styles.footer}>
                <Text style={styles.subject}>{item.subject_name || '—'}</Text>
                {dueDate && (
                  <View style={styles.dueRow}>
                    <Calendar size={12} color={isOverdue ? colors.danger : colors.textMuted} />
                    <Text style={[styles.dueDate, isOverdue && { color: colors.danger }]}>
                      Due: {dueDate.toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              {item.grade && (
                <View style={styles.marksRow}>
                  <CheckCircle size={13} color={colors.success} />
                  <Text style={styles.marksText}>Grade: {item.grade}</Text>
                </View>
              )}
              {item.teacher_comments && (
                <Text style={styles.feedbackText}>Feedback: {item.teacher_comments}</Text>
              )}

              {canSubmit && (
                <TouchableOpacity
                  style={styles.submitActionBtn}
                  onPress={() => {
                    setSelectedAssignment(item);
                    setSubmitForm({ comments: '', file: null });
                  }}
                >
                  <UploadCloud size={14} color="#fff" />
                  <Text style={styles.submitActionText}>Submit Homework</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BookOpen size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter} assignments</Text>
          </View>
        }
      />

      {/* Submit Assignment Modal */}
      <Modal visible={!!selectedAssignment} transparent animationType="slide" onRequestClose={() => setSelectedAssignment(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Submit Assignment</Text>
                <Text style={styles.modalSubtitle}>{selectedAssignment?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedAssignment(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Submission Notes / Comments</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={submitForm.comments}
              onChangeText={v => setSubmitForm(f => ({ ...f, comments: v }))}
              placeholder="Write any comments or explanation..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Attach Document / Proof (Optional)</Text>
            <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
              <UploadCloud size={18} color={colors.student} />
              <Text style={styles.attachBtnText}>
                {submitForm.file ? submitForm.file.name : 'Select PDF or Document'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedAssignment(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Submit Now</Text>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  filterRow: { flexDirection: 'row', padding: spacing.md, paddingBottom: 0, gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.student + '22', borderColor: colors.student + '55' },
  chipText: { ...typography.sm, color: colors.textMuted },
  chipTextActive: { color: colors.student, ...typography.semibold },
  list: { padding: spacing.md },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  overdueCard: { borderColor: colors.danger + '44' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  cardTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  desc: { ...typography.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subject: { ...typography.xs, color: colors.textMuted },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueDate: { ...typography.xs, color: colors.textMuted },
  marksRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  marksText: { ...typography.sm, color: colors.success, fontWeight: '700' },
  feedbackText: { ...typography.xs, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
  submitActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.student, borderRadius: radius.md, paddingVertical: 8, marginTop: spacing.sm },
  submitActionText: { ...typography.xs, ...typography.bold, color: '#fff' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  modalSubtitle: { ...typography.xs, color: colors.textSecondary },
  label: { ...typography.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: spacing.xs },
  input: { backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.sm, paddingHorizontal: spacing.md, paddingVertical: 8, marginBottom: spacing.sm },
  textarea: { height: 70, textAlignVertical: 'top' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  attachBtnText: { ...typography.sm, color: colors.textSecondary, flex: 1 },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bgElevated, alignItems: 'center' },
  cancelBtnText: { ...typography.sm, ...typography.semibold, color: colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.student, alignItems: 'center' },
  saveBtnText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default StudentAssignmentsScreen;

