import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { TrendingUp, Flame, BookOpen, ClipboardList, Award, ChevronRight, Gamepad2 } from 'lucide-react-native';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const AttendanceRing = ({ present, total }) => {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const color = pct >= 90 ? colors.success : pct >= 75 ? colors.warning : colors.danger;
  const r = 52;
  const stroke = 9;
  const normalR = r - stroke / 2;
  const circumference = 2 * Math.PI * normalR;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <View style={styles.ringContainer}>
      <Svg width={r * 2} height={r * 2}>
        <Circle cx={r} cy={r} r={normalR} stroke={colors.bgElevated} strokeWidth={stroke} fill="none" />
        <Circle
          cx={r} cy={r} r={normalR}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90" originX={r} originY={r}
        />
      </Svg>
      <View style={styles.ringLabel}>
        <Text style={[styles.ringPct, { color }]}>{pct}%</Text>
        <Text style={styles.ringTitle}>Attend.</Text>
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

  const fetchData = async () => {
    try {
      const [ovRes, subjRes] = await Promise.all([
        api.get('/student/overview').catch(() => ({ data: null })),
        api.get('/student/subjects').catch(() => ({ data: [] })),
      ]);
      setOverview(ovRes.data);
      setSubjects(subjRes.data || []);
    } catch (err) { console.error('Student dashboard error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  if (loading) return <FullPageLoader message="Loading your dashboard..." />;

  const quickActions = [
    { label: 'Timetable', icon: ClipboardList, screen: 'Timetable', color: colors.primary },
    { label: 'Leave', icon: BookOpen, screen: 'Leave', color: colors.warning },
    { label: 'Results', icon: Award, screen: 'StudentResults', color: colors.teacher },
    { label: 'Quiz Arena', icon: Gamepad2, screen: 'QuizHub', color: colors.student },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={`Hi, ${user?.name?.split(' ')[0] || 'Student'} 👋`} subtitle="Your academic overview" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
      >
        {/* Attendance + Streak row */}
        {overview && (
          <TouchableOpacity
            style={styles.topRow}
            onPress={() => navigation.navigate('StudentAttendanceHistory')}
            activeOpacity={0.8}
          >
            <View style={[styles.attendanceCard, shadows.sm]}>
              <AttendanceRing present={overview.present_count || 0} total={overview.total_classes || 0} />
              <View style={styles.attendanceDetails}>
                <Text style={styles.attendanceDetail}>
                  {overview.present_count || 0} / {overview.total_classes || 0} classes
                </Text>
                <Text style={styles.attendanceSub}>attended • Tap for logs</Text>
              </View>
            </View>
            <View style={[styles.streakCard, shadows.sm]}>
              <Flame size={28} color="#f97316" />
              <Text style={styles.streakCount}>{overview.streak || 0}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <Text style={styles.sectionTitle}>Academic Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard icon={BookOpen} label="Subjects" value={subjects.length || '—'} color={colors.primary} gradient={[colors.primary + 'CC', colors.primary + '22']} style={styles.statCard} />
          <StatCard icon={Award} label="Avg Score" value={overview?.average_score ? `${overview.average_score}%` : '—'} color={colors.teacher} gradient={[colors.teacher + 'CC', colors.teacher + '22']} style={styles.statCard} />
        </View>

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

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
  ringTitle: { ...typography.xs, color: colors.textMuted },
  attendanceDetails: {},
  attendanceDetail: { ...typography.sm, ...typography.semibold, color: colors.textPrimary },
  attendanceSub: { ...typography.xs, color: colors.textMuted },
  streakCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  streakCount: { ...typography.xxl, ...typography.bold, color: '#f97316' },
  streakLabel: { ...typography.xs, color: colors.textMuted },
  sectionTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { flex: 1 },
  quickGrid: { gap: spacing.xs },
  quickCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  quickIcon: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
});

export default StudentDashboardScreen;
