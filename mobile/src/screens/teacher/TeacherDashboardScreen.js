import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, BookOpen, ClipboardList, TrendingUp, Calendar, ChevronRight, MessageSquare, Award, FileSpreadsheet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const TeacherDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [reportRes, subjRes] = await Promise.all([
        api.get('/teacher/report').catch(() => ({ data: null })),
        api.get('/teacher/subjects').catch(() => ({ data: [] })),
      ]);
      setReport(reportRes.data);
      setSubjects(subjRes.data || []);
    } catch (err) {
      console.error('Teacher dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  if (loading) return <FullPageLoader message="Loading dashboard..." />;

  const quickActions = [
    { label: 'Mark Attendance', icon: ClipboardList, screen: 'Attendance', color: colors.teacher },
    { label: 'Class Roster', icon: Users, screen: 'Roster', color: colors.primary },
    { label: 'Assignments', icon: BookOpen, screen: 'Assignments', color: colors.student },
    { label: 'Parent Messages', icon: MessageSquare, screen: 'TeacherMessages', color: colors.parent },
    { label: 'AI Quiz Manager', icon: Award, screen: 'TeacherQuizManage', color: colors.student },
    { label: 'Exam Marks', icon: FileSpreadsheet, screen: 'TeacherExams', color: colors.warning },
    { label: 'Apply Leave', icon: Calendar, screen: 'TeacherApplyLeave', color: colors.danger },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={`Hi, ${user?.name?.split(' ')[0] || 'Teacher'} 👋`} subtitle="Today's overview" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
      >
        {/* Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon={Users} label="My Students" value={report?.totalStudents ?? '—'} color={colors.teacher} gradient={[colors.teacher + 'CC', colors.teacher + '22']} style={styles.statCard} />
          <StatCard icon={BookOpen} label="My Subjects" value={subjects.length || (report?.totalSubjects ?? '—')} color={colors.primary} gradient={[colors.primary + 'CC', colors.primary + '22']} style={styles.statCard} />
          <StatCard icon={ClipboardList} label="Attendance Rate" value={report?.attendanceRate ? `${report.attendanceRate}%` : '—'} color={colors.success} gradient={[colors.success + 'CC', colors.success + '22']} style={styles.statCard} />
          <StatCard icon={TrendingUp} label="Assignments" value={report?.totalAssignments ?? '—'} color={colors.warning} gradient={[colors.warning + 'CC', colors.warning + '22']} style={styles.statCard} />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
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

        {/* My Subjects */}
        {subjects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Subjects</Text>
            {subjects.map((subj, i) => (
              <View key={i} style={[styles.subjectCard, shadows.sm]}>
                <View style={[styles.subjectDot, { backgroundColor: colors.teacher }]} />
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subj.subject_name || subj.name}</Text>
                  <Text style={styles.subjectMeta}>
                    {subj.class_name} {subj.section ? `• ${subj.section}` : ''} {subj.department_name ? `• ${subj.department_name}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  sectionTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { minWidth: '47%', maxWidth: '47%' },
  quickGrid: { gap: spacing.xs },
  quickCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  quickIcon: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  subjectCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  subjectDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm, flexShrink: 0 },
  subjectInfo: { flex: 1 },
  subjectName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  subjectMeta: { ...typography.sm, color: colors.textMuted, marginTop: 2 },
});

export default TeacherDashboardScreen;
