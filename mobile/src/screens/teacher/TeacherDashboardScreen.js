import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, FlatList, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users, BookOpen, ClipboardList, TrendingUp, Calendar, ChevronRight,
  MessageSquare, Award, FileSpreadsheet, Download, Clock, Share2, CheckCircle2,
  Sparkles
} from 'lucide-react-native';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { exportText, exportCsv } from '../../utils/fileExporter';
import ReportModal from '../../components/ReportModal';
import Papa from 'papaparse';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TeacherDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState(DAYS.includes(todayName) ? todayName : 'Monday');

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

  const isCurrentSlot = (slot) => {
    if (!slot.startTime || !slot.endTime) return false;
    const now = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const slotDay = slot.dayOfWeek || slot.day_of_week;
    if (slotDay?.toLowerCase() !== currentDay.toLowerCase()) return false;

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const slotStart = startH * 60 + (startM || 0);
    const slotEnd = endH * 60 + (endM || 0);

    return currentMinutes >= slotStart && currentMinutes <= slotEnd;
  };

  const handleExportTimetable = async () => {
    let text = `==========================================================\n`;
    text += `              FACULTY WEEKLY TEACHING SCHEDULE             \n`;
    text += `==========================================================\n`;
    text += `Faculty Name : ${user?.name || 'Faculty Member'}\n`;
    text += `Generated On : ${new Date().toLocaleDateString()}\n\n`;

    DAYS.forEach(day => {
      text += `[${day.toUpperCase()}]\n`;
      const daySlots = subjects.filter(s => (s.dayOfWeek || s.day_of_week)?.toLowerCase() === day.toLowerCase());
      if (daySlots.length === 0) {
        text += `  No lectures scheduled.\n\n`;
      } else {
        daySlots.forEach((s, idx) => {
          const subName = s.subjectId?.name || s.subject_name || s.name || 'Subject';
          const clsName = s.classId?.name || s.class_name || 'Class';
          const time = s.timeSlot || s.time_slot || `${s.startTime || ''} - ${s.endTime || ''}`;
          const room = s.roomNumber || s.room_number ? ` (Room ${s.roomNumber || s.room_number})` : '';
          text += `  ${idx + 1}. ${time}: ${subName} - ${clsName}${room}\n`;
        });
        text += `\n`;
      }
    });

    const filename = `faculty_timetable_${user?.name?.replace(/\s+/g, '_') || 'schedule'}.txt`;
    const ok = await exportText(filename, text);
    if (ok) Alert.alert('✅ Timetable Exported', `Weekly schedule saved to ${filename}`);
  };

  const handleExportAttendanceReport = async () => {
    setExportingReport(true);
    try {
      const { data } = await api.get('/teacher/report');
      const groups = Array.isArray(data) ? data : (data?.roster || []);
      if (groups.length === 0) {
        Alert.alert('No Data', 'No class attendance records available to export.');
        return;
      }

      const rows = [];
      groups.forEach(g => {
        const subName = g.subject?.name || g.subjectName || 'Subject';
        const clsName = g.class?.name || g.className || 'Class';
        (g.students || []).forEach(st => {
          rows.push({
            'Subject': subName,
            'Class': clsName,
            'Roll Number': st.rollNumber || '—',
            'Student Name': st.name,
            'Total Sessions': st.totalSessions,
            'Present Sessions': st.presentSessions,
            'Attendance %': `${st.attendancePercentage}%`,
            'Status Today': st.attendanceStatus || 'Not Marked'
          });
        });
      });

      if (rows.length === 0) {
        Alert.alert('No Student Records', 'No student records found in report.');
        return;
      }

      const csv = Papa.unparse(rows);
      const filename = `teacher_attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
      const ok = await exportCsv(filename, csv);
      if (ok) Alert.alert('✅ Exported', `Class attendance report generated: ${filename}`);
    } catch (err) {
      console.error('Export report error:', err);
      Alert.alert('Export Failed', err.response?.data?.message || 'Could not export attendance report.');
    } finally {
      setExportingReport(false);
    }
  };

  const daySlots = subjects.filter(
    s => (s.dayOfWeek || s.day_of_week)?.toLowerCase() === selectedDay.toLowerCase()
  );

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

        {/* Dashboard Export Action Buttons */}
        <View style={styles.reportActionRow}>
          <TouchableOpacity
            style={[styles.reportBtn, { backgroundColor: colors.teacher + '15', borderColor: colors.teacher + '44' }]}
            onPress={handleExportTimetable}
            activeOpacity={0.8}
          >
            <Share2 size={15} color={colors.teacher} />
            <Text style={[styles.reportBtnText, { color: colors.teacher }]}>Export Timetable</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reportBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '44' }, exportingReport && { opacity: 0.6 }]}
            onPress={handleExportAttendanceReport}
            disabled={exportingReport}
            style={[styles.reportBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '44' }]}
            onPress={() => setShowReportModal(true)}
            activeOpacity={0.8}
          >
            {exportingReport ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Download size={15} color={colors.primary} />
                <Text style={[styles.reportBtnText, { color: colors.primary }]}>Attendance CSV</Text>
              </>
            )}
            <Download size={15} color={colors.primary} />
            <Text style={[styles.reportBtnText, { color: colors.primary }]}>Attendance Report</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Timetable Schedule */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          <Text style={styles.sectionSubBadge}>{selectedDay}</Text>
        </View>

        {/* Day Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsScroll}>
          {DAYS.map(day => {
            const isSelected = selectedDay === day;
            const isToday = day.toLowerCase() === todayName.toLowerCase();
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayTab,
                  isSelected && styles.dayTabActive,
                  isToday && !isSelected && { borderColor: colors.teacher + '55' }
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                  {day.slice(0, 3)}
                </Text>
                {isToday ? (
                  <View style={[styles.todayDot, isSelected && { backgroundColor: '#fff' }]} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Scheduled Slots */}
        {daySlots.length === 0 ? (
          <View style={styles.emptySlotsCard}>
            <Calendar size={28} color={colors.textMuted} />
            <Text style={styles.emptySlotsText}>No lectures scheduled on {selectedDay}</Text>
          </View>
        ) : (
          daySlots.map((slot, i) => {
            const isLive = isCurrentSlot(slot);
            const subName = slot.subjectId?.name || slot.subject_name || slot.name || 'Lecture';
            const clsName = slot.classId?.name || slot.class_name || 'Class Section';
            const timeStr = slot.timeSlot || slot.time_slot || `${slot.startTime || ''} - ${slot.endTime || ''}`;
            const roomStr = slot.roomNumber || slot.room_number ? `Room ${slot.roomNumber || slot.room_number}` : 'Main Hall';

            return (
              <View
                key={i}
                style={[
                  styles.slotCard,
                  shadows.sm,
                  isLive && { borderColor: colors.success, borderWidth: 1.5, backgroundColor: colors.success + '0D' }
                ]}
              >
                <View style={styles.slotTimeCol}>
                  <Clock size={14} color={isLive ? colors.success : colors.textMuted} />
                  <Text style={[styles.slotTimeText, isLive && { color: colors.success, fontWeight: '700' }]}>
                    {timeStr}
                  </Text>
                  {isLive ? (
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.slotDetailsCol}>
                  <Text style={styles.slotSubject}>{subName}</Text>
                  <Text style={styles.slotMeta}>{clsName} • {roomStr}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.slotActionBtn, isLive ? { backgroundColor: colors.success } : { backgroundColor: colors.teacher + '22' }]}
                  onPress={() => navigation.navigate('Attendance')}
                >
                  <ClipboardList size={14} color={isLive ? '#fff' : colors.teacher} />
                  <Text style={[styles.slotActionText, isLive ? { color: '#fff' } : { color: colors.teacher }]}>
                    Mark
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Quick Actions</Text>
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

      {/* Interactive Attendance Report & Filter Modal */}
      <ReportModal visible={showReportModal} onClose={() => setShowReportModal(false)} />
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
  reportActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  reportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  reportBtnText: {
    ...typography.xs,
    ...typography.bold,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionSubBadge: {
    ...typography.xs,
    ...typography.bold,
    color: colors.teacher,
    backgroundColor: colors.teacher + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  dayTabsScroll: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
    alignItems: 'center',
    position: 'relative',
  },
  dayTabActive: {
    backgroundColor: colors.teacher,
    borderColor: colors.teacher,
  },
  dayTabText: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teacher,
    marginTop: 3,
  },
  emptySlotsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptySlotsText: {
    ...typography.sm,
    color: colors.textMuted,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  slotTimeCol: {
    alignItems: 'flex-start',
    gap: 3,
    minWidth: 90,
  },
  slotTimeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  liveBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  liveBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  slotDetailsCol: {
    flex: 1,
  },
  slotSubject: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  slotMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  slotActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  slotActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
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
