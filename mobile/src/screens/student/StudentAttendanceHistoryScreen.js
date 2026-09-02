import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, RefreshControl, Modal, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame, CheckCircle, XCircle, Clock, Award, BookOpen,
  Calendar, ChevronRight, X, Sparkles, Filter
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_ICONS = {
  present: { icon: CheckCircle, color: colors.success, bg: colors.success + '18' },
  absent: { icon: XCircle, color: colors.danger, bg: colors.danger + '18' },
  late: { icon: Clock, color: colors.warning, bg: colors.warning + '18' },
  leave: { icon: Calendar, color: colors.primary, bg: colors.primary + '18' },
};

const StudentAttendanceHistoryScreen = ({ navigation }) => {
  const [streak, setStreak] = useState(null);
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('subjects'); // 'subjects' | 'history'

  // Subject drilldown
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchData = async () => {
    try {
      const [streakRes, overRes, subjRes] = await Promise.all([
        api.get('/student/streak').catch(() => ({ data: null })),
        api.get('/student/overview').catch(() => ({ data: null })),
        api.get('/student/subjects').catch(() => ({ data: [] })),
      ]);
      setStreak(streakRes.data);
      setOverview(overRes.data);
      setSubjects(Array.isArray(subjRes.data) ? subjRes.data : []);
    } catch (err) {
      console.error('Fetch student history error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const openSubjectDetails = async (sub) => {
    setSelectedSubject(sub);
    setLoadingDetails(true);
    try {
      const { data } = await api.get(`/student/subjects/${sub.subject_id || sub.id}/details`);
      setSubjectDetails(data);
    } catch (err) {
      console.error('Subject details error:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Attendance & Streaks"
        subtitle={`Overall: ${overview?.attendanceRate ? `${overview.attendanceRate}%` : '—'}`}
        navigation={navigation}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
      >
        {/* Streak & Attendance Gauge Banner */}
        <LinearGradient colors={colors.gradientStudent} style={[styles.streakBanner, shadows.md]}>
          <View style={styles.streakLeft}>
            <View style={styles.flameCircle}>
              <Flame size={32} color="#fff" />
            </View>
            <View>
              <Text style={styles.streakCount}>{streak?.currentStreak || 0} Day Streak</Text>
              <Text style={styles.streakLabel}>
                {streak?.currentStreak > 0 ? '🔥 Great consistency! Keep it up!' : 'Attend today to start a streak'}
              </Text>
            </View>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateText}>{overview?.attendanceRate || 0}%</Text>
            <Text style={styles.rateSub}>Overall Rate</Text>
          </View>
        </LinearGradient>

        {/* Stats Summary Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, shadows.sm]}>
            <CheckCircle size={18} color={colors.success} />
            <Text style={[styles.statNum, { color: colors.success }]}>{overview?.presentCount || 0}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statBox, shadows.sm]}>
            <XCircle size={18} color={colors.danger} />
            <Text style={[styles.statNum, { color: colors.danger }]}>{overview?.absentCount || 0}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={[styles.statBox, shadows.sm]}>
            <Clock size={18} color={colors.warning} />
            <Text style={[styles.statNum, { color: colors.warning }]}>{overview?.lateCount || 0}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={[styles.statBox, shadows.sm]}>
            <Calendar size={18} color={colors.primary} />
            <Text style={[styles.statNum, { color: colors.primary }]}>{overview?.leaveCount || 0}</Text>
            <Text style={styles.statLabel}>Leave</Text>
          </View>
        </View>

        {/* Subject-Wise Attendance Cards */}
        <Text style={styles.sectionTitle}>Subject Breakdown</Text>

        {loading ? (
          <View>{[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}</View>
        ) : (
          subjects.map((sub, idx) => {
            const pct = parseFloat(sub.attendance_percentage || sub.attendanceRate || 0);
            const isGood = pct >= 75;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.subjectCard, shadows.sm]}
                onPress={() => openSubjectDetails(sub)}
                activeOpacity={0.8}
              >
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{sub.subject_name || sub.name}</Text>
                    <Text style={styles.teacherName}>Faculty: {sub.teacher_name || 'Department Faculty'}</Text>
                  </View>
                  <View style={[styles.pctBadge, { backgroundColor: isGood ? colors.success + '22' : colors.danger + '22' }]}>
                    <Text style={[styles.pctText, { color: isGood ? colors.success : colors.danger }]}>
                      {pct}%
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: isGood ? colors.success : colors.danger }]} />
                </View>

                <View style={styles.subjectFooter}>
                  <Text style={styles.classesCount}>
                    {sub.attended_classes || sub.present_count || 0} / {sub.total_classes || sub.total || 0} Sessions Attended
                  </Text>
                  <View style={styles.viewLogsRow}>
                    <Text style={styles.viewLogsText}>View Logs</Text>
                    <ChevronRight size={14} color={colors.student} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Subject Session Details Modal */}
      <Modal visible={!!selectedSubject} transparent animationType="slide" onRequestClose={() => setSelectedSubject(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedSubject?.subject_name || selectedSubject?.name}</Text>
                <Text style={styles.modalSub}>Detailed Session History</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSubject(null)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingDetails ? (
              <ActivityIndicator size="large" color={colors.student} style={{ padding: 40 }} />
            ) : (
              <FlatList
                data={subjectDetails?.logs || []}
                keyExtractor={(item, i) => item.id?.toString() || i.toString()}
                renderItem={({ item }) => {
                  const statusKey = (item.status || 'present').toLowerCase();
                  const config = STATUS_ICONS[statusKey] || STATUS_ICONS.present;
                  const Icon = config.icon;
                  return (
                    <View style={styles.logCard}>
                      <View style={[styles.statusIcon, { backgroundColor: config.bg }]}>
                        <Icon size={16} color={config.color} />
                      </View>
                      <View style={styles.logInfo}>
                        <Text style={styles.logDate}>
                          {item.date ? new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Session Date'}
                        </Text>
                        {item.time_slot && <Text style={styles.logTime}>{item.time_slot}</Text>}
                      </View>
                      <View style={[styles.statusTag, { backgroundColor: config.bg }]}>
                        <Text style={[styles.statusTagText, { color: config.color }]}>{item.status}</Text>
                      </View>
                    </View>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 30 }}
                ListEmptyComponent={
                  <View style={styles.emptyLogs}>
                    <Clock size={32} color={colors.textMuted} />
                    <Text style={styles.emptyLogsText}>No attendance records logged yet for this subject.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  streakBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  flameCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  streakCount: { ...typography.lg, ...typography.bold, color: '#fff' },
  streakLabel: { ...typography.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  rateBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' },
  rateText: { ...typography.xl, ...typography.bold, color: '#fff' },
  rateSub: { fontSize: 9, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: colors.border },
  statNum: { ...typography.base, ...typography.bold },
  statLabel: { fontSize: 11, color: colors.textMuted },
  sectionTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  subjectCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  subjectInfo: { flex: 1, marginRight: spacing.sm },
  subjectName: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  teacherName: { ...typography.xs, color: colors.textSecondary, marginTop: 2 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  pctText: { fontSize: 12, fontWeight: '700' },
  barTrack: { height: 6, backgroundColor: colors.bgElevated, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.sm },
  barFill: { height: '100%', borderRadius: radius.full },
  subjectFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  classesCount: { ...typography.xs, color: colors.textMuted },
  viewLogsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewLogsText: { ...typography.xs, color: colors.student, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  modalSub: { ...typography.xs, color: colors.textSecondary },
  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  statusIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  logInfo: { flex: 1 },
  logDate: { ...typography.sm, ...typography.semibold, color: colors.textPrimary },
  logTime: { ...typography.xs, color: colors.textMuted, marginTop: 1 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusTagText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  emptyLogs: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyLogsText: { ...typography.sm, color: colors.textMuted, textAlign: 'center' },
});

export default StudentAttendanceHistoryScreen;
