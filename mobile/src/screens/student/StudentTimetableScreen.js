import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock, BookOpen, Download, PlayCircle, MapPin, User,
  Grid, List, Calendar
} from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import StudentSubjectDetailModal from '../../components/StudentSubjectDetailModal';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText } from '../../utils/fileExporter';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM'
];

const PERIOD_COLORS = [
  colors.student, colors.primary, colors.teacher, colors.secondary, '#ec4899', '#14b8a6', '#f59e0b'
];

const parseTimeMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) {
    const [h, m] = timeStr.split(':');
    return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
  }
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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
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

  const getSubjectForSlot = useCallback((day, slot) => {
    return rawEntries.find((s) => {
      const sDay = s.day_of_week || s.dayOfWeek || s.day;
      if (!sDay || sDay.toLowerCase() !== day.toLowerCase()) return false;
      const sSlot = s.time_slot || s.timeSlot;
      if (sSlot && sSlot.toLowerCase() === slot.toLowerCase()) return true;
      const [start] = slot.split(' - ');
      if (s.startTime && start && (s.startTime.startsWith(start.slice(0, 5)) || start.includes(s.startTime))) return true;
      if (s.start_time && start && (s.start_time.startsWith(start.slice(0, 5)) || start.includes(s.start_time))) return true;
      return false;
    });
  }, [rawEntries]);

  const uniqueCoursesCount = useMemo(() => {
    const set = new Set();
    rawEntries.forEach((s) => {
      const name = s.subjectName || s.subject_name || s.subject;
      if (name) set.add(name);
    });
    return set.size;
  }, [rawEntries]);

  const isSlotLive = (period) => {
    const sTime = period.startTime || period.start_time;
    const eTime = period.endTime || period.end_time;
    if (!sTime || !eTime) return false;

    const todayDayName = DAYS[new Date().getDay() === 0 ? 0 : new Date().getDay() - 1];
    const sDay = period.day_of_week || period.dayOfWeek || period.day;
    if (!sDay || sDay.toLowerCase() !== todayDayName.toLowerCase()) return false;

    const now = new Date();
    const curMins = now.getHours() * 60 + now.getMinutes();
    const startM = parseTimeMinutes(sTime);
    const endM = parseTimeMinutes(eTime);
    return curMins >= startM && curMins < endM;
  };

  const handleExportTimetable = async () => {
    if (rawEntries.length === 0) {
      Alert.alert('No Data', 'No timetable entries found to export.');
      return;
    }

    let text = `==========================================================\n`;
    text += `               iAttend OFFICIAL CLASS TIMETABLE           \n`;
    text += `==========================================================\n`;
    text += `Generated on: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    text += `Total Sessions: ${rawEntries.length}\n`;
    text += `Enrolled Courses: ${uniqueCoursesCount}\n\n`;

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
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportTimetable} activeOpacity={0.8}>
            <Download size={17} color={colors.student} />
          </TouchableOpacity>
        }
      />

      {/* Metrics Summary Strip */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{rawEntries.length}</Text>
          <Text style={styles.metricLabel}>Total Sessions</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricVal, { color: colors.primary }]}>{uniqueCoursesCount}</Text>
          <Text style={styles.metricLabel}>Courses</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricVal, { color: colors.success }]}>{DAYS.length}</Text>
          <Text style={styles.metricLabel}>Active Days</Text>
        </View>
      </View>

      {/* View Switcher Toggle */}
      <View style={styles.viewToggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
          onPress={() => setViewMode('grid')}
          activeOpacity={0.8}
        >
          <Grid size={15} color={viewMode === 'grid' ? '#fff' : colors.textMuted} />
          <Text style={[styles.toggleBtnText, viewMode === 'grid' && styles.toggleBtnTextActive]}>
            Weekly Matrix
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
          activeOpacity={0.8}
        >
          <List size={15} color={viewMode === 'list' ? '#fff' : colors.textMuted} />
          <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
            Day Schedule
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'grid' ? (
        /* ================================================================ */
        /* 1. WEEKLY MATRIX GRID (Parity with Website TimetableGrid.jsx)    */
        /* ================================================================ */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.gridContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
        >
          <View style={styles.gridOuterCard}>
            <View style={styles.gridCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={18} color={colors.student} />
                <Text style={styles.gridCardTitle}>Timetable Matrix</Text>
              </View>
              <Text style={styles.gridScrollHint}>👉 Scroll horizontally</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled={true}>
              <View style={styles.table}>
                {/* Table Header Row */}
                <View style={styles.tableRow}>
                  <View style={[styles.cell, styles.headerCell, styles.timeCol]}>
                    <Text style={styles.headerCellText}>TIME</Text>
                  </View>
                  {DAYS.map((day, idx) => (
                    <View
                      key={day}
                      style={[
                        styles.cell,
                        styles.headerCell,
                        styles.dayCol,
                        idx === DAYS.length - 1 && styles.lastCellRight
                      ]}
                    >
                      <Text style={[styles.headerCellText, { color: colors.student }]}>
                        {DAY_SHORT[idx]}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Slot Rows */}
                {TIME_SLOTS.map((slot, rowIndex) => {
                  const [startPart, endPart] = slot.split(' - ');
                  const isLastRow = rowIndex === TIME_SLOTS.length - 1;

                  return (
                    <View key={slot} style={[styles.tableRow, isLastRow && styles.lastRow]}>
                      {/* Time Column */}
                      <View style={[styles.cell, styles.timeCell, styles.timeCol]}>
                        <Clock size={11} color={colors.textMuted} style={{ marginBottom: 2 }} />
                        <Text style={styles.timeCellText}>{startPart}</Text>
                        <Text style={styles.timeCellSub}>to</Text>
                        <Text style={styles.timeCellText}>{endPart}</Text>
                      </View>

                      {/* Day Columns */}
                      {DAYS.map((day, colIndex) => {
                        const sub = getSubjectForSlot(day, slot);
                        const isLastCol = colIndex === DAYS.length - 1;
                        const subColor = PERIOD_COLORS[(colIndex + rowIndex) % PERIOD_COLORS.length];
                        const isLive = sub ? isSlotLive(sub) : false;

                        return (
                          <View
                            key={`${day}-${slot}`}
                            style={[
                              styles.cell,
                              styles.dayCol,
                              styles.slotCell,
                              isLastCol && styles.lastCellRight
                            ]}
                          >
                            {sub ? (
                              <TouchableOpacity
                                style={[
                                  styles.gridSlotCard,
                                  { borderLeftColor: isLive ? colors.success : subColor },
                                  isLive && styles.gridSlotCardLive
                                ]}
                                activeOpacity={0.85}
                                onPress={() => {
                                  const subId = sub.subjectId?._id || sub.subjectId || sub.subject_id;
                                  if (subId) {
                                    setSelectedSubject({
                                      _id: subId,
                                      subjectName: sub.subjectName || sub.subject_name || sub.subject,
                                    });
                                    setDetailModalVisible(true);
                                  }
                                }}
                              >
                                {isLive && (
                                  <View style={styles.gridLiveTag}>
                                    <Text style={styles.gridLiveTagText}>LIVE</Text>
                                  </View>
                                )}
                                <Text style={styles.gridSubjectName} numberOfLines={2}>
                                  {sub.subjectName || sub.subject_name || sub.subject || 'Course'}
                                </Text>

                                <View style={styles.gridMetaRow}>
                                  <MapPin size={9} color={colors.textMuted} />
                                  <Text style={styles.gridRoomText} numberOfLines={1}>
                                    {sub.roomNumber || sub.room || 'TBD'}
                                  </Text>
                                </View>

                                {(sub.teacherName || sub.teacher_name || sub.teacher) && (
                                  <View style={styles.gridTeacherRow}>
                                    <User size={8} color={colors.student} />
                                    <Text style={styles.gridTeacherText} numberOfLines={1}>
                                      {sub.teacherName || sub.teacher_name || sub.teacher}
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.emptyCellDash}>
                                <Text style={styles.emptyDashText}>—</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      ) : (
        /* ================================================================ */
        /* 2. INTERACTIVE DAY VIEW                                          */
        /* ================================================================ */
        <>
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
                  const isLive = isSlotLive(period);

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
        </>
      )}

      {/* 4-Tab Subject Modal */}
      <StudentSubjectDetailModal
        visible={detailModalVisible}
        subjectId={selectedSubject?._id || selectedSubject?.id || selectedSubject?.subjectId}
        subjectName={selectedSubject?.subjectName || selectedSubject?.name}
        onClose={() => setDetailModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  exportBtn: {
    padding: spacing.sm, backgroundColor: colors.student + '22',
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.student + '44',
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricItem: { alignItems: 'center' },
  metricVal: { ...typography.lg, ...typography.bold, color: colors.student },
  metricLabel: { ...typography.xs, color: colors.textMuted, marginTop: 1 },
  metricDivider: { width: 1, height: 26, backgroundColor: colors.border },
  viewToggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.bgCard,
    padding: 3,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  toggleBtnActive: { backgroundColor: colors.student },
  toggleBtnText: { ...typography.xs, ...typography.semibold, color: colors.textMuted },
  toggleBtnTextActive: { color: '#fff', fontWeight: '700' },

  /* Weekly Grid */
  gridContainer: { padding: spacing.md },
  gridOuterCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadows.sm,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  gridCardTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  gridScrollHint: { ...typography.xs, color: colors.textMuted, fontStyle: 'italic' },
  table: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  cell: { borderRightWidth: 1, borderRightColor: colors.border },
  lastCellRight: { borderRightWidth: 0 },
  timeCol: { width: 82, backgroundColor: colors.bgSecondary },
  dayCol: { width: 124 },
  headerCell: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCellText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timeCell: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeCellText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  timeCellSub: { fontSize: 8, color: colors.textMuted, marginVertical: 1 },
  slotCell: { padding: 4, minHeight: 96, backgroundColor: colors.bgPrimary, justifyContent: 'center' },
  gridSlotCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    justifyContent: 'space-between',
    gap: 3,
  },
  gridSlotCardLive: { borderColor: colors.success, backgroundColor: colors.success + '0F' },
  gridLiveTag: {
    backgroundColor: colors.success,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  gridLiveTagText: { fontSize: 7, fontWeight: '800', color: '#fff' },
  gridSubjectName: { fontSize: 11, fontWeight: '700', color: colors.textPrimary, lineHeight: 14 },
  gridMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridRoomText: { fontSize: 9, color: colors.textMuted, fontWeight: '500' },
  gridTeacherRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridTeacherText: { fontSize: 9, color: colors.student, fontWeight: '600' },
  emptyCellDash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyDashText: { fontSize: 12, color: colors.textMuted, opacity: 0.35 },

  /* Day Schedule */
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
