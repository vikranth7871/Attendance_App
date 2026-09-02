import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, RotateCcw, Clock, Filter } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_COLORS = {
  pending: colors.warning,
  approved: colors.success,
  rejected: colors.danger,
  revoked: colors.textMuted,
};

const LeaveCard = ({ leave, onApprove, onReject, onRevoke }) => {
  const statusColor = STATUS_COLORS[leave.status] || colors.textMuted;
  const startDate = new Date(leave.start_date).toLocaleDateString();
  const endDate = new Date(leave.end_date).toLocaleDateString();

  return (
    <View style={[styles.leaveCard, shadows.sm]}>
      <View style={styles.leaveHeader}>
        <View style={styles.leaveInfo}>
          <Text style={styles.teacherName}>{leave.teacher_name || leave.employee_name || 'Staff Member'}</Text>
          <Text style={styles.leaveType}>{leave.leave_type || leave.type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '44' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{leave.status}</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <Clock size={14} color={colors.textMuted} />
        <Text style={styles.dateText}>{startDate} → {endDate}</Text>
        <Text style={styles.daysText}>
          {leave.total_days || Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / 86400000) + 1} day(s)
        </Text>
      </View>

      {leave.reason && (
        <Text style={styles.reason} numberOfLines={2}>{leave.reason}</Text>
      )}

      {leave.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => onApprove(leave.id)}>
            <CheckCircle size={15} color="#fff" />
            <Text style={styles.actionBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => onReject(leave.id)}>
            <XCircle size={15} color="#fff" />
            <Text style={styles.actionBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {leave.status === 'approved' && (
        <TouchableOpacity style={[styles.actionBtn, styles.revokeBtn]} onPress={() => onRevoke(leave.id)}>
          <RotateCcw size={15} color={colors.warning} />
          <Text style={[styles.actionBtnText, { color: colors.warning }]}>Revoke</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const TeacherLeavesScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchLeaves = async () => {
    try {
      const { data } = await api.get('/admin/teacher-leaves');
      setLeaves(data || []);
    } catch (err) {
      console.error('Leaves fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaves();
  }, []);

  const handleApprove = (id) => {
    Alert.alert('Approve Leave', 'Are you sure you want to approve this leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', onPress: async () => {
          try {
            await api.put(`/admin/teacher-leaves/${id}/approve`);
            fetchLeaves();
          } catch (e) {
            Alert.alert('Error', 'Failed to approve leave.');
          }
        }
      }
    ]);
  };

  const handleReject = (id) => {
    Alert.alert('Reject Leave', 'Are you sure you want to reject this leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
            await api.put(`/admin/teacher-leaves/${id}/reject`);
            fetchLeaves();
          } catch (e) {
            Alert.alert('Error', 'Failed to reject leave.');
          }
        }
      }
    ]);
  };

  const handleRevoke = (id) => {
    Alert.alert('Revoke Leave', 'Revoke the approved leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive', onPress: async () => {
          try {
            await api.put(`/admin/teacher-leaves/${id}/revoke`);
            fetchLeaves();
          } catch (e) {
            Alert.alert('Error', 'Failed to revoke leave.');
          }
        }
      }
    ]);
  };

  const FILTERS = ['all', 'pending', 'approved', 'rejected'];
  const filtered = filter === 'all' ? leaves : leaves.filter(l => l.status === filter);

  if (loading) return <FullPageLoader message="Loading leave requests..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Staff Leaves" subtitle={`${leaves.filter(l => l.status === 'pending').length} pending`} />

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <LeaveCard
            leave={item}
            onApprove={handleApprove}
            onReject={handleReject}
            onRevoke={handleRevoke}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <CheckCircle size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter} leave requests</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary + '55' },
  filterText: { ...typography.sm, color: colors.textMuted },
  filterTextActive: { color: colors.primary, ...typography.semibold },
  list: { padding: spacing.md, paddingTop: 0 },
  leaveCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  leaveInfo: { flex: 1 },
  teacherName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  leaveType: { ...typography.sm, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  dateText: { ...typography.sm, color: colors.textSecondary, flex: 1 },
  daysText: { ...typography.xs, color: colors.textMuted },
  reason: { ...typography.sm, color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.md },
  approveBtn: { backgroundColor: colors.success, flex: 1, justifyContent: 'center' },
  rejectBtn: { backgroundColor: colors.danger, flex: 1, justifyContent: 'center' },
  revokeBtn: { backgroundColor: colors.warning + '22', borderWidth: 1, borderColor: colors.warning + '44', alignSelf: 'flex-start', marginTop: spacing.sm },
  actionBtnText: { color: '#fff', ...typography.sm, ...typography.semibold },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default TeacherLeavesScreen;
