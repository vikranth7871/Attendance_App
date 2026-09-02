import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, BookOpen } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PERIOD_COLORS = [colors.primary, colors.teacher, colors.student, colors.secondary, '#ec4899', '#14b8a6'];

const StudentTimetableScreen = () => {
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 0 : new Date().getDay() - 1);

  const fetchTimetable = async () => {
    try {
      const { data } = await api.get('/student/timetable');
      // Group by day
      const grouped = {};
      (data || []).forEach(entry => {
        const day = entry.day_of_week || entry.day;
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(entry);
      });
      setTimetable(grouped);
    } catch (err) { console.error('Timetable fetch error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchTimetable(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchTimetable(); }, []);

  if (loading) return <FullPageLoader message="Loading timetable..." />;

  const selectedDayName = DAYS[selectedDay];
  const dayPeriods = timetable[selectedDayName] || timetable[selectedDay] || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Timetable" subtitle="Your weekly class schedule" />

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
        {DAYS.map((day, i) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}
            onPress={() => setSelectedDay(i)}
          >
            <Text style={[styles.dayTabText, selectedDay === i && styles.dayTabTextActive]}>{DAY_SHORT[i]}</Text>
            {selectedDay === i && <View style={styles.dayTabDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
      >
        <Text style={styles.dayTitle}>{selectedDayName}</Text>

        {dayPeriods.length === 0 ? (
          <View style={styles.empty}>
            <Clock size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No classes on {selectedDayName}</Text>
          </View>
        ) : (
          dayPeriods
            .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
            .map((period, i) => {
              const color = PERIOD_COLORS[i % PERIOD_COLORS.length];
              return (
                <View key={i} style={[styles.periodCard, shadows.sm, { borderLeftColor: color }]}>
                  <View style={[styles.periodTime]}>
                    <Text style={[styles.timeText, { color }]}>{period.start_time || '—'}</Text>
                    <Text style={styles.timeSep}>–</Text>
                    <Text style={styles.timeText}>{period.end_time || '—'}</Text>
                  </View>
                  <View style={styles.periodInfo}>
                    <Text style={styles.subjectName}>{period.subject_name || period.subject}</Text>
                    <Text style={styles.teacherName}>{period.teacher_name || period.teacher}</Text>
                    {period.room && <Text style={styles.room}>Room {period.room}</Text>}
                  </View>
                  <View style={[styles.periodIcon, { backgroundColor: color + '22' }]}>
                    <BookOpen size={16} color={color} />
                  </View>
                </View>
              );
            })
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  dayTabs: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  dayTab: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', minWidth: 52,
  },
  dayTabActive: { backgroundColor: colors.student + '22', borderColor: colors.student },
  dayTabText: { ...typography.sm, ...typography.semibold, color: colors.textMuted },
  dayTabTextActive: { color: colors.student },
  dayTabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.student, marginTop: 3 },
  content: { padding: spacing.md },
  dayTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  periodCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4,
  },
  periodTime: { alignItems: 'center', width: 52 },
  timeText: { ...typography.xs, ...typography.semibold, color: colors.textSecondary },
  timeSep: { ...typography.xs, color: colors.textMuted },
  periodInfo: { flex: 1, paddingHorizontal: spacing.sm },
  subjectName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  teacherName: { ...typography.sm, color: colors.textSecondary },
  room: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  periodIcon: { width: 36, height: 36, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default StudentTimetableScreen;
