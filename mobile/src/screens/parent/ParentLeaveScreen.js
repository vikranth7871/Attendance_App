import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Check, X, Clock, Plus, Users, Calendar, AlertCircle } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_COLORS = {
  pending: colors.warning,
  approved: colors.success,
  rejected: colors.danger,
};

const LEAVE_TYPES = ['Medical', 'Casual', 'Emergency', 'Personal', 'Other'];

const ParentLeaveScreen = ({ route, navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(route?.params?.studentId || null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Apply Leave Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    studentId: route?.params?.studentId || null,
    leaveType: 'Medical',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      const kids = Array.isArray(data) ? data : [];
      setChildren(kids);
      if (!selectedChildId && kids.length > 0 && route?.params?.studentId) {
        setSelectedChildId(route.params.studentId);
      }
      if (!form.studentId && kids.length > 0) {
        setForm(f => ({ ...f, studentId: route?.params?.studentId || kids[0].id || kids[0].studentId }));
      }
    } catch (err) {
      console.error('Parent fetch children error:', err);
    }
  };

  const fetchLeaves = async (childId = selectedChildId) => {
    try {
      const url = childId ? `/parent/student-leaves?studentId=${childId}` : '/parent/student-leaves';
      const { data } = await api.get(url);
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Parent leaves fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    fetchLeaves(selectedChildId);
  }, [selectedChildId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
    fetchLeaves(selectedChildId);
  }, [selectedChildId]);

  const handleAction = (leaveId, action) => {
    const label = action === 'approved' ? 'Approve' : 'Reject';
    Alert.alert(
      `${label} Leave`,
      `Are you sure you want to ${label.toLowerCase()} this leave request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.put(`/parent/student-leaves/${leaveId}/action`, { action });
              fetchLeaves(selectedChildId);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || `Failed to ${label.toLowerCase()} leave.`);
            }
          }
        }
      ]
    );
  };

  const handleApplyLeave = async () => {
    const targetStudentId = form.studentId || selectedChildId || (children[0]?.id || children[0]?.studentId);
    if (!targetStudentId) {
      Alert.alert('Error', 'Please select a child for this leave application.');
      return;
    }
    if (!form.startDate.trim() || !form.endDate.trim() || !form.reason.trim()) {
      Alert.alert('Missing Fields', 'Please fill in start date, end date, and reason.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/parent/apply-leave', {
        studentId: targetStudentId,
        leaveType: form.leaveType,
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim(),
        reason: form.reason.trim()
      });

      setShowApplyModal(false);
      setForm({
        studentId: targetStudentId,
        leaveType: 'Medical',
        startDate: '',
        endDate: '',
        reason: ''
      });
      Alert.alert('✅ Leave Submitted', 'Leave application has been submitted to the class coordinator.');
      fetchLeaves(selectedChildId);
    } catch (err) {
      Alert.alert('Submission Failed', err.response?.data?.message || 'Could not apply leave for child.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullPageLoader message="Loading leave requests..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Leave Requests"
        subtitle="Child leave status & approvals"
        rightAction={
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => {
              if (children.length > 0 && !form.studentId) {
                setForm(f => ({ ...f, studentId: selectedChildId || children[0].id || children[0].studentId }));
              }
              setShowApplyModal(true);
            }}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.headerAddText}>Apply</Text>
          </TouchableOpacity>
        }
      />

      {/* Child Filter Tabs */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childFilterRow}>
          <TouchableOpacity
            style={[styles.childChip, !selectedChildId && styles.childChipActive]}
            onPress={() => setSelectedChildId(null)}
          >
            <Text style={[styles.childChipText, !selectedChildId && styles.childChipTextActive]}>All Children</Text>
          </TouchableOpacity>
          {children.map((k) => {
            const kidId = k.id || k.studentId || k._id;
            const isSel = selectedChildId && String(selectedChildId) === String(kidId);
            return (
              <TouchableOpacity
                key={kidId}
                style={[styles.childChip, isSel && styles.childChipActive]}
                onPress={() => setSelectedChildId(kidId)}
              >
                <Text style={[styles.childChipText, isSel && styles.childChipTextActive]}>{k.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={leaves}
        keyExtractor={(item, i) => item.id?.toString() || i.toString()}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || colors.textMuted;
          const startDate = new Date(item.start_date).toLocaleDateString();
          const endDate = new Date(item.end_date).toLocaleDateString();
          return (
            <View style={[styles.card, shadows.sm]}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.studentName}>{item.student_name || 'Student'}</Text>
                  <Text style={styles.leaveType}>{item.leave_type}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <Clock size={13} color={colors.textMuted} />
                <Text style={styles.dateText}>{startDate} → {endDate}</Text>
              </View>

              {item.reason && (
                <Text style={styles.reason} numberOfLines={3}>{item.reason}</Text>
              )}

              {item.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleAction(item.id, 'approved')}
                  >
                    <Check size={15} color="#fff" />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleAction(item.id, 'rejected')}
                  >
                    <X size={15} color="#fff" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FileText size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No leave requests found</Text>
            <TouchableOpacity style={styles.emptyApplyBtn} onPress={() => setShowApplyModal(true)}>
              <Text style={styles.emptyApplyText}>Apply Leave for Child</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Parent Apply Leave Modal */}
      <Modal visible={showApplyModal} transparent animationType="slide" onRequestClose={() => setShowApplyModal(false)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.sheet} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Apply Leave for Child</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Child Selector */}
            {children.length > 1 && (
              <>
                <Text style={styles.fieldLabel}>Select Child</Text>
                <View style={styles.typeRow}>
                  {children.map(k => {
                    const kidId = k.id || k.studentId || k._id;
                    const isSelected = form.studentId && String(form.studentId) === String(kidId);
                    return (
                      <TouchableOpacity
                        key={kidId}
                        style={[styles.typeChip, isSelected && styles.typeChipActive]}
                        onPress={() => setForm(f => ({ ...f, studentId: kidId }))}
                      >
                        <Text style={[styles.typeChipText, isSelected && { color: colors.parent }]}>{k.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Category */}
            <Text style={styles.fieldLabel}>Leave Category</Text>
            <View style={styles.typeRow}>
              {LEAVE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.leaveType === t && styles.typeChipActive]}
                  onPress={() => setForm(f => ({ ...f, leaveType: t }))}
                >
                  <Text style={[styles.typeChipText, form.leaveType === t && { color: colors.parent }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Start Date */}
            <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              value={form.startDate}
              onChangeText={v => setForm(f => ({ ...f, startDate: v }))}
              placeholder="e.g. 2025-05-15"
              placeholderTextColor={colors.textMuted}
            />

            {/* End Date */}
            <Text style={styles.fieldLabel}>End Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              value={form.endDate}
              onChangeText={v => setForm(f => ({ ...f, endDate: v }))}
              placeholder="e.g. 2025-05-17"
              placeholderTextColor={colors.textMuted}
            />

            {/* Reason */}
            <Text style={styles.fieldLabel}>Reason for Leave *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.reason}
              onChangeText={v => setForm(f => ({ ...f, reason: v }))}
              placeholder="Reason for child's absence..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={handleApplyLeave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Leave Application</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  headerAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.parent, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.md,
  },
  headerAddText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  childFilterRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs },
  childChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.bgCard, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  childChipActive: { backgroundColor: colors.parent + '22', borderColor: colors.parent },
  childChipText: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  childChipTextActive: { color: colors.parent, fontWeight: '700' },
  list: { padding: spacing.md },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  headerLeft: {},
  studentName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  leaveType: { ...typography.sm, color: colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.xs },
  dateText: { ...typography.sm, color: colors.textSecondary },
  reason: { ...typography.sm, color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: radius.md },
  approveBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.danger },
  actionBtnText: { color: '#fff', ...typography.sm, ...typography.semibold },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  emptyApplyBtn: { paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: colors.parent, borderRadius: radius.md },
  emptyApplyText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  fieldLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.xs },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.xs },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.parent + '22', borderColor: colors.parent },
  typeChipText: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  input: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.textPrimary, ...typography.sm },
  textArea: { height: 75, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: colors.parent, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: spacing.lg },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', ...typography.base, fontWeight: '700' }
});

export default ParentLeaveScreen;
