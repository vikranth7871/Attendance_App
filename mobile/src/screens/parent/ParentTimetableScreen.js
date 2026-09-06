import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar, Clock, MapPin, User, BookOpen, Download,
  Grid, List
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
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
  colors.parent, colors.primary, colors.teacher, colors.secondary, '#ec4899', '#14b8a6', '#f59e0b'
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

const ParentTimetableScreen = ({ navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [academicData, setAcademicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [activeDay, setActiveDay] = useState(
    DAYS[new Date().getDay() === 0 ? 0 : Math.min(new Date().getDay() - 1, 5)]
  );

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      const kids = Array.isArray(data) ? data : [];
      setChildren(kids);
      if (kids.length > 0 && !selectedChild) {
        setSelectedChild(kids[0]);
      }
    } catch (err) {
      console.error('Fetch children error:', err);
    }
  };

  const fetchTimetable = async (childId) => {
    if (!childId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/parent/student-academic?studentId=${childId}`);
      setAcademicData(data);
    } catch (err) {
      console.error('Fetch timetable error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchTimetable(selectedChild.id);
    }
  }, [selectedChild]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedChild) fetchTimetable(selectedChild.id);
    else fetchChildren();
  }, [selectedChild]);

  const allSlots = academicData?.timetable || [];

  const getSubjectForSlot = useCallback((day, slot) => {
    return allSlots.find((s) => {
      const sDay = s.dayOfWeek || s.day_of_week || s.day || '';
      if (!sDay || sDay.toLowerCase() !== day.toLowerCase()) return false;
      const sSlot = s.timeSlot || s.time_slot;
      if (sSlot && sSlot.toLowerCase() === slot.toLowerCase()) return true;
      const [start] = slot.split(' - ');
      if (s.startTime && start && (s.startTime.startsWith(start.slice(0, 5)) || start.includes(s.startTime))) return true;
      if (s.start_time && start && (s.start_time.startsWith(start.slice(0, 5)) || start.includes(s.start_time))) return true;
      return false;
    });
  }, [allSlots]);

  const daySlots = allSlots.filter((s) => {
    const d = s.dayOfWeek || s.day_of_week || '';
    return d.toLowerCase() === activeDay.toLowerCase();
  });

  const handleExportTimetable = async () => {
    if (allSlots.length === 0) {
      Alert.alert('No Data', 'No timetable entries found to export.');
      return;
    }

    let text = `==========================================================\n`;
    text += `               OFFICIAL STUDENT TIMETABLE (iAttend)       \n`;
    text += `==========================================================\n`;
    text += `Student Name : ${selectedChild?.name || 'Student'}\n`;
    text += `Generated on : ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    text += `Total Sessions: ${allSlots.length}\n\n`;

    DAYS.forEach((d) => {
      const dayClasses = allSlots.filter(
        (s) => (s.dayOfWeek || s.day_of_week || '').toLowerCase() === d.toLowerCase()
      );
      text += `--- ${d.toUpperCase()} (${dayClasses.length} sessions) ---\n`;
      if (dayClasses.length === 0) {
        text += `  No lectures scheduled\n\n`;
      } else {
        dayClasses.forEach((c) => {
          const subName = c.subjectName || c.subject_name || c.name || 'Subject';
          const time = c.timeSlot || `${c.startTime || ''} - ${c.endTime || ''}`;
          const room = c.roomNumber || c.room ? ` (Room ${c.roomNumber || c.room})` : '';
          const teacher = c.teacherName || c.teacher_name ? ` - Prof. ${c.teacherName || c.teacher_name}` : '';
          text += `  • ${time} | ${subName}${room}${teacher}\n`;
        });
        text += `\n`;
      }
    });

    const filename = `timetable_${selectedChild?.name?.replace(/\s+/g, '_') || 'student'}.txt`;
    const success = await exportText(filename, text, 'text/plain');
    if (success) {
      Alert.alert('✅ Exported', 'Timetable file downloaded successfully.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Class Timetable"
        subtitle={selectedChild ? `${selectedChild.name}'s Schedule` : 'Weekly schedule'}
        navigation={navigation}
        rightAction={
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportTimetable} activeOpacity={0.8}>
            <Download size={16} color={colors.parent} />
          </TouchableOpacity>
        }
      />

      {/* Multi-Child selector */}
      {children.length > 1 && (
        <View style={styles.childrenBar}>
          <Text style={styles.childrenBarLabel}>Child:</Text>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.childChip, selectedChild?.id === child.id && styles.childChipActive]}
              onPress={() => setSelectedChild(child)}
            >
              <User size={13} color={selectedChild?.id === child.id ? '#fff' : colors.textSecondary} />
              <Text style={[styles.childChipText, selectedChild?.id === child.id && styles.childChipTextActive]}>
                {child.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Metrics Strip */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricVal}>{allSlots.length}</Text>
          <Text style={styles.metricLabel}>Total Sessions</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricVal, { color: colors.primary }]}>{academicData?.subjects?.length || 6}</Text>
          <Text style={styles.metricLabel}>Subjects</Text>
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
        /* Weekly Matrix Grid */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.gridContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
        >
          <View style={styles.gridOuterCard}>
            <View style={styles.gridCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={18} color={colors.parent} />
                <Text style={styles.gridCardTitle}>Timetable Matrix</Text>
              </View>
              <Text style={styles.gridScrollHint}>👉 Scroll horizontally</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled={true}>
              <View style={styles.table}>
                {/* Header */}
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
                      <Text style={[styles.headerCellText, { color: colors.parent }]}>
                        {DAY_SHORT[idx]}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Slots */}
                {TIME_SLOTS.map((slot, rowIndex) => {
                  const [startPart, endPart] = slot.split(' - ');
                  const isLastRow = rowIndex === TIME_SLOTS.length - 1;

                  return (
                    <View key={slot} style={[styles.tableRow, isLastRow && styles.lastRow]}>
                      <View style={[styles.cell, styles.timeCell, styles.timeCol]}>
                        <Clock size={11} color={colors.textMuted} style={{ marginBottom: 2 }} />
                        <Text style={styles.timeCellText}>{startPart}</Text>
                        <Text style={styles.timeCellSub}>to</Text>
                        <Text style={styles.timeCellText}>{endPart}</Text>
                      </View>

                      {DAYS.map((day, colIndex) => {
                        const sub = getSubjectForSlot(day, slot);
                        const isLastCol = colIndex === DAYS.length - 1;
                        const subColor = PERIOD_COLORS[(colIndex + rowIndex) % PERIOD_COLORS.length];

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
                              <View style={[styles.gridSlotCard, { borderLeftColor: subColor }]}>
                                <Text style={styles.gridSubjectName} numberOfLines={2}>
                                  {sub.subjectName || sub.subject_name || sub.name || 'Subject'}
                                </Text>
                                <View style={styles.gridMetaRow}>
                                  <MapPin size={9} color={colors.textMuted} />
                                  <Text style={styles.gridRoomText} numberOfLines={1}>
                                    {sub.roomNumber || sub.room || 'TBD'}
                                  </Text>
                                </View>
                                {(sub.teacherName || sub.teacher_name) && (
                                  <View style={styles.gridTeacherRow}>
                                    <User size={8} color={colors.parent} />
                                    <Text style={styles.gridTeacherText} numberOfLines={1}>
                                      {sub.teacherName || sub.teacher_name}
                                    </Text>
                                  </View>
                                )}
                              </View>
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
        /* Day Schedule List */
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
            {DAYS.map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.dayTab, activeDay === day && styles.dayTabActive]}
                onPress={() => setActiveDay(day)}
              >
                <Text style={[styles.dayTabText, activeDay === day && styles.dayTabTextActive]}>
                  {day.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={{ padding: spacing.md }}>
              {[...Array(4)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
            </View>
          ) : (
            <FlatList
              data={daySlots}
              keyExtractor={(item, i) => item.id?.toString() || i.toString()}
              contentContainerStyle={{ padding: spacing.md }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
              renderItem={({ item, index }) => (
                <View style={[styles.periodCard, { borderLeftColor: PERIOD_COLORS[index % PERIOD_COLORS.length] }, shadows.sm]}>
                  <View style={styles.periodTimeCol}>
                    <Clock size={14} color={colors.textMuted} />
                    <Text style={styles.periodTimeText}>{item.timeSlot || `${item.startTime || ''} - ${item.endTime || ''}`}</Text>
                  </View>
                  <View style={styles.periodInfoCol}>
                    <Text style={styles.periodName}>{item.subjectName || item.name || 'Subject'}</Text>
                    <View style={styles.periodMetaRow}>
                      {item.roomNumber ? (
                        <View style={styles.metaBadge}>
                          <MapPin size={11} color={colors.textMuted} />
                          <Text style={styles.metaText}>Room {item.roomNumber}</Text>
                        </View>
                      ) : null}
                      {item.teacherName ? (
                        <View style={styles.metaBadge}>
                          <User size={11} color={colors.textMuted} />
                          <Text style={styles.metaText}>{item.teacherName}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Calendar size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No classes scheduled for {activeDay}</Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  exportBtn: {
    padding: spacing.sm,
    backgroundColor: colors.parent + '22',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.parent + '44',
  },
  childrenBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  childrenBarLabel: { ...typography.xs, ...typography.bold, color: colors.textSecondary },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childChipActive: { backgroundColor: colors.parent, borderColor: colors.parent },
  childChipText: { ...typography.xs, color: colors.textSecondary },
  childChipTextActive: { color: '#fff', fontWeight: 'bold' },
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
  metricVal: { ...typography.lg, ...typography.bold, color: colors.parent },
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
  toggleBtnActive: { backgroundColor: colors.parent },
  toggleBtnText: { ...typography.xs, ...typography.semibold, color: colors.textMuted },
  toggleBtnTextActive: { color: '#fff', fontWeight: '700' },
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
  gridSubjectName: { fontSize: 11, fontWeight: '700', color: colors.textPrimary, lineHeight: 14 },
  gridMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridRoomText: { fontSize: 9, color: colors.textMuted, fontWeight: '500' },
  gridTeacherRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridTeacherText: { fontSize: 9, color: colors.parent, fontWeight: '600' },
  emptyCellDash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyDashText: { fontSize: 12, color: colors.textMuted, opacity: 0.35 },
  dayScroll: { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayScrollContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  dayTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTabActive: { backgroundColor: colors.parent, borderColor: colors.parent },
  dayTabText: { ...typography.xs, color: colors.textSecondary },
  dayTabTextActive: { color: '#fff', fontWeight: 'bold' },
  periodCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  periodTimeCol: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  periodTimeText: { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  periodInfoCol: { flex: 1 },
  periodName: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  periodMetaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: colors.textMuted },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.sm, color: colors.textMuted },
});

export default ParentTimetableScreen;
