import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, FileText, AlertCircle } from 'lucide-react-native';
import Header from '../../components/Header';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const LEAVE_TYPES = ['sick', 'casual', 'emergency', 'personal', 'other'];

const TeacherApplyLeaveScreen = ({ navigation }) => {
  const [form, setForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [myLeaves, setMyLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaves = async () => {
    try {
      const { data } = await api.get('/leave/my');
      setMyLeaves(data || []);
    } catch (err) { console.error('My leaves fetch error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchLeaves(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchLeaves(); }, []);

  const handleSubmit = async () => {
    if (!form.start_date.trim() || !form.end_date.trim() || !form.reason.trim()) {
      Alert.alert('Missing Fields', 'Please fill in start date, end date, and reason.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leave/apply', form);
      Alert.alert('✅ Submitted', 'Your leave application has been submitted successfully.');
      setForm({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit leave application.');
    } finally { setSubmitting(false); }
  };

  const STATUS_COLORS = { pending: colors.warning, approved: colors.success, rejected: colors.danger, revoked: colors.textMuted };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Leave Application" showLogout={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Apply Form */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Apply for Leave</Text>

          <Text style={styles.label}>Leave Type</Text>
          <View style={styles.typeRow}>
            {LEAVE_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, form.leave_type === t && styles.typeChipActive]}
                onPress={() => setForm(f => ({ ...f, leave_type: t }))}
              >
                <Text style={[styles.typeChipText, form.leave_type === t && { color: colors.primary }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Start Date (YYYY-MM-DD) *</Text>
          <TextInput style={styles.input} value={form.start_date} onChangeText={v => setForm(f => ({ ...f, start_date: v }))} placeholder="2025-12-01" placeholderTextColor={colors.textMuted} />

          <Text style={styles.label}>End Date (YYYY-MM-DD) *</Text>
          <TextInput style={styles.input} value={form.end_date} onChangeText={v => setForm(f => ({ ...f, end_date: v }))} placeholder="2025-12-03" placeholderTextColor={colors.textMuted} />

          <Text style={styles.label}>Reason *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.reason}
            onChangeText={v => setForm(f => ({ ...f, reason: v }))}
            placeholder="Explain your reason..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Submit Application</Text>}
          </TouchableOpacity>
        </View>

        {/* My Leave History */}
        <Text style={styles.historyTitle}>My Leave History</Text>
        {myLeaves.length === 0 ? (
          <View style={styles.empty}>
            <FileText size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No leave applications yet</Text>
          </View>
        ) : (
          myLeaves.map((leave, i) => {
            const statusColor = STATUS_COLORS[leave.status] || colors.textMuted;
            return (
              <View key={i} style={[styles.leaveCard, shadows.sm]}>
                <View style={styles.leaveCardHeader}>
                  <Text style={styles.leaveType}>{leave.leave_type}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{leave.status}</Text>
                  </View>
                </View>
                <Text style={styles.leaveDates}>
                  {new Date(leave.start_date).toLocaleDateString()} → {new Date(leave.end_date).toLocaleDateString()}
                </Text>
                {leave.reason && <Text style={styles.leaveReason} numberOfLines={1}>{leave.reason}</Text>}
              </View>
            );
          })
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.md },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  sectionTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  label: { ...typography.sm, ...typography.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.textPrimary, ...typography.base, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  typeChip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  typeChipText: { ...typography.sm, color: colors.textMuted, textTransform: 'capitalize' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 13, alignItems: 'center' },
  submitBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
  historyTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  leaveCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  leaveCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  leaveType: { ...typography.base, ...typography.semibold, color: colors.textPrimary, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  leaveDates: { ...typography.sm, color: colors.textSecondary },
  leaveReason: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.sm, color: colors.textMuted },
});

export default TeacherApplyLeaveScreen;
