import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, RefreshControl,
  TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarCheck, CalendarX, Clock, TrendingUp, Download } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportCsv } from '../../utils/fileExporter';

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

  useEffect(() => {
    fetchAttendance();
  }, [studentId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAttendance();
  }, []);

  const handleExportCsv = async () => {
    const records = data?.records || [];
    if (records.length === 0) {
      Alert.alert('No Data', 'No attendance records to export.');
      return;
    }

    let csvContent = `Date,Subject,Status,Teacher,Remarks\n`;
    records.forEach((r) => {
      const d = r.date ? new Date(r.date).toISOString().split('T')[0] : '';
      const s = `"${(r.subject_name || 'General').replace(/"/g, '""')}"`;
      const st = r.status || '';
      const t = `"${(r.teacher_name || '').replace(/"/g, '""')}"`;
      const rem = `"${(r.remarks || '').replace(/"/g, '""')}"`;
      csvContent += `${d},${s},${st},${t},${rem}\n`;
    });

    const success = await exportCsv('Child_Attendance_Report.csv', csvContent);
    if (success) {
      Alert.alert('✅ Exported', 'Attendance report CSV generated successfully.');
    }
  };

  if (loading) return <FullPageLoader message="Loading attendance records..." />;

  const records = data?.records || [];
  const monthly = data?.monthlyBreakdown || [];
  const subjects = data?.subjectBreakdown || [];

  const totalPresent = records.filter((r) => r.status === 'present').length;
  const totalAbsent = records.filter((r) => r.status === 'absent').length;

  const TABS = [
    { key: 'records', label: 'Records' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'subjects', label: 'By Subject' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Attendance Report"
        subtitle="Your child's attendance"
        navigation={navigation}
        rightAction={
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv}>
            <Download size={17} color={colors.parent} />
          </TouchableOpacity>
        }
      />

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
        {TABS.map((t) => (
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
                  <Text style={[styles.monthStat, { color: colors.warning }]}>{m.leave} L</Text>
                </View>
              </View>
            ))
          )
        )}

        {activeTab === 'subjects' && (
          subjects.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>No subject data available</Text></View>
          ) : (
            subjects.map((s, i) => (
              <View key={i} style={[styles.subjectCard, shadows.sm]}>
                <View style={styles.subjectHeader}>
                  <Text style={styles.subjectName}>{s.subject_name}</Text>
                  <Text style={[styles.subjectPct, { color: parseFloat(s.percentage) >= 75 ? colors.success : colors.danger }]}>
                    {s.percentage}%
                  </Text>
                </View>
                <Text style={styles.subjectClasses}>{s.present} of {s.total} classes attended</Text>
              </View>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  exportBtn: {
    padding: spacing.sm, backgroundColor: colors.parent + '22',
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.parent + '44',
  },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.xs },
  summaryCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center', borderWidth: 1,
  },
  summaryValue: { ...typography.lg, ...typography.bold, marginVertical: 2 },
  summaryLabel: { ...typography.xs, color: colors.textMuted },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.xs, marginVertical: spacing.xs },
  tab: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: radius.full, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.parent + '22', borderColor: colors.parent },
  tabText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.parent, fontWeight: '700' },
  listContent: { padding: spacing.md },
  recordCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  recordInfo: { flex: 1 },
  recordDate: { ...typography.sm, ...typography.semibold, color: colors.textPrimary },
  recordSubject: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  monthCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  monthName: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  monthPct: { ...typography.sm, ...typography.bold },
  monthStats: { flexDirection: 'row', gap: spacing.md },
  monthStat: { ...typography.xs, fontWeight: '600' },
  subjectCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  subjectName: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  subjectPct: { ...typography.sm, ...typography.bold },
  subjectClasses: { ...typography.xs, color: colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { ...typography.sm, color: colors.textMuted },
});

export default ParentAttendanceScreen;
