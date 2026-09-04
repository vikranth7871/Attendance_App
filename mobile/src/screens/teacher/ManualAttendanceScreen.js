import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Check, X, Clock, Calendar, CheckCheck, XCircle,
  BookOpen, Users, ChevronRight
} from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_MAP = {
  present: { label: 'Present', short: 'P', color: colors.success, bg: colors.success + '22' },
  absent: { label: 'Absent', short: 'A', color: colors.danger, bg: colors.danger + '22' },
  late: { label: 'Late', short: 'L', color: colors.warning, bg: colors.warning + '22' },
};

const ManualAttendanceScreen = ({ navigation }) => {
  const [rosterGroups, setRosterGroups] = useState([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedToday, setSubmittedToday] = useState(false);
  const dateStr = new Date().toISOString().split('T')[0];

  const fetchRoster = async () => {
    try {
      const { data } = await api.get('/teacher/roster');
      const groups = Array.isArray(data) ? data : [];
      setRosterGroups(groups);

      if (groups.length > 0) {
        initGroupAttendance(groups[selectedGroupIndex] || groups[0]);
      }
    } catch (err) {
      console.error('Roster fetch error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load class roster');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const initGroupAttendance = (group) => {
    if (!group || !group.students) return;
    const initial = {};
    let hasAnySubmitted = false;

    group.students.forEach(s => {
      // If attendance already logged today, pre-fill it
      if (s.attendanceStatus) {
        initial[s.id] = s.attendanceStatus.toLowerCase();
        hasAnySubmitted = true;
      } else {
        initial[s.id] = 'present';
      }
    });

    setAttendance(initial);
    setSubmittedToday(hasAnySubmitted);
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoster();
  }, [selectedGroupIndex]);

  const handleSelectGroup = (idx) => {
    setSelectedGroupIndex(idx);
    setSelectedSlotIndex(0);
    initGroupAttendance(rosterGroups[idx]);
  };

  const currentGroup = rosterGroups[selectedGroupIndex] || null;
  const currentSlots = currentGroup?.slots || [];
  const currentSlot = currentSlots[selectedSlotIndex] || null;
  const currentStudents = currentGroup?.students || [];

  const toggleStudentStatus = (studentId) => {
    setAttendance(prev => {
      const cur = prev[studentId] || 'present';
      const next = cur === 'present' ? 'absent' : cur === 'absent' ? 'late' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const setAllStatus = (status) => {
    const next = {};
    currentStudents.forEach(s => {
      next[s.id] = status;
    });
    setAttendance(next);
  };

  const handleSubmitAttendance = async () => {
    if (!currentGroup) {
      Alert.alert('No Class Selected', 'Please select a subject and class first.');
      return;
    }
    if (currentStudents.length === 0) {
      Alert.alert('Empty Roster', 'No students enrolled in this section.');
      return;
    }

    setSubmitting(true);
    try {
      const attendanceData = currentStudents.map(s => ({
        studentId: s.id,
        status: attendance[s.id] || 'present',
      }));

      const payload = {
        attendanceData,
        subjectId: currentGroup.subject?.id || currentGroup.subject?._id,
        classId: currentGroup.class?.id || currentGroup.class?._id,
        date: dateStr,
        timeSlot: currentSlot?.timeSlot || (currentSlot ? `${currentSlot.startTime} - ${currentSlot.endTime}` : null),
      };

      const { data } = await api.post('/attendance/manual-bulk', payload);

      setSubmittedToday(true);
      Alert.alert('✅ Attendance Recorded', data?.message || 'Attendance records successfully saved.');
    } catch (err) {
      console.error('Submit attendance error:', err);
      Alert.alert('Submission Failed', err.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullPageLoader message="Loading assigned class rosters..." />;

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;
  const lateCount = Object.values(attendance).filter(v => v === 'late').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Mark Attendance"
        subtitle={`Session: ${dateStr}`}
        navigation={navigation}
      />

      {/* Class / Subject Horizontal Selector */}
      <View style={styles.selectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
          {rosterGroups.map((grp, idx) => {
            const isSelected = selectedGroupIndex === idx;
            return (
              <TouchableOpacity
                key={grp.allocationId || idx}
                style={[styles.groupChip, isSelected && styles.groupChipActive]}
                onPress={() => handleSelectGroup(idx)}
              >
                <BookOpen size={14} color={isSelected ? '#fff' : colors.teacher} />
                <Text style={[styles.groupChipText, isSelected && styles.groupChipTextActive]}>
                  {grp.subject?.name || grp.subject?.subjectName}
                </Text>
                <View style={[styles.classPill, isSelected && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Text style={[styles.classPillText, isSelected && { color: '#fff' }]}>
                    {grp.class?.name || grp.class?.className}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Slots Selector (if multiple slots) */}
      {currentSlots.length > 1 && (
        <View style={styles.slotRow}>
          <Clock size={14} color={colors.textMuted} />
          <Text style={styles.slotLabel}>Slot:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {currentSlots.map((slot, sIdx) => {
              const active = selectedSlotIndex === sIdx;
              return (
                <TouchableOpacity
                  key={sIdx}
                  style={[styles.slotChip, active && styles.slotChipActive]}
                  onPress={() => setSelectedSlotIndex(sIdx)}
                >
                  <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>
                    {slot.dayOfWeek?.slice(0, 3)} {slot.timeSlot || `${slot.startTime}-${slot.endTime}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Summary KPI Counters & Quick Actions */}
      <View style={styles.metaRow}>
        <View style={styles.counters}>
          <View style={[styles.badgePill, { borderColor: colors.success + '44', backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.badgePillText, { color: colors.success }]}>{presentCount} P</Text>
          </View>
          <View style={[styles.badgePill, { borderColor: colors.danger + '44', backgroundColor: colors.danger + '15' }]}>
            <Text style={[styles.badgePillText, { color: colors.danger }]}>{absentCount} A</Text>
          </View>
          <View style={[styles.badgePill, { borderColor: colors.warning + '44', backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.badgePillText, { color: colors.warning }]}>{lateCount} L</Text>
          </View>
          <Text style={styles.totalText}>{currentStudents.length} enrolled</Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickBtn, { borderColor: colors.success + '66' }]} onPress={() => setAllStatus('present')}>
            <CheckCheck size={13} color={colors.success} />
            <Text style={[styles.quickBtnText, { color: colors.success }]}>All P</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { borderColor: colors.danger + '66' }]} onPress={() => setAllStatus('absent')}>
            <XCircle size={13} color={colors.danger} />
            <Text style={[styles.quickBtnText, { color: colors.danger }]}>All A</Text>
          </TouchableOpacity>
        </View>
      </View>

      {submittedToday && (
        <View style={styles.submittedBanner}>
          <Check size={16} color={colors.success} />
          <Text style={styles.submittedText}>Attendance already recorded for today. Tap Submit to overwrite updates.</Text>
        </View>
      )}

      {/* Student Roster List */}
      <FlatList
        data={currentStudents}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => {
          const status = attendance[item.id] || 'present';
          const cfg = STATUS_MAP[status] || STATUS_MAP.present;

          return (
            <View style={[styles.studentCard, shadows.sm]}>
              <View style={styles.studentInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  {item.rollNumber ? (
                    <Text style={styles.rollBadge}>{item.rollNumber}</Text>
                  ) : null}
                </View>
                <Text style={styles.studentMeta}>
                  {item.attendancePercentage !== undefined ? `${item.attendancePercentage}% Overall` : item.email}
                </Text>
              </View>

              {/* Interactive Status Buttons */}
              <View style={styles.statusButtonsGroup}>
                {['present', 'absent', 'late'].map(st => {
                  const isSelected = status === st;
                  const itemCfg = STATUS_MAP[st];
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.singleStatusBtn,
                        isSelected && { backgroundColor: itemCfg.color, borderColor: itemCfg.color }
                      ]}
                      onPress={() => {
                        setAttendance(prev => ({ ...prev, [item.id]: st }));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.singleStatusText,
                          isSelected ? { color: '#fff', fontWeight: '700' } : { color: colors.textSecondary }
                        ]}
                      >
                        {itemCfg.short}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Users size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No students found in this roster</Text>
          </View>
        }
      />

      {/* Floating Submit Attendance Bar */}
      {currentStudents.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmitAttendance}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={18} color="#fff" />
                <Text style={styles.submitBtnText}>
                  {submittedToday ? 'Update Attendance Record' : 'Submit Attendance'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  selectorContainer: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupChipActive: { backgroundColor: colors.teacher, borderColor: colors.teacher },
  groupChipText: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  groupChipTextActive: { color: '#fff', fontWeight: '700' },
  classPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
  },
  classPillText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  slotLabel: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  slotChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotChipActive: { borderColor: colors.teacher, backgroundColor: colors.teacher + '22' },
  slotChipText: { fontSize: 11, color: colors.textMuted },
  slotChipTextActive: { color: colors.teacher, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  counters: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgePillText: { ...typography.xs, fontWeight: '700' },
  totalText: { ...typography.xs, color: colors.textMuted, marginLeft: 4 },
  quickActions: { flexDirection: 'row', gap: 6 },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: colors.bgCard,
  },
  quickBtnText: { fontSize: 11, fontWeight: '700' },
  submittedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '18',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.success + '33',
  },
  submittedText: { fontSize: 11, color: colors.success, flex: 1 },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  studentInfo: { flex: 1, paddingRight: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  studentName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  rollBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.teacher,
    backgroundColor: colors.teacher + '22',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  studentMeta: { ...typography.xs, color: colors.textMuted },
  statusButtonsGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  singleStatusBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleStatusText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teacher,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  submitBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
});

export default ManualAttendanceScreen;
