import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, BookOpen, Download, PlayCircle, MapPin, User } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import StudentSubjectDetailModal from '../../components/StudentSubjectDetailModal';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText } from '../../utils/fileExporter';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIOD_COLORS = [colors.student, colors.primary, colors.teacher, colors.secondary, '#ec4899', '#14b8a6'];

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

const StudentTimetableScreen = () => {
  const [timetable, setTimetable] = useState({});
  const [rawEntries, setRawEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 0 : new Date().getDay() - 1);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchTimetable = async () => {
    try {
      const { data } = await api.get('/student/timetable');
      const list = Array.isArray(data) ? data : [];
      setRawEntries(list);
      // Group by day
      const grouped = {};
      list.forEach((entry) => {
        const day = entry.day_of_week || entry.dayOfWeek || entry.day;
        if (!day) return;
        const normalizedDay = DAYS.find((d) => d.toLowerCase() === day.toString().toLowerCase()) || day;
        if (!grouped[normalizedDay]) grouped[normalizedDay] = [];
        grouped[normalizedDay].push(entry);
      });
      setTimetable(grouped);
    } catch (err) {
      console.error('Timetable fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTimetable();
  }, []);

  const handleExportTimetable = async () => {
    if (rawEntries.length === 0) {
      Alert.alert('No Data', 'No timetable entries found to export.');
      return;
    }

    let text = `==========================================================\n`;
    text += `               iAttend OFFICIAL CLASS TIMETABLE           \n`;
    text += `==========================================================\n`;
    text += `Generated on: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

    DAYS.forEach((d) => {
      const dayClasses = timetable[d] || [];
      text += `--- ${d.toUpperCase()} (${dayClasses.length} sessions) ---\n`;
      if (dayClasses.length === 0) {
        text += `  No lectures scheduled\n\n`;
      } else {
        dayClasses.forEach((c) => {
          text += `  • ${c.startTime || c.start_time || 'TBA'} - ${c.endTime || c.end_time || 'TBA'} | ${c.subjectName || c.subject_name || 'Subject'}`;
          if (c.roomNumber || c.room) text += ` (Room ${c.roomNumber || c.room})`;
          if (c.teacherName || c.teacher_name) text += ` - Prof. ${c.teacherName || c.teacher_name}`;
          text += `\n`;
        });
        text += `\n`;
      }
    });

    text += `==========================================================\n`;
    text += `Exported from iAttend Mobile App\n`;

    const success = await exportText('My_Class_Timetable.txt', text, 'text/plain');
    if (success) {
      Alert.alert('✅ Exported', 'Timetable file ready for download or sharing.');
    }
  };

  if (loading) return <FullPageLoader message="Loading timetable..." />;

  const selectedDayName = DAYS[selectedDay];
  const dayPeriods = timetable[selectedDayName] || [];
  const todayDayIndex = new Date().getDay() === 0 ? 0 : new Date().getDay() - 1;
  const isToday = selectedDay === todayDayIndex;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Class Timetable"
        subtitle="Weekly lecture schedule"
        rightAction={
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportTimetable}>
            <Download size={17} color={colors.student} />
          </TouchableOpacity>
        }
      />

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
        <View style={styles.dayHeaderRow}>
          <Text style={styles.dayTitle}>{selectedDayName}</Text>
          {isToday && (
            <View style={styles.todayPill}>
              <Text style={styles.todayPillText}>TODAY</Text>
            </View>
          )}
        </View>

        {dayPeriods.length === 0 ? (
          <View style={styles.empty}>
            <Clock size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No classes scheduled for {selectedDayName}</Text>
          </View>
        ) : (
          dayPeriods
            .sort((a, b) => parseTimeMinutes(a.startTime || a.start_time) - parseTimeMinutes(b.startTime || b.start_time))
            .map((period, i) => {
              const color = PERIOD_COLORS[i % PERIOD_COLORS.length];
              const sTime = period.startTime || period.start_time || '—';
              const eTime = period.endTime || period.end_time || '—';

              // Check live status if selected day is today
              let isLive = false;
              if (isToday && sTime !== '—' && eTime !== '—') {
                const now = new Date();
                const curMins = now.getHours() * 60 + now.getMinutes();
                const startM = parseTimeMinutes(sTime);
                const endM = parseTimeMinutes(eTime);
                if (curMins >= startM && curMins < endM) {
                  isLive = true;
                }
              }

              return (
                <TouchableOpacity
                  key={period._id || period.id || i}
                  style={[
                    styles.periodCard,
                    shadows.sm,
                    { borderLeftColor: isLive ? colors.success : color },
                    isLive && { borderColor: colors.success }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    const subId = period.subjectId?._id || period.subjectId || period.subject_id;
                    if (subId) {
                      setSelectedSubject({
                        _id: subId,
                        subjectName: period.subjectName || period.subject_name || period.subject,
                      });
                      setDetailModalVisible(true);
                    }
                  }}
                >
                  <View style={styles.periodTime}>
                    <Text style={[styles.timeText, { color: isLive ? colors.success : color }]}>{sTime}</Text>
                    <Text style={styles.timeSep}>–</Text>
                    <Text style={styles.timeText}>{eTime}</Text>
                  </View>

                  <View style={styles.periodInfo}>
                    <View style={styles.subTitleRow}>
                      <Text style={styles.subjectName} numberOfLines={1}>
                        {period.subjectName || period.subject_name || period.subject || 'Course'}
                      </Text>
                      {isLive && (
                        <View style={styles.liveNowBadge}>
                          <PlayCircle size={10} color={colors.success} />
                          <Text style={styles.liveNowText}>LIVE NOW</Text>
                        </View>
                      )}
                    </View>

                    {(period.teacherName || period.teacher_name || period.teacher) ? (
                      <View style={styles.metaRow}>
                        <User size={12} color={colors.textMuted} />
                        <Text style={styles.teacherName}>{period.teacherName || period.teacher_name || period.teacher}</Text>
                      </View>
                    ) : null}

                    {(period.roomNumber || period.room) ? (
                      <View style={styles.metaRow}>
                        <MapPin size={12} color={colors.textMuted} />
                        <Text style={styles.room}>Room {period.roomNumber || period.room}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={[styles.periodIcon, { backgroundColor: (isLive ? colors.success : color) + '22' }]}>
                    <BookOpen size={16} color={isLive ? colors.success : color} />
                  </View>
                </TouchableOpacity>
              );
            })
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* 4-Tab Subject Modal */}
      <StudentSubjectDetailModal
        visible={detailModalVisible}
        subjectId={selectedSubject?._id}
        subjectName={selectedSubject?.subjectName}
        onClose={() => setDetailModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  exportBtn: {
    padding: spacing.sm, backgroundColor: colors.student + '22',
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.student + '44',
  },
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
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  dayTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  todayPill: { backgroundColor: colors.student + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  todayPillText: { fontSize: 10, color: colors.student, fontWeight: '800' },
  periodCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4,
  },
  periodTime: { alignItems: 'center', width: 62 },
  timeText: { ...typography.xs, ...typography.semibold, color: colors.textSecondary },
  timeSep: { ...typography.xs, color: colors.textMuted },
  periodInfo: { flex: 1, paddingHorizontal: spacing.sm, gap: 2 },
  subTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subjectName: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  liveNowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.success + '22', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.full,
  },
  liveNowText: { fontSize: 9, color: colors.success, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  teacherName: { ...typography.xs, color: colors.textSecondary },
  room: { ...typography.xs, color: colors.textMuted },
  periodIcon: { width: 36, height: 36, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default StudentTimetableScreen;
