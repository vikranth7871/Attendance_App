import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarCheck, CalendarX, Clock } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const TeacherAttendanceScreen = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/admin/teacher-attendance');
      setRecords(data?.records || data || []);
      setSummary(data?.summary || null);
    } catch (err) {
      console.error('Teacher attendance fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const getStatusColor = (status) => {
    if (status === 'present') return colors.success;
    if (status === 'absent') return colors.danger;
    if (status === 'late') return colors.warning;
    return colors.textMuted;
  };

  if (loading) return <FullPageLoader message="Loading attendance records..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Teacher Attendance" subtitle="Staff attendance tracking" />

      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: colors.success + '44' }]}>
            <CalendarCheck size={18} color={colors.success} />
            <Text style={styles.summaryValue}>{summary.present ?? '—'}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: colors.danger + '44' }]}>
            <CalendarX size={18} color={colors.danger} />
            <Text style={styles.summaryValue}>{summary.absent ?? '—'}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: colors.warning + '44' }]}>
            <Clock size={18} color={colors.warning} />
            <Text style={styles.summaryValue}>{summary.late ?? '—'}</Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
        </View>
      )}

      <FlatList
        data={records}
        keyExtractor={(item, i) => item.id?.toString() || i.toString()}
        renderItem={({ item }) => {
          const statusColor = getStatusColor(item.status);
          return (
            <View style={[styles.recordCard, shadows.sm]}>
              <View style={styles.recordHeader}>
                <Text style={styles.teacherName}>{item.teacher_name || item.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.dateText}>
                {item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}
              </Text>
              {item.subject_name && <Text style={styles.meta}>{item.subject_name}</Text>}
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No attendance records found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  summaryRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  summaryValue: { ...typography.xl, ...typography.bold, color: colors.textPrimary },
  summaryLabel: { ...typography.xs, color: colors.textMuted },
  list: { padding: spacing.md, paddingTop: 0 },
  recordCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  teacherName: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  dateText: { ...typography.sm, color: colors.textSecondary },
  meta: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default TeacherAttendanceScreen;
