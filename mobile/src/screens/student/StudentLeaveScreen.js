import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Plus, Clock, AlertCircle } from 'lucide-react-native';
import Header from '../../components/Header';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const LEAVE_TYPES = ['sick', 'casual', 'emergency', 'personal', 'other'];
const STATUS_COLORS = { pending: colors.warning, approved: colors.success, rejected: colors.danger, revoked: colors.textMuted };

const StudentLeaveScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });

  const fetchLeaves = async () => {
    try {
      const { data } = await api.get('/leave/my');
      setLeaves(data || []);
    } catch (err) { console.error('Leave fetch error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchLeaves(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchLeaves(); }, []);

  const handleSubmit = async () => {
    if (!form.start_date.trim() || !form.end_date.trim() || !form.reason.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leave/apply', form);
      setShowForm(false);
      setForm({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
      Alert.alert('✅ Submitted', 'Your leave application has been submitted.');
      fetchLeaves();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit leave.');
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Leave Applications"
        subtitle={`${leaves.filter(l => l.status === 'pending').length} pending`}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Plus size={18} color={colors.student} />
          </TouchableOpacity>
        }
        showLogout={false}
      />

      <FlatList
        data={leaves}
        keyExtractor={(item, i) => item.id?.toString() || i.toString()}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || colors.textMuted;
          return (
            <View style={[styles.leaveCard, shadows.sm]}>
              <View style={styles.cardHeader}>
                <Text style={styles.leaveType}>{item.leave_type}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.dateRow}>
                <Clock size={13} color={colors.textMuted} />
                <Text style={styles.dateText}>
                  {new Date(item.start_date).toLocaleDateString()} → {new Date(item.end_date).toLocaleDateString()}
                </Text>
              </View>
              {item.reason && <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>}
              {item.rejection_reason && (
                <View style={styles.rejectNote}>
                  <AlertCircle size={13} color={colors.danger} />
                  <Text style={styles.rejectText}>{item.rejection_reason}</Text>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FileText size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No leave applications yet</Text>
            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.applyBtnText}>Apply Now</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowForm(false)}>
          <ScrollView style={styles.sheet} onStartShouldSetResponder={() => true} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Apply for Leave</Text>

            <Text style={styles.label}>Leave Type</Text>
            <View style={styles.typeRow}>
              {LEAVE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.leave_type === t && styles.typeChipActive]}
                  onPress={() => setForm(f => ({ ...f, leave_type: t }))}
                >
                  <Text style={[styles.typeChipText, form.leave_type === t && { color: colors.student }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Start Date * (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.start_date} onChangeText={v => setForm(f => ({ ...f, start_date: v }))} placeholder="2025-12-01" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>End Date * (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.end_date} onChangeText={v => setForm(f => ({ ...f, end_date: v }))} placeholder="2025-12-03" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Reason *</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={form.reason} onChangeText={v => setForm(f => ({ ...f, reason: v }))} placeholder="Describe your reason..." placeholderTextColor={colors.textMuted} multiline />

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Submit Application</Text>}
            </TouchableOpacity>
            <View style={{ height: 50 }} />
          </ScrollView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  addBtn: { padding: spacing.sm, backgroundColor: colors.student + '22', borderRadius: radius.md },
  list: { padding: spacing.md },
  leaveCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  leaveType: { ...typography.base, ...typography.semibold, color: colors.textPrimary, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  dateText: { ...typography.sm, color: colors.textSecondary },
  reason: { ...typography.sm, color: colors.textMuted, fontStyle: 'italic' },
  rejectNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: colors.danger + '11', padding: 6, borderRadius: radius.sm },
  rejectText: { ...typography.xs, color: colors.danger, flex: 1 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  applyBtn: { backgroundColor: colors.student + '22', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  applyBtnText: { color: colors.student, ...typography.sm, ...typography.semibold },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { ...typography.xl, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  label: { ...typography.sm, ...typography.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
  input: { backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.base, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  typeChip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { borderColor: colors.student, backgroundColor: colors.student + '22' },
  typeChipText: { ...typography.sm, color: colors.textMuted, textTransform: 'capitalize' },
  submitBtn: { backgroundColor: colors.student, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  submitBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
});

export default StudentLeaveScreen;
