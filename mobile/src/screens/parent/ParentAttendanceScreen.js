import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, RefreshControl,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarCheck, CalendarX, Clock, TrendingUp } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_COLORS = {
  present: colors.success,
  absent: colors.danger,
  late: colors.warning,
  leave: colors.primary,
};

const ParentAttendanceScreen = ({ route, navigation }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'monthly' | 'subjects'
  const studentId = route?.params?.studentId;

  const fetchAttendance = async () => {
    try {
      const url = studentId
        ? `/parent/student-attendance?studentId=${studentId}`
        : '/parent/student-attendance';
      const { data: res } = await api.get(url);
      setData(res);
    } catch (err) {
      console.error('Parent attendance fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, [studentId]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchAttendance(); }, []);

  if (loading) return <FullPageLoader message="Loading attendance records..." />;

  const records = data?.records || [];
  const monthly = data?.monthlyBreakdown || [];
  const subjects = data?.subjectBreakdown || [];

  const totalPresent = records.filter(r => r.status === 'present').length;
  const totalAbsent = records.filter(r => r.status === 'absent').length;

  const TABS = [
    { key: 'records', label: 'Records' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'subjects', label: 'By Subject' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Attendance Report" subtitle="Your child's attendance" navigation={navigation} />

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: colors.success + '44' }]}>
          <CalendarCheck size={18} color={colors.success} />
          <Text style={[styles.summaryValue, { color: colors.success }]}>{totalPresent}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: colors.danger + '44' }]}>
          <CalendarX size={18} color={colors.danger} />
          <Text style={[styles.summaryValue, { color: colors.danger }]}>{totalAbsent}</Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: colors.primary + '44' }]}>
          <TrendingUp size={18} color={colors.primary} />
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {records.length > 0 ? `${Math.round((totalPresent / records.length) * 100)}%` : '—'}
          </Text>
          <Text style={styles.summaryLabel}>Rate</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
      >
        {activeTab === 'records' && (
          records.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>No attendance records found</Text></View>
          ) : (
            records.map((item, i) => {
              const statusColor = STATUS_COLORS[item.status] || colors.textMuted;
              return (
                <View key={i} style={[styles.recordCard, shadows.sm]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordDate}>
                      {item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                    </Text>
                    <Text style={styles.recordSubject}>{item.subject_name || 'General'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                  </View>
                </View>
              );
            })
          )
        )}

        {activeTab === 'monthly' && (
          monthly.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>No monthly data yet</Text></View>
          ) : (
            monthly.map((m, i) => (
              <View key={i} style={[styles.monthCard, shadows.sm]}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthName}>{m.month}</Text>
                  <Text style={[styles.monthPct, { color: parseFloat(m.percentage) >= 75 ? colors.success : colors.danger }]}>
                    {m.percentage}%
                  </Text>
                </View>
                <View style={styles.monthStats}>
                  <Text style={[styles.monthStat, { color: colors.success }]}>{m.present} P</Text>
                  <Text style={[styles.monthStat, { color: colors.danger }]}>{m.absent} A</Text>
                  <Text style={[styles.monthStat, { color: colors.primary }]}>{m.leave} L</Text>
                  <Text style={styles.monthStat}>{m.total} Total</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, {
                    width: `${Math.min(parseFloat(m.percentage), 100)}%`,
                    backgroundColor: parseFloat(m.percentage) >= 75 ? colors.success : colors.danger
                  }]} />
                </View>
              </View>
            ))
          )
        )}

        {activeTab === 'subjects' && (
          subjects.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>No subject data yet</Text></View>
          ) : (
            subjects.map((s, i) => (
              <View key={i} style={[styles.subjectCard, shadows.sm]}>
                <Text style={styles.subjectName}>{s.subjectName}</Text>
                <Text style={styles.subjectStats}>{s.present} / {s.total} classes</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, {
                    width: `${Math.min(parseFloat(s.percentage), 100)}%`,
                    backgroundColor: parseFloat(s.percentage) >= 75 ? colors.success : colors.danger
                  }]} />
                </View>
                <Text style={[styles.subjectPct, { color: parseFloat(s.percentage) >= 75 ? colors.success : colors.danger }]}>
                  {s.percentage}%
                </Text>
              </View>
            ))
          )
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  summaryRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, paddingBottom: 0 },
  summaryCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, gap: 3 },
  summaryValue: { ...typography.lg, ...typography.bold },
  summaryLabel: { ...typography.xs, color: colors.textMuted },
  tabRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.sm },
  tab: { flex: 1, padding: spacing.sm, borderRadius: radius.full, backgroundColor: colors.bgCard, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.parent + '22', borderColor: colors.parent },
  tabText: { ...typography.sm, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.parent },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm, flexShrink: 0 },
  recordInfo: { flex: 1 },
  recordDate: { ...typography.sm, ...typography.semibold, color: colors.textPrimary },
  recordSubject: { ...typography.xs, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  monthCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  monthName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  monthPct: { ...typography.base, ...typography.bold },
  monthStats: { flexDirection: 'row', gap: spacing.md, marginBottom: 8 },
  monthStat: { ...typography.sm, color: colors.textMuted },
  barBg: { height: 5, backgroundColor: colors.bgElevated, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },
  subjectCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  subjectName: { ...typography.base, ...typography.semibold, color: colors.textPrimary, marginBottom: 4 },
  subjectStats: { ...typography.sm, color: colors.textSecondary, marginBottom: 6 },
  subjectPct: { ...typography.sm, ...typography.semibold, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default ParentAttendanceScreen;
