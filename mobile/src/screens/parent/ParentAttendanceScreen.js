import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, RefreshControl,
  TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar, CheckCircle, XCircle, Clock, BarChart2,
  Download, Filter, ChevronRight, AlertCircle, FileText
} from 'lucide-react-native';
import Header from '../../components/Header';
import ChildSwitcher from '../../components/ChildSwitcher';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportCsv } from '../../utils/fileExporter';

const ParentAttendanceScreen = ({ route, navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(route?.params?.studentId || null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('subjects'); // 'subjects' | 'records' | 'monthly'
  const [downloading, setDownloading] = useState(false);

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      const kids = Array.isArray(data) ? data : [];
      setChildren(kids);
      if (!selectedChildId && kids.length > 0) {
        setSelectedChildId(String(route?.params?.studentId || kids[0].id || kids[0].studentId));
      }
    } catch (err) {
      console.error('Fetch children error in attendance:', err);
    }
  };

  const fetchAttendance = async (childId = selectedChildId) => {
    setLoading(true);
    try {
      const url = childId
        ? `/parent/student-attendance?studentId=${childId}`
        : '/parent/student-attendance';
      const { data } = await api.get(url);
      setAttendanceData(data);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchAttendance(selectedChildId);
    } else {
      fetchAttendance();
    }
  }, [selectedChildId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
    fetchAttendance(selectedChildId);
  }, [selectedChildId]);

  const handleDownloadReport = async () => {
    const records = attendanceData?.records || [];
    if (records.length === 0) {
      Alert.alert('No Data', 'No attendance records available to export.');
      return;
    }

    setDownloading(true);
    try {
      let csvContent = `Date,Subject,Time Slot,Status,Teacher,Remarks\n`;
      records.forEach((r) => {
        const d = r.date ? new Date(r.date).toISOString().split('T')[0] : '';
        const s = `"${(r.subject_name || 'General Session').replace(/"/g, '""')}"`;
        const ts = `"${(r.time_slot || 'Regular').replace(/"/g, '""')}"`;
        const st = (r.status || '').toUpperCase();
        const t = `"${(r.teacher_name || '').replace(/"/g, '""')}"`;
        const rem = `"${(r.remarks || '').replace(/"/g, '""')}"`;
        csvContent += `${d},${s},${ts},${st},${t},${rem}\n`;
      });

      const fileName = `Attendance_Report_${selectedChildId || 'Student'}.csv`;
      const success = await exportCsv(fileName, csvContent);
      if (success) {
        Alert.alert('✅ Exported', 'Attendance report CSV generated successfully.');
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
      Alert.alert('Error', 'Failed to generate attendance report.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !refreshing) return <FullPageLoader message="Loading attendance analytics..." />;

  const records = attendanceData?.records || [];
  const monthlyBreakdown = attendanceData?.monthlyBreakdown || [];
  const subjectBreakdown = attendanceData?.subjectBreakdown || [];
  const student = attendanceData?.student || {};

  const totalSessions = records.length;
  const presentSessions = records.filter((r) => r.status === 'present').length;
  const absentSessions = records.filter((r) => r.status === 'absent').length;
  const leaveSessions = records.filter((r) => r.status === 'leave').length;
  const percentage = totalSessions > 0 ? ((presentSessions / totalSessions) * 100).toFixed(1) : '100.0';
  const isGood = parseFloat(percentage) >= 75;

  const TABS = [
    { key: 'subjects', label: 'By Subject' },
    { key: 'records', label: 'Recent Records' },
    { key: 'monthly', label: 'Monthly' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Attendance Analytics"
        subtitle={student.name ? `Attendance records for ${student.name}` : "Comprehensive attendance breakdown"}
        navigation={navigation}
        rightAction={
          <TouchableOpacity
            style={[styles.exportBtn, downloading && { opacity: 0.6 }]}
            onPress={handleDownloadReport}
            disabled={downloading}
          >
            <Download size={16} color={colors.primaryLight} />
            <Text style={styles.exportBtnText}>
              {downloading ? 'Exporting...' : 'Export'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
      >
        {/* Child Switcher Component */}
        {children.length > 0 && (
          <ChildSwitcher
            childrenList={children}
            selectedChildId={selectedChildId}
            onSelectChild={(id) => setSelectedChildId(id)}
          />
        )}

        {/* 4 Web-Parity KPI Cards */}
        <View style={styles.kpiGrid}>
          {/* Card 1: Attendance Rate */}
          <View style={[styles.kpiCard, shadows.sm, { borderColor: isGood ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }]}>
            <Text style={styles.kpiLabel}>ATTENDANCE RATE</Text>
            <Text style={[styles.kpiValue, { color: isGood ? colors.success : colors.danger }]}>
              {percentage}%
            </Text>
            <Text style={styles.kpiSub}>Threshold: 75%</Text>
          </View>

          {/* Card 2: Sessions Attended */}
          <View style={[styles.kpiCard, shadows.sm, { borderColor: 'rgba(59,130,246,0.3)' }]}>
            <Text style={styles.kpiLabel}>SESSIONS ATTENDED</Text>
            <Text style={[styles.kpiValue, { color: colors.primaryLight }]}>
              {presentSessions} / {totalSessions}
            </Text>
            <Text style={styles.kpiSub}>Present</Text>
          </View>

          {/* Card 3: Absent Days */}
          <View style={[styles.kpiCard, shadows.sm, { borderColor: 'rgba(239,68,68,0.3)' }]}>
            <Text style={styles.kpiLabel}>ABSENT DAYS</Text>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>
              {absentSessions}
            </Text>
            <Text style={styles.kpiSub}>Unexcused Absences</Text>
          </View>

          {/* Card 4: Approved Leaves */}
          <View style={[styles.kpiCard, shadows.sm, { borderColor: 'rgba(245,158,11,0.3)' }]}>
            <Text style={styles.kpiLabel}>APPROVED LEAVES</Text>
            <Text style={[styles.kpiValue, { color: colors.warning }]}>
              {leaveSessions}
            </Text>
            <Text style={styles.kpiSub}>Excused Sessions</Text>
          </View>
        </View>

        {/* Segmented Section Tabs */}
        <View style={styles.tabsContainer}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab 1: Subject-Wise Attendance Breakdown */}
        {activeTab === 'subjects' && (
          <View style={[styles.panelCard, shadows.sm]}>
            <View style={styles.panelHeader}>
              <BarChart2 size={18} color={colors.primaryLight} />
              <Text style={styles.panelTitle}>Subject-wise Performance</Text>
            </View>

            {subjectBreakdown.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No subject breakdown records found.</Text>
              </View>
            ) : (
              subjectBreakdown.map((subj, idx) => {
                const sPct = parseFloat(subj.percentage) || 0;
                const sGood = sPct >= 75;
                return (
                  <View key={idx} style={styles.subjectCard}>
                    <View style={styles.subjectCardTop}>
                      <Text style={styles.subjectName}>{subj.subjectName}</Text>
                      <Text style={[styles.subjectPercentage, { color: sGood ? colors.success : colors.danger }]}>
                        {subj.percentage}%
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(sPct, 100)}%`,
                            backgroundColor: sGood ? colors.success : colors.danger,
                          }
                        ]}
                      />
                    </View>

                    <Text style={styles.subjectAttendanceMeta}>
                      {subj.present} of {subj.total} lectures attended
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Tab 2: Recent Session Records */}
        {activeTab === 'records' && (
          <View style={[styles.panelCard, shadows.sm]}>
            <View style={styles.panelHeader}>
              <Calendar size={18} color={colors.primaryLight} />
              <Text style={styles.panelTitle}>Recent Session Records</Text>
            </View>

            {records.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recent session records available.</Text>
              </View>
            ) : (
              records.slice(0, 25).map((rec, idx) => {
                const isPres = rec.status === 'present';
                const isLve = rec.status === 'leave';
                const isAbs = rec.status === 'absent';
                const statusColor = isPres ? colors.success : isLve ? colors.warning : colors.danger;
                const formattedDate = rec.date
                  ? new Date(rec.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'N/A';

                return (
                  <View key={rec.id || idx} style={styles.recordCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordDate}>{formattedDate}</Text>
                      <Text style={styles.recordSubject}>{rec.subject_name || 'General Session'}</Text>
                      <Text style={styles.recordTime}>
                        {rec.time_slot || 'Regular Session'} · Room: {rec.room_number || '—'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusCapsule,
                        {
                          backgroundColor: isPres
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isLve
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)'
                        }
                      ]}
                    >
                      {isPres && <CheckCircle size={13} color={colors.success} />}
                      {isLve && <Clock size={13} color={colors.warning} />}
                      {isAbs && <XCircle size={13} color={colors.danger} />}
                      <Text style={[styles.statusCapsuleText, { color: statusColor }]}>
                        {(rec.status || 'ABSENT').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Tab 3: Monthly Breakdown */}
        {activeTab === 'monthly' && (
          <View style={[styles.panelCard, shadows.sm]}>
            <View style={styles.panelHeader}>
              <Clock size={18} color={colors.primaryLight} />
              <Text style={styles.panelTitle}>Monthly Attendance Trends</Text>
            </View>

            {monthlyBreakdown.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No monthly breakdown records available.</Text>
              </View>
            ) : (
              monthlyBreakdown.map((m, idx) => {
                const mPct = parseFloat(m.percentage) || 0;
                const mGood = mPct >= 75;
                return (
                  <View key={idx} style={styles.monthCard}>
                    <View style={styles.monthTopRow}>
                      <Text style={styles.monthName}>{m.month || `Month ${idx + 1}`}</Text>
                      <Text style={[styles.monthRate, { color: mGood ? colors.success : colors.danger }]}>
                        {m.percentage}%
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(mPct, 100)}%`,
                            backgroundColor: mGood ? colors.success : colors.danger,
                          }
                        ]}
                      />
                    </View>
                    <View style={styles.monthStatsRow}>
                      <Text style={styles.monthStatItem}>Present: {m.present || 0}</Text>
                      <Text style={styles.monthStatItem}>Absent: {m.absent || 0}</Text>
                      <Text style={styles.monthStatItem}>Total: {m.total || 0}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing.md,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  panelCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  subjectCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  subjectCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  subjectPercentage: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectAttendanceMeta: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    gap: 10,
  },
  recordDate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recordSubject: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recordTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusCapsuleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  monthCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  monthTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  monthRate: {
    fontSize: 16,
    fontWeight: '800',
  },
  monthStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  monthStatItem: {
    ...typography.xs,
    color: colors.textMuted,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.sm,
    color: colors.textMuted,
  },
});

export default ParentAttendanceScreen;
