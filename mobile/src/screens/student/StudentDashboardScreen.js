import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  TrendingUp, Flame, BookOpen, ClipboardList, Award, ChevronRight,
  Gamepad2, Calendar, Clock, CheckCircle2, AlertTriangle, Shield,
  PlayCircle, CheckCircle, Sparkles, User, Sun
} from 'lucide-react-native';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import StudentSubjectDetailModal from '../../components/StudentSubjectDetailModal';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const parseTimeMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) return 0;
  const [t, modifier] = parts;
  const [h, m] = t.split(':');
  let hh = parseInt(h, 10) || 0;
  let mm = parseInt(m, 10) || 0;
  if (modifier === 'PM' && hh !== 12) hh += 12;
  if (modifier === 'AM' && hh === 12) hh = 0;
  return hh * 60 + mm;
};

const AttendanceRing = ({ present, total }) => {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const color = pct >= 90 ? colors.success : pct >= 75 ? colors.warning : colors.danger;
  const r = 48;
  const stroke = 8;
  const normalR = r - stroke / 2;
  const circumference = 2 * Math.PI * normalR;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <View style={styles.ringContainer}>
      <Svg width={r * 2} height={r * 2} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={r} cy={r} r={normalR} stroke={colors.bgElevated} strokeWidth={stroke} fill="none" />
        <Circle
          cx={r} cy={r} r={normalR}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.ringLabel}>
        <Text style={[styles.ringPct, { color }]}>{pct}%</Text>
        <Text style={styles.ringTitle}>Attendance</Text>
      </View>
    </View>
  );
};

const StudentDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleTab, setScheduleTab] = useState('today'); // 'today' | 'tomorrow'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchData = async () => {
    try {
      const [ovRes, subjRes] = await Promise.all([
        api.get('/student/overview').catch(() => ({ data: null })),
        api.get('/student/subjects').catch(() => ({ data: [] })),
      ]);
      setOverview(ovRes.data);
      setSubjects(Array.isArray(subjRes.data) ? subjRes.data : []);
    } catch (err) {
      console.error('Student dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) return <FullPageLoader message="Loading your dashboard..." />;

  const present = overview?.present_count ?? overview?.totalPresent ?? 0;
  const total = overview?.total_classes ?? overview?.totalClasses ?? 0;
  const absent = overview?.absent_count ?? overview?.totalAbsent ?? 0;
  const leave = overview?.leave_count ?? overview?.totalLeave ?? 0;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  // Tier logic
  const tier = pct >= 90 ? 'excellent' : pct >= 75 ? 'good' : 'warning';
  const classesTo75 = total > 0 && pct < 75 ? Math.ceil((0.75 * total - present) / 0.25) : 0;
  const classesTo90 = total > 0 && pct < 90 ? Math.ceil((0.90 * total - present) / 0.10) : 0;
  const bufferClasses = total > 0 && pct >= 75 ? Math.floor((present - 0.75 * total) / 0.75) : 0;

  // Schedule filtering
  const targetDay = scheduleTab === 'today'
    ? new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    : new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const scheduledClasses = subjects.filter((s) => {
    const day = (s.dayOfWeek || s.day_of_week || '').toString().trim().toLowerCase();
    return day === targetDay || (day.length >= 3 && targetDay.startsWith(day.substring(0, 3))) || (targetDay.length >= 3 && day.startsWith(targetDay.substring(0, 3)));
  }).sort((a, b) => parseTimeMinutes(a.startTime || a.timeSlot) - parseTimeMinutes(b.startTime || b.timeSlot));

  const quickActions = [
    { label: 'Courses', icon: BookOpen, screen: 'StudentSubjects', color: colors.secondary },
    { label: 'Timetable', icon: ClipboardList, screen: 'Timetable', color: colors.primary },
    { label: 'Leave', icon: BookOpen, screen: 'Leave', color: colors.warning },
    { label: 'Leave', icon: Clock, screen: 'Leave', color: colors.warning },
    { label: 'Results', icon: Award, screen: 'StudentResults', color: colors.teacher },
    { label: 'Quiz Arena', icon: Gamepad2, screen: 'QuizHub', color: colors.student },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={`Hi, ${user?.name?.split(' ')[0] || 'Student'} 👋`}
        subtitle="Your academic dashboard"
        navigation={navigation}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
      >
        {/* Top Row: Attendance Ring & Streak */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.attendanceCard, shadows.sm]}
            onPress={() => navigation.navigate('StudentAttendanceHistory')}
            activeOpacity={0.8}
          >
            <AttendanceRing present={present} total={total} />
            <View style={styles.attendanceDetails}>
              <Text style={styles.attendanceDetail}>
                {present} / {total} classes
              </Text>
              <Text style={styles.attendanceSub}>attended • Tap for log</Text>
              <View style={[
                styles.tierBadge,
                { backgroundColor: tier === 'excellent' ? colors.success + '22' : tier === 'good' ? colors.warning + '22' : colors.danger + '22' }
              ]}>
                <Text style={[
                  styles.tierText,
                  { color: tier === 'excellent' ? colors.success : tier === 'good' ? colors.warning : colors.danger }
                ]}>
                  {tier === 'excellent' ? '★ Excellent' : tier === 'good' ? '✔ Good Standing' : '⚠ Action Needed'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.streakCard, shadows.sm]}>
            <Flame size={28} color="#f97316" />
            <Text style={styles.streakCount}>{overview?.streak || 0}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Dynamic Insight Banner */}
        <View style={[
          styles.insightBanner,
          {
            borderColor: tier === 'excellent' ? colors.success + '55' : tier === 'good' ? colors.warning + '55' : colors.danger + '55',
            backgroundColor: tier === 'excellent' ? colors.success + '10' : tier === 'good' ? colors.warning + '10' : colors.danger + '10'
          }
        ]}>
          {tier === 'excellent' ? (
            <View style={styles.insightContent}>
              <Sparkles size={18} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightTitle, { color: colors.success }]}>Top Tier Performance</Text>
                <Text style={styles.insightSub}>
                  {bufferClasses > 0
                    ? `Safe buffer: You can miss up to ${bufferClasses} classes while maintaining 75%.`
                    : 'Outstanding consistency! Keep it up.'}
                </Text>
              </View>
            </View>
          ) : tier === 'good' ? (
            <View style={styles.insightContent}>
              <CheckCircle2 size={18} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightTitle, { color: colors.warning }]}>Good Academic Standing</Text>
                <Text style={styles.insightSub}>
                  {classesTo90 > 0
                    ? `Attend next ${classesTo90} consecutive classes to achieve 90% distinction.`
                    : 'You are safely above the 75% minimum threshold.'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.insightContent}>
              <AlertTriangle size={18} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightTitle, { color: colors.danger }]}>Attendance Shortage Warning</Text>
                <Text style={styles.insightSub}>
                  {classesTo75 > 0
                    ? `Must attend next ${classesTo75} consecutive sessions to reach 75% minimum.`
                    : 'Shortage detected. Please consult your faculty coordinator.'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Session Breakdown Mini Stats */}
        <View style={styles.miniStatsRow}>
          <View style={[styles.miniStatCard, { borderLeftColor: colors.primary }]}>
            <Text style={styles.miniStatVal}>{total}</Text>
            <Text style={styles.miniStatLbl}>Total</Text>
          </View>
          <View style={[styles.miniStatCard, { borderLeftColor: colors.success }]}>
            <Text style={[styles.miniStatVal, { color: colors.success }]}>{present}</Text>
            <Text style={styles.miniStatLbl}>Present</Text>
          </View>
          <View style={[styles.miniStatCard, { borderLeftColor: colors.danger }]}>
            <Text style={[styles.miniStatVal, { color: colors.danger }]}>{absent}</Text>
            <Text style={styles.miniStatLbl}>Absent</Text>
          </View>
          <View style={[styles.miniStatCard, { borderLeftColor: colors.warning }]}>
            <Text style={[styles.miniStatVal, { color: colors.warning }]}>{leave}</Text>
            <Text style={styles.miniStatLbl}>Leave</Text>
          </View>
        </View>

        {/* Daily Schedule Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Daily Schedule</Text>
          <View style={styles.scheduleTabSwitcher}>
            <TouchableOpacity
              style={[styles.schedTabBtn, scheduleTab === 'today' && styles.schedTabBtnActive]}
              onPress={() => setScheduleTab('today')}
            >
              <Calendar size={12} color={scheduleTab === 'today' ? '#ffffff' : colors.textMuted} />
              <Text style={[styles.schedTabText, scheduleTab === 'today' && styles.schedTabTextActive]}>
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.schedTabBtn, scheduleTab === 'tomorrow' && styles.schedTabBtnActive]}
              onPress={() => setScheduleTab('tomorrow')}
            >
              <Sun size={12} color={scheduleTab === 'tomorrow' ? '#ffffff' : colors.textMuted} />
              <Text style={[styles.schedTabText, scheduleTab === 'tomorrow' && styles.schedTabTextActive]}>
                Tomorrow
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {scheduledClasses.length === 0 ? (
          <View style={styles.emptySchedule}>
            <Calendar size={24} color={colors.textMuted} />
            <Text style={styles.emptyScheduleText}>
              No scheduled classes for {scheduleTab === 'today' ? 'today' : 'tomorrow'}.
            </Text>
          </View>
        ) : (
          scheduledClasses.map((item, idx) => {
            const now = new Date();
            const curMins = now.getHours() * 60 + now.getMinutes();
            const startMins = parseTimeMinutes(item.startTime);
            const endMins = parseTimeMinutes(item.endTime);

            let status = { label: 'Upcoming', color: colors.primary, icon: Clock };
            if (scheduleTab === 'today' && startMins > 0 && endMins > 0) {
              if (curMins >= startMins && curMins < endMins) {
                status = { label: 'LIVE NOW', color: colors.success, icon: PlayCircle };
              } else if (curMins >= endMins) {
                status = { label: 'Done', color: colors.textMuted, icon: CheckCircle };
              }
            } else if (scheduleTab === 'tomorrow') {
              status = { label: 'Tomorrow', color: colors.teacher, icon: Clock };
            }

            const StatusIcon = status.icon;

            return (
              <TouchableOpacity
                key={item._id || idx}
                style={[
                  styles.classCard,
                  status.label === 'LIVE NOW' && { borderColor: colors.success }
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedSubject(item);
                  setDetailModalVisible(true);
                }}
              >
                <View style={styles.classCardTop}>
                  <Text style={styles.classTitle} numberOfLines={1}>
                    {item.subjectId?.subjectName || item.subjectId?.name || item.subjectName || 'Course'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '22' }]}>
                    <StatusIcon size={12} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.classMetaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={13} color={colors.primary} />
                    <Text style={styles.metaText}>
                      {item.startTime ? `${item.startTime} - ${item.endTime}` : item.timeSlot || 'TBA'}
                    </Text>
                  </View>
                  {item.roomNumber ? (
                    <Text style={styles.roomTag}>Room {item.roomNumber}</Text>
                  ) : null}
                </View>

                {(item.teacherId?.name || item.teacherName) ? (
                  <View style={styles.teacherMeta}>
                    <User size={13} color={colors.textMuted} />
                    <Text style={styles.teacherNameText}>{item.teacherId?.name || item.teacherName}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.quickCard, shadows.sm]}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '22' }]}>
                <action.icon size={22} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
              <ChevronRight size={14} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Subjects Preview */}
        {subjects.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Enrolled Subjects ({subjects.length})</Text>
              <TouchableOpacity onPress={() => navigation.navigate('StudentSubjects')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.subjectList}>
              {subjects.map((sub, idx) => (
                <TouchableOpacity
                  key={sub._id || sub.subjectId?._id || idx}
                  style={styles.subjectCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedSubject(sub);
                    setDetailModalVisible(true);
                  }}
                >
                  <View style={styles.subjectCardIcon}>
                    <BookOpen size={18} color={colors.student} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectCardTitle} numberOfLines={1}>
                      {sub.subjectName || sub.subjectId?.subjectName || sub.subjectId?.name || 'Subject'}
                    </Text>
                    <Text style={styles.subjectCardCode}>
                      {sub.code || sub.subjectId?.code || 'Course'} • Tap for syllabus & marks
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* 4-Tab Course Slide-Over Modal */}
      <StudentSubjectDetailModal
        visible={detailModalVisible}
        subjectId={selectedSubject?._id || selectedSubject?.subjectId?._id || selectedSubject?.subjectId}
        subjectName={selectedSubject?.subjectName || selectedSubject?.subjectId?.subjectName || selectedSubject?.subjectId?.name}
        onClose={() => setDetailModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  topRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  attendanceCard: {
    flex: 2, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  ringContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center' },
  ringPct: { ...typography.base, ...typography.bold },
  ringTitle: { fontSize: 10, color: colors.textMuted, marginTop: -2 },
  attendanceDetails: { flex: 1 },
  attendanceDetail: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  attendanceSub: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  tierBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full, marginTop: 6,
  },
  tierText: { ...typography.xs, fontWeight: '700' },
  streakCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  streakCount: { ...typography.xxl, ...typography.bold, color: '#f97316' },
  streakLabel: { ...typography.xs, color: colors.textMuted },
  insightBanner: {
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1,
    marginBottom: spacing.sm,
  },
  insightContent: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  insightTitle: { ...typography.sm, ...typography.bold },
  insightSub: { ...typography.xs, color: colors.textSecondary, marginTop: 2 },
  miniStatsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  miniStatCard: {
    flex: 1, backgroundColor: colors.bgCard, padding: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, alignItems: 'center',
  },
  miniStatVal: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  miniStatLbl: { ...typography.xs, color: colors.textMuted },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  sectionTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  viewAllText: {
    ...typography.xs,
    color: colors.student,
    fontWeight: '700',
  },
  scheduleTabSwitcher: {
    flexDirection: 'row', backgroundColor: colors.bgCard,
    borderRadius: radius.full, padding: 2, borderWidth: 1, borderColor: colors.border,
  },
  schedTabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  schedTabBtnActive: { backgroundColor: colors.student },
  schedTabText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  schedTabTextActive: { color: '#ffffff', fontWeight: '700' },
  emptySchedule: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.lg, alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    marginBottom: spacing.sm,
  },
  emptyScheduleText: { ...typography.xs, color: colors.textMuted },
  classCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.xs, gap: 6,
  },
  classCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  classTitle: { ...typography.sm, ...typography.bold, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full,
  },
  statusText: { ...typography.xs, fontWeight: '700' },
  classMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...typography.xs, color: colors.primary, fontWeight: '600' },
  roomTag: { ...typography.xs, color: colors.textMuted },
  teacherMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  teacherNameText: { ...typography.xs, color: colors.textMuted },
  quickGrid: { gap: spacing.xs, marginTop: spacing.xs, marginBottom: spacing.sm },
  quickCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  quickIcon: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  subjectList: { gap: spacing.xs, marginTop: spacing.xs },
  subjectCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  subjectCardIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.student + '22',
    justifyContent: 'center', alignItems: 'center',
  },
  subjectCardTitle: { ...typography.sm, ...typography.semibold, color: colors.textPrimary },
  subjectCardCode: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
});

export default StudentDashboardScreen;
