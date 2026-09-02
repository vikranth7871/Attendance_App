import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Check, X, Clock } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_COLORS = {
  pending: colors.warning,
  approved: colors.success,
  rejected: colors.danger,
};

const ParentLeaveScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaves = async () => {
    try {
      const { data } = await api.get('/parent/student-leaves');
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Parent leaves fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchLeaves(); }, []);

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
              fetchLeaves();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || `Failed to ${label.toLowerCase()} leave.`);
            }
          }
        }
      ]
    );
  };

  if (loading) return <FullPageLoader message="Loading leave requests..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Leave Requests" subtitle="Your children's leaves" />
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
                <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>
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
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
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
});

export default ParentLeaveScreen;
