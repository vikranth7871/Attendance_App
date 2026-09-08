import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock, BookOpen, Download, MapPin, User, Calendar,
  Grid, List, CheckCircle2, ChevronRight, PlayCircle
} from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import StudentSubjectDetailModal from '../../components/StudentSubjectDetailModal';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportTimetableAsImage } from '../../utils/timetableImageExporter';
import { useAuth } from '../../context/AuthContext';

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
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'
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

const StudentTimetableScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const todayIndex = new Date().getDay() === 0 ? 0 : new Date().getDay() - 1;
  const [selectedDayIndex, setSelectedDayIndex] = useState(Math.min(todayIndex, 5));

  const fetchTimetableData = async () => {
    try {
      const [ttRes, subjRes] = await Promise.all([
        api.get('/student/timetable').catch(() => ({ data: [] })),
        api.get('/student/subjects').catch(() => ({ data: [] })),
      ]);

      const rawAllocations = Array.isArray(ttRes.data) ? ttRes.data : [];
      const rawSubjects = Array.isArray(subjRes.data) ? subjRes.data : [];

      // Normalize timetable allocations
      const normalizedList = rawAllocations.map((item) => ({
        id: item.id || item._id,
        subjectId: item.subject_id || item.subjectId?._id || item.subjectId?.id || item.subjectId,
        subjectName: item.subject_name || item.subjectName || item.subjectId?.name || item.subjectId?.subjectName || item.name || 'Subject',
        subjectCode: item.subject_code || item.subjectCode || item.code,
        dayOfWeek: (item.day_of_week || item.dayOfWeek || item.day || '').trim(),
        timeSlot: item.time_slot || item.timeSlot,
        startTime: item.start_time || item.startTime,
        endTime: item.end_time || item.endTime,
        roomNumber: item.room_number || item.roomNumber || item.room,
        teacherName: item.teacher_name || item.teacherName || item.teacher,
      }));

      // Find subjects enrolled without fixed schedule slots (Parity with Teacher Timetable)
      const allocatedSubjectIds = new Set(
        normalizedList.map((s) => String(s.subjectId || s.id))
      );

      rawSubjects.forEach((sub) => {
        const subId = String(sub.id || sub._id || sub.subject_id);
        const subDay = sub.day_of_week || sub.dayOfWeek;
        if (!subDay && !allocatedSubjectIds.has(subId)) {
          normalizedList.push({
            id: `unscheduled-${subId}`,
            subjectId: sub.id || sub._id || sub.subject_id,
            subjectName: sub.name || sub.subject_name || sub.subjectName || 'Subject',
            subjectCode: sub.code,
            dayOfWeek: '',
            timeSlot: '',
            startTime: '',
            endTime: '',
            roomNumber: sub.room_number || sub.roomNumber,
            teacherName: sub.teacher_name || sub.teacherName || sub.teacher,
          });
        }
      });

      setSubjects(normalizedList);
    } catch (err) {
      console.error('Student timetable fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTimetableData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTimetableData();
  }, []);

  // Helper to match subject in day and time slot
  const getSubjectForSlot = useCallback((day, slot) => {
    return subjects.find((s) => {
      const sDay = s.dayOfWeek;
      if (!sDay || sDay.toLowerCase() !== day.toLowerCase()) return false;

      const sSlot = s.timeSlot;
      if (sSlot && sSlot.toLowerCase() === slot.toLowerCase()) return true;

      const [slotStart] = slot.split(' - ');
      if (s.startTime && slotStart && (s.startTime.startsWith(slotStart.slice(0, 5)) || slotStart.includes(s.startTime))) {
        return true;
      }
      return false;
    });
  }, [subjects]);

  // Unscheduled subjects
  const unscheduledSubjects = useMemo(() => {
    return subjects.filter((s) => !s.dayOfWeek);
  }, [subjects]);

  // Scheduled slots list
  const scheduledSubjects = useMemo(() => {
    return subjects.filter((s) => s.dayOfWeek);
  }, [subjects]);

  // Distinct subjects count
  const uniqueSubjectsCount = useMemo(() => {
    const set = new Set();
    subjects.forEach((s) => {
      if (s.subjectName) set.add(s.subjectName);
    });
    return set.size;
  }, [subjects]);

  // Check if a slot is currently happening right now
  const isSlotLive = (slot) => {
    const sDay = slot.dayOfWeek;
    if (!sDay) return false;

    const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    if (sDay.toLowerCase() !== currentDayName.toLowerCase()) return false;

    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes();

    let startM = 0;
    let endM = 0;

    if (slot.startTime && slot.endTime) {
      startM = parseTimeMinutes(slot.startTime);
      endM = parseTimeMinutes(slot.endTime);
    } else if (slot.timeSlot) {
      const [start, end] = slot.timeSlot.split(' - ');
      startM = parseTimeMinutes(start);
      endM = parseTimeMinutes(end);
    }

    return curMinutes >= startM && curMinutes < endM;
  };

  const handleExportTimetable = async () => {
    if (downloadingImage) return;
    if (subjects.length === 0) {
      Alert.alert('No Data', 'No timetable entries found to export.');
      return;
    }

    setDownloadingImage(true);
    try {
      const safeName = (user?.name || 'student').replace(/\s+/g, '_');
      const filename = `student_timetable_${safeName}.png`;

      const ok = await exportTimetableAsImage({
        subjects,
        user,
        days: DAYS,
        timeSlots: TIME_SLOTS,
        periodColors: PERIOD_COLORS,
        filename,
      });

      if (ok) {
        Alert.alert('✅ Download Complete', 'Timetable grid picture downloaded successfully.');
      }
    } catch (err) {
      console.error('Failed to export timetable image:', err);
      Alert.alert('Download Error', 'Unable to download timetable picture.');
    } finally {
      setDownloadingImage(false);
    }
  };

  if (loading) return <FullPageLoader message="Loading timetable..." />;

  const activeDayName = DAYS[selectedDayIndex];
  const activeDaySlots = scheduledSubjects.filter(
    (s) => s.dayOfWeek.toLowerCase() === activeDayName.toLowerCase()
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Weekly Timetable"
        subtitle="Student Class Schedule"
        navigation={navigation}
        rightAction={
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportTimetable}
            activeOpacity={0.8}
            disabled={downloadingImage}
          >
            {downloadingImage ? (
              <ActivityIndicator size="small" color={colors.student} />
            ) : (
              <Download size={16} color={colors.student} />
            )}
          </TouchableOpacity>
        }
      />

      {/* Metrics Strip */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{scheduledSubjects.length}</Text>
          <Text style={styles.metricLabel}>Total Lectures</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricVal, { color: colors.primary }]}>{uniqueSubjectsCount}</Text>
          <Text style={styles.metricLabel}>Enrolled Courses</Text>
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

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
      >
        {viewMode === 'grid' ? (
          /* ================================================================ */
          /* 1. WEEKLY MATRIX GRID (Parity with Website & Teacher Timetable)  */
          /* ================================================================ */
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
                                  { borderLeftColor: isLive ? colors.success : colors.primary },
                                  isLive && styles.gridSlotCardLive
                                ]}
                                activeOpacity={0.85}
                                onPress={() => {
                                  if (sub.subjectId) {
                                    setSelectedSubject({
                                      _id: sub.subjectId,
                                      subjectName: sub.subjectName,
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
                                  {sub.subjectName}
                                </Text>

                                <View style={styles.gridMetaRow}>
                                  <MapPin size={9} color={colors.textMuted} />
                                  <Text style={styles.gridRoomText} numberOfLines={1}>
                                    {sub.roomNumber ? `Rm ${sub.roomNumber}` : 'TBD'}
                                  </Text>
                                </View>

                                {sub.teacherName ? (
                                  <View style={styles.gridTeacherBadge}>
                                    <Text style={styles.gridTeacherBadgeText} numberOfLines={1}>
                                      {sub.teacherName}
                                    </Text>
                                  </View>
                                ) : null}
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
        ) : (
          /* ================================================================ */
          /* 2. INTERACTIVE DAY VIEW                                          */
          /* ================================================================ */
          <View>
            {/* Day Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorPills}>
              {DAYS.map((day, idx) => {
                const isSelected = selectedDayIndex === idx;
                const isToday = idx === todayIndex;
                const count = scheduledSubjects.filter(
                  (s) => s.dayOfWeek.toLowerCase() === day.toLowerCase()
                ).length;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.daySelectorPill,
                      isSelected && styles.daySelectorPillActive,
                      isToday && !isSelected && { borderColor: colors.student + '88' }
                    ]}
                    onPress={() => setSelectedDayIndex(idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayPillShort, isSelected && styles.dayPillShortActive]}>
                      {DAY_SHORT[idx]}
                    </Text>
                    <Text style={[styles.dayPillCount, isSelected && styles.dayPillCountActive]}>
                      {count} {count === 1 ? 'class' : 'classes'}
                    </Text>
                    {isToday && (
                      <View style={[styles.todayIndicator, isSelected && { backgroundColor: '#fff' }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selected Day Header */}
            <View style={styles.daySectionHeader}>
              <View>
                <Text style={styles.daySectionTitle}>{activeDayName}</Text>
                <Text style={styles.daySectionSubtitle}>
                  {activeDaySlots.length} {activeDaySlots.length === 1 ? 'lecture' : 'lectures'} scheduled
                </Text>
              </View>
              {selectedDayIndex === todayIndex && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>TODAY</Text>
                </View>
              )}
            </View>

            {/* List of Lectures */}
            {activeDaySlots.length === 0 ? (
              <View style={styles.emptyDayBox}>
                <Clock size={40} color={colors.textMuted} />
                <Text style={styles.emptyDayTitle}>No lectures on {activeDayName}</Text>
                <Text style={styles.emptyDaySubtitle}>Enjoy your lecture-free preparation time.</Text>
              </View>
            ) : (
              activeDaySlots
                .sort((a, b) => parseTimeMinutes(a.startTime || a.timeSlot) - parseTimeMinutes(b.startTime || b.timeSlot))
                .map((slot, idx) => {
                  const isLive = isSlotLive(slot);
                  const subName = slot.subjectName;
                  const teacher = slot.teacherName;
                  const roomStr = slot.roomNumber ? `Room ${slot.roomNumber}` : 'Room TBA';
                  const timeStr = slot.timeSlot || `${slot.startTime || 'TBD'} - ${slot.endTime || 'TBD'}`;

                  return (
                    <TouchableOpacity
                      key={slot.id || idx}
                      style={[
                        styles.lectureCard,
                        shadows.sm,
                        { borderLeftColor: isLive ? colors.success : colors.primary },
                        isLive && { borderColor: colors.success, borderWidth: 1.5, backgroundColor: colors.success + '0A' }
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (slot.subjectId) {
                          setSelectedSubject({
                            _id: slot.subjectId,
                            subjectName: subName,
                          });
                          setDetailModalVisible(true);
                        }
                      }}
                    >
                      <View style={styles.lectureTimeCol}>
                        <Clock size={13} color={isLive ? colors.success : colors.textMuted} />
                        <Text style={[styles.lectureTimeText, isLive && { color: colors.success, fontWeight: '700' }]}>
                          {timeStr}
                        </Text>
                        {isLive && (
                          <View style={styles.liveNowPill}>
                            <PlayCircle size={9} color="#fff" />
                            <Text style={styles.liveNowPillText}>LIVE NOW</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.lectureInfoCol}>
                        <Text style={styles.lectureSubjectName}>{subName}</Text>
                        {teacher ? (
                          <View style={styles.lectureMetaRow}>
                            <User size={12} color={colors.textMuted} />
                            <Text style={styles.lectureTeacher}>{teacher}</Text>
                          </View>
                        ) : null}
                        <View style={styles.lectureMetaRow}>
                          <MapPin size={12} color={colors.textMuted} />
                          <Text style={styles.lectureRoom}>{roomStr}</Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.detailsBtn,
                          isLive ? { backgroundColor: colors.success } : { backgroundColor: colors.primary + '22' }
                        ]}
                      >
                        <Text style={[styles.detailsBtnText, isLive ? { color: '#fff' } : { color: colors.primary }]}>
                          Details
                        </Text>
                        <ChevronRight size={12} color={isLive ? '#fff' : colors.primary} />
                      </View>
                    </TouchableOpacity>
                  );
                })
            )}
          </View>
        )}

        {/* ================================================================ */}
        {/* Unscheduled Subjects Section (Matches Website TimetableGrid.jsx) */}
        {/* ================================================================ */}
        {unscheduledSubjects.length > 0 && (
          <View style={styles.unscheduledSection}>
            <View style={styles.unscheduledHeader}>
              <BookOpen size={18} color={colors.primary} />
              <Text style={styles.unscheduledTitle}>Individually Enrolled Subjects</Text>
            </View>
            <Text style={styles.unscheduledSubtitle}>
              Subjects enrolled without a fixed periodic weekly schedule slot.
            </Text>

            <View style={styles.unscheduledGrid}>
              {unscheduledSubjects.map((sub, idx) => (
                <TouchableOpacity
                  key={sub.id || idx}
                  style={styles.unscheduledCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (sub.subjectId) {
                      setSelectedSubject({
                        _id: sub.subjectId,
                        subjectName: sub.subjectName,
                      });
                      setDetailModalVisible(true);
                    }
                  }}
                >
                  <Text style={styles.unscheduledCardTitle}>{sub.subjectName}</Text>
                  {sub.teacherName ? <Text style={styles.unscheduledCardMeta}>Faculty: {sub.teacherName}</Text> : null}
                  <View style={styles.unscheduledTag}>
                    <Text style={styles.unscheduledTagText}>Self-Paced / Consultation</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* 4-Tab Subject Detail Modal */}
      <StudentSubjectDetailModal
        visible={detailModalVisible}
        subjectId={selectedSubject?._id || selectedSubject?.id}
        subjectName={selectedSubject?.subjectName || selectedSubject?.name}
        onClose={() => setDetailModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  exportBtn: {
    padding: spacing.sm,
    backgroundColor: colors.student + '22',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.student + '44',
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
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    ...typography.lg,
    ...typography.bold,
    color: colors.student,
  },
  metricLabel: {
    ...typography.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  viewToggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
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
  toggleBtnActive: {
    backgroundColor: colors.student,
  },
  toggleBtnText: {
    ...typography.xs,
    ...typography.semibold,
    color: colors.textMuted,
  },
  toggleBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },

  /* Weekly Matrix Grid Styles */
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
  gridCardTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  gridScrollHint: {
    ...typography.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
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
  lastRow: {
    borderBottomWidth: 0,
  },
  cell: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  lastCellRight: {
    borderRightWidth: 0,
  },
  timeCol: {
    width: 82,
    backgroundColor: colors.bgSecondary,
  },
  dayCol: {
    width: 124,
  },
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
  timeCellText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  timeCellSub: {
    fontSize: 8,
    color: colors.textMuted,
    marginVertical: 1,
  },
  slotCell: {
    padding: 4,
    minHeight: 96,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
  },
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
  gridSlotCardLive: {
    borderColor: colors.success,
    backgroundColor: colors.success + '0F',
  },
  gridLiveTag: {
    backgroundColor: colors.success,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  gridLiveTagText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#fff',
  },
  gridSubjectName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 14,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gridRoomText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '500',
  },
  gridTeacherBadge: {
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  gridTeacherBadgeText: {
    fontSize: 8,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyCellDash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDashText: {
    fontSize: 12,
    color: colors.textMuted,
    opacity: 0.35,
  },

  /* Day Schedule Styles */
  daySelectorPills: {
    gap: 6,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  daySelectorPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 62,
    position: 'relative',
  },
  daySelectorPillActive: {
    backgroundColor: colors.student,
    borderColor: colors.student,
  },
  dayPillShort: {
    ...typography.xs,
    ...typography.bold,
    color: colors.textPrimary,
  },
  dayPillShortActive: {
    color: '#fff',
  },
  dayPillCount: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  dayPillCountActive: {
    color: '#ffffffCC',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.student,
    marginTop: 3,
  },
  daySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  daySectionTitle: {
    ...typography.lg,
    ...typography.bold,
    color: colors.textPrimary,
  },
  daySectionSubtitle: {
    ...typography.xs,
    color: colors.textMuted,
  },
  todayBadge: {
    backgroundColor: colors.student + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.student,
  },
  emptyDayBox: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  emptyDayTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  emptyDaySubtitle: {
    ...typography.xs,
    color: colors.textMuted,
  },
  lectureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    gap: spacing.sm,
  },
  lectureTimeCol: {
    width: 78,
    alignItems: 'flex-start',
    gap: 3,
  },
  lectureTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  liveNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.success,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  liveNowPillText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#fff',
  },
  lectureInfoCol: {
    flex: 1,
    gap: 3,
  },
  lectureSubjectName: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  lectureMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lectureTeacher: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  lectureRoom: {
    ...typography.xs,
    color: colors.textMuted,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Unscheduled section */
  unscheduledSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unscheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  unscheduledTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  unscheduledSubtitle: {
    ...typography.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  unscheduledGrid: {
    gap: spacing.sm,
  },
  unscheduledCard: {
    backgroundColor: colors.bgPrimary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  unscheduledCardTitle: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  unscheduledCardMeta: {
    ...typography.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  unscheduledTag: {
    backgroundColor: colors.warning + '22',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginTop: 6,
  },
  unscheduledTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.warning,
  },
});

export default StudentTimetableScreen;
