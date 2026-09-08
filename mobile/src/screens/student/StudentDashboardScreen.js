import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  Activity, BookOpen, CheckCircle2, AlertTriangle, Clock,
  TrendingUp, TrendingDown, Sparkles, Target, Calendar, Sun,
  PlayCircle, CheckCircle, User, Shield, Award, ClipboardList,
  Gamepad2, ChevronRight, FileText, Brain
} from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import StudentSubjectDetailModal from '../../components/StudentSubjectDetailModal';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

/* ─────────────────────────────────────────────────────────────
   Time parsing helper
───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   Attendance Performance Ring (SVG Gauge + Dynamic Insights)
   Exact replica of Web AttendanceRing component
───────────────────────────────────────────────────────────── */
const AttendancePerformanceCard = ({ present, total }) => {
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  const size = 84;
  const stroke = 8;
  const r = size / 2;
  const normalizedRadius = r - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // ≥90 Excellent | ≥75 Good | <75 Warning
  const tier =
    percentage >= 90 ? 'excellent' :
    percentage >= 75 ? 'good' :
    'warning';

  const TIERS = {
    excellent: {
      color: '#16a34a',
      glow: 'rgba(22, 163, 74, 0.25)',
      bg: 'rgba(22, 163, 74, 0.1)',
      border: 'rgba(22, 163, 74, 0.3)',
      text: '#16a34a',
      label: 'Excellent',
    },
    good: {
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.22)',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.3)',
      text: '#d97706',
      label: 'Good',
    },
    warning: {
      color: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.22)',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: '#ef4444',
      label: 'Warning',
    }
  };

  const cfg = TIERS[tier];

  // Smart insight calculation
  const classesTo75 = total > 0 && percentage < 75
    ? Math.ceil((0.75 * total - present) / 0.25)
    : 0;
  const classesTo90 = total > 0 && percentage < 90
    ? Math.ceil((0.90 * total - present) / 0.10)
    : 0;

  const insight = (() => {
    if (tier === 'excellent') return {
      icon: <Sparkles size={12} color="#16a34a" />,
      text: 'Top Standing!',
      sub: `${present}/${total} attended`
    };
    if (tier === 'good') return {
      icon: <CheckCircle2 size={12} color="#f59e0b" />,
      text: 'Good Standing',
      sub: `${classesTo90} more to 90%`
    };
    // warning
    return {
      icon: <AlertTriangle size={12} color="#ef4444" />,
      text: `Need ${classesTo75} more`,
      sub: 'To reach safe 75%'
    };
  })();

  return (
    <View style={[styles.perfCard, { borderColor: cfg.border }, shadows.sm]}>
      {/* Title */}
      <View style={styles.perfCardHeader}>
        <Target size={13} color={cfg.color} />
        <Text style={styles.perfCardTitle} numberOfLines={1}>Performance</Text>
      </View>

      {/* Circular SVG Gauge */}
      <View style={styles.gaugeBox}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={r} cy={r} r={normalizedRadius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={r} cy={r} r={normalizedRadius}
            stroke={cfg.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.gaugeInner}>
          <Text style={[styles.gaugePct, { color: cfg.color }]}>{percentage}%</Text>
          <Text style={styles.gaugeSub}>OVERALL</Text>
        </View>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
      </View>

      {/* Performance Insights Sub-Card */}
      <View style={[styles.insightsSubCard, { borderColor: cfg.border }]}>
        <View style={styles.insightMiniHeader}>
          {insight.icon}
          <Text style={[styles.insightMiniTitle, { color: cfg.text }]} numberOfLines={1}>
            {insight.text}
          </Text>
        </View>
        <Text style={styles.insightMiniDesc} numberOfLines={1}>
          {insight.sub}
        </Text>
      </View>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main Student Dashboard Screen Component
───────────────────────────────────────────────────────────── */
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

  // Schedule target date calculation
  const targetDate = scheduleTab === 'today' ? new Date() : new Date(Date.now() + 86400000);
  const targetDayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const scheduleDateLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const scheduledClasses = subjects.filter((s) => {
    const day = (s.dayOfWeek || s.day_of_week || '').toString().trim().toLowerCase();
    return (
      day === targetDayName ||
      (day.length >= 3 && targetDayName.startsWith(day.substring(0, 3))) ||
      (targetDayName.length >= 3 && day.startsWith(targetDayName.substring(0, 3)))
    );
  }).sort((a, b) => parseTimeMinutes(a.startTime || a.timeSlot) - parseTimeMinutes(b.startTime || b.timeSlot));

  const quickActions = [
    { label: 'My Timetable', icon: Calendar, screen: 'Timetable', color: colors.primary },
    { label: 'My Subjects', icon: BookOpen, screen: 'StudentSubjects', color: colors.student },
    { label: 'Homework & Assignments', icon: ClipboardList, screen: 'Assignments', color: '#10b981' },
    { label: 'Exam Results', icon: Award, screen: 'StudentResults', color: colors.warning },
    { label: 'Attendance History', icon: FileText, screen: 'StudentAttendanceHistory', color: '#8b5cf6' },
    { label: 'Leave Application', icon: Clock, screen: 'Leave', color: '#f59e0b' },
    { label: 'Quiz Arena', icon: Brain, screen: 'QuizHub', color: '#8b5cf6' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Header
        title="Student Portal"
        subtitle={user?.name ? `${user.name} • ${user?.departmentId?.name || 'CS'} • Sec ${user?.section || 'A'}` : 'Student Overview'}
        showBack={false}
        navigation={navigation}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
      >
        {/* Section Heading: Student Overview */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.pageHeading}>Student Overview</Text>
        </View>

        {/* ─────────────────────────────────────────────────────────────
        {/* ─────────────────────────────────────────────────────────────
            TOP SECTION: Side-by-side Overview Cards
            Attendance Stats (Left) & Attendance Performance (Right)
            Side-by-side allows student to immediately see Today's Schedule
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.topOverviewRow}>
          {/* 1. ATTENDANCE STATS CARD */}
          <View style={[styles.statsCard, shadows.sm]}>
            <View style={styles.statsCardHeader}>
              <Activity size={13} color={colors.student} />
              <Text style={styles.statsCardTitle} numberOfLines={1}>Attendance Stats</Text>
            </View>

            {/* Centered Top Card: Total Sessions with BookOpen icon */}
            <View style={styles.totalSessionsBox}>
              <View style={styles.totalSessionsIconCircle}>
                <BookOpen size={15} color={colors.student} />
              </View>
              <Text style={styles.totalSessionsCount}>{total}</Text>
              <Text style={styles.totalSessionsLabel}>TOTAL SESSIONS</Text>
            </View>

            {/* 3 Metric Rows: Present, Absent, Leave */}
            <View style={styles.metricRowsContainer}>
              {/* Present Row */}
              <View style={[styles.metricRow, styles.presentRow]}>
                <View style={styles.metricRowLeft}>
                  <CheckCircle2 size={12} color="#16a34a" />
                  <Text style={[styles.metricRowLabel, { color: '#16a34a' }]}>Present</Text>
                </View>
                <Text style={[styles.metricRowValue, { color: '#16a34a' }]}>{present}</Text>
              </View>

              {/* Absent Row */}
              <View style={[styles.metricRow, styles.absentRow]}>
                <View style={styles.metricRowLeft}>
                  <AlertTriangle size={12} color="#dc2626" />
                  <Text style={[styles.metricRowLabel, { color: '#dc2626' }]}>Absent</Text>
                </View>
                <Text style={[styles.metricRowValue, { color: '#dc2626' }]}>{absent}</Text>
              </View>

              {/* Leave Row */}
              <View style={[styles.metricRow, styles.leaveRow]}>
                <View style={styles.metricRowLeft}>
                  <Clock size={12} color="#f59e0b" />
                  <Text style={[styles.metricRowLabel, { color: '#f59e0b' }]}>Leave</Text>
                </View>
                <Text style={[styles.metricRowValue, { color: '#f59e0b' }]}>{leave}</Text>
              </View>
            </View>
          </View>

          {/* 2. ATTENDANCE PERFORMANCE CARD */}
          <AttendancePerformanceCard present={present} total={total} />
        </View>

        {/* ─────────────────────────────────────────────────────────────
            TODAY'S SCHEDULE SECTION
        ───────────────────────────────────────────────────────────── */}
        <View style={[styles.scheduleCard, shadows.md]}>
          <View style={styles.scheduleHeaderRow}>
            <View style={styles.scheduleTitleGroup}>
              <Calendar size={18} color={colors.student} />
              <Text style={styles.scheduleTitle}>
                {scheduleTab === 'today' ? "Today's Schedule" : "Tomorrow's Schedule"}
              </Text>
              <Text style={styles.scheduleDateSub}>({scheduleDateLabel})</Text>
            </View>

            {/* Switcher Tabs: [ Today ] [ Tomorrow ] */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tabSwitchBtn, scheduleTab === 'today' && styles.tabSwitchBtnActive]}
                onPress={() => setScheduleTab('today')}
                activeOpacity={0.8}
              >
                <Calendar size={13} color={scheduleTab === 'today' ? '#fff' : colors.textMuted} />
                <Text style={[styles.tabSwitchText, scheduleTab === 'today' && styles.tabSwitchTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabSwitchBtn, scheduleTab === 'tomorrow' && styles.tabSwitchBtnActive]}
                onPress={() => setScheduleTab('tomorrow')}
                activeOpacity={0.8}
              >
                <Sun size={13} color={scheduleTab === 'tomorrow' ? '#fff' : colors.textMuted} />
                <Text style={[styles.tabSwitchText, scheduleTab === 'tomorrow' && styles.tabSwitchTextActive]}>
                  Tomorrow
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Schedule Period Cards */}
          <View style={styles.classesList}>
            {scheduledClasses.length === 0 ? (
              <View style={styles.emptyScheduleBox}>
                <Clock size={36} color={colors.textMuted} />
                <Text style={styles.emptyScheduleText}>
                  No scheduled classes found for {scheduleTab === 'today' ? 'today' : 'tomorrow'}.
                </Text>
              </View>
            ) : (
              scheduledClasses.map((item, index) => {
                const now = new Date();
                const curMins = now.getHours() * 60 + now.getMinutes();
                const startMins = parseTimeMinutes(item.startTime);
                const endMins = parseTimeMinutes(item.endTime);

                let badge = { label: 'Tomorrow', color: colors.student, bg: 'rgba(99, 102, 241, 0.12)', icon: Clock };
                let borderAccent = colors.student;

                if (scheduleTab === 'today') {
                  if (startMins > 0 && endMins > 0 && curMins >= startMins && curMins < endMins) {
                    badge = { label: 'Live Now', color: colors.success, bg: 'rgba(22, 163, 74, 0.15)', icon: PlayCircle };
                    borderAccent = colors.success;
                  } else if (startMins > 0 && endMins > 0 && curMins >= endMins) {
                    badge = { label: 'Completed', color: colors.textMuted, bg: 'rgba(156, 163, 175, 0.15)', icon: CheckCircle };
                    borderAccent = colors.border;
                  } else {
                    badge = { label: 'Upcoming', color: colors.student, bg: 'rgba(99, 102, 241, 0.12)', icon: Clock };
                    borderAccent = colors.student;
                  }
                }

                const BadgeIcon = badge.icon;
                const subjectId = item.subjectId?._id || item.subjectId?.id || item.subject_id || item.subjectId;
                const subName = item.subjectId?.subjectName || item.subjectId?.name || item.subjectName || item.name || 'Course Class';
                const teacher = item.teacherId?.name || item.teacherName || item.teacher;
                const room = item.roomNumber || item.room_number || item.room;
                const time = item.startTime ? `${item.startTime} - ${item.endTime}` : item.timeSlot || item.time_slot || 'Time TBA';

                return (
                  <TouchableOpacity
                    key={item.id || item._id || index}
                    style={[styles.classCard, { borderLeftColor: borderAccent }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (subjectId) {
                        setSelectedSubject({ _id: subjectId, name: subName });
                        setDetailModalVisible(true);
                      }
                    }}
                  >
                    <View style={styles.classCardHeader}>
                      <Text style={styles.classSubjectName} numberOfLines={1}>
                        {subName}
                      </Text>
                      <View style={[styles.classBadge, { backgroundColor: badge.bg }]}>
                        <BadgeIcon size={12} color={badge.color} />
                        <Text style={[styles.classBadgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>

                    <View style={styles.classTimeRow}>
                      <Clock size={13} color={colors.student} />
                      <Text style={styles.classTimeText}>
                        {time} {room ? `(${room})` : ''}
                      </Text>
                    </View>

                    {teacher ? (
                      <View style={styles.classTeacherRow}>
                        <User size={13} color={colors.textMuted} />
                        <Text style={styles.classTeacherText}>{teacher}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* ─────────────────────────────────────────────────────────────
            QUICK ACTIONS NAVIGATION GRID
        ───────────────────────────────────────────────────────────── */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.quickActionsTitle}>Academic Portals</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((qa, i) => {
              const Icon = qa.icon;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.quickActionBtn, shadows.sm]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate(qa.screen)}
                >
                  <View style={[styles.quickActionIconBox, { backgroundColor: qa.color + '18' }]}>
                    <Icon size={18} color={qa.color} />
                  </View>
                  <Text style={styles.quickActionLabel}>{qa.label}</Text>
                  <ChevronRight size={14} color={colors.textMuted} style={styles.quickActionArrow} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* 4-Tab Subject Detail Modal */}
      <StudentSubjectDetailModal
        visible={detailModalVisible}
        subjectId={selectedSubject?._id || selectedSubject?.id}
        subjectName={selectedSubject?.name || selectedSubject?.subjectName}
        onClose={() => setDetailModalVisible(false)}
      />
    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────────────────────
   Styles matching the dark, rich web UI
───────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionHeaderRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  pageHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },

  /* TOP OVERVIEW ROW (Side-by-side) */
  topOverviewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },

  /* 1. ATTENDANCE STATS CARD */
  statsCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    justifyContent: 'space-between',
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statsCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalSessionsBox: {
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  totalSessionsIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  totalSessionsCount: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.student,
    lineHeight: 30,
  },
  totalSessionsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginTop: 1,
  },
  metricRowsContainer: {
    gap: 5,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  metricRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricRowLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricRowValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  presentRow: {
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  absentRow: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: 'rgba(220, 38, 38, 0.25)',
  },
  leaveRow: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },

  /* 2. ATTENDANCE PERFORMANCE CARD */
  perfCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  perfCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  perfCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  gaugeBox: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugePct: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  gaugeSub: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    marginVertical: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  insightsSubCard: {
    width: '100%',
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: colors.bgPrimary,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  insightMiniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  insightMiniTitle: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  insightMiniDesc: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  /* 3. TODAY'S SCHEDULE SECTION */
  scheduleCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  scheduleTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scheduleDateSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.bgPrimary,
    padding: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  tabSwitchBtnActive: {
    backgroundColor: colors.student,
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabSwitchTextActive: {
    color: '#fff',
  },
  classesList: {
    gap: spacing.sm,
  },
  emptyScheduleBox: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  emptyScheduleText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  classCard: {
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    gap: 4,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  classSubjectName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  classTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  classTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.student,
  },
  classTeacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  classTeacherText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  /* 4. QUICK ACTIONS SECTION */
  quickActionsSection: {
    marginTop: spacing.xs,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  quickActionsGrid: {
    gap: spacing.xs,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  quickActionArrow: {
    marginLeft: spacing.xs,
  },
});

export default StudentDashboardScreen;
