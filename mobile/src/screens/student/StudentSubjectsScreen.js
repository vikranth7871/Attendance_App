import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  User,
  Search,
  ChevronRight,
  Clock,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  GraduationCap,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import StudentSubjectDetailModal from '../../components/StudentSubjectDetailModal';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const StudentSubjectsScreen = ({ navigation }) => {
  const [subjectsList, setSubjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Selected subject for detail modal
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/student/subjects');
      const rawList = Array.isArray(data) ? data : [];

      // Group allocations by subjectId so multiple slots show under 1 subject card
      const map = {};
      rawList.forEach((item) => {
        const sid = item.subjectId?._id || item.subjectId?.id || item._id;
        if (!map[sid]) {
          map[sid] = {
            id: sid,
            name: item.subjectId?.name || item.subjectId?.subjectName || 'Course',
            code: item.subjectId?.code || '',
            credits: item.subjectId?.credits || 3,
            teacher: item.teacherId || {},
            className: item.classId?.name || item.classId?.className || '',
            attendance: item.attendance || { total: 0, present: 0, absent: 0, leave: 0, percentage: 0 },
            slots: [],
          };
        }
        if (item.dayOfWeek && item.timeSlot) {
          map[sid].slots.push({
            day: item.dayOfWeek,
            time: item.timeSlot,
            room: item.roomNumber,
          });
        }
      });

      setSubjectsList(Object.values(map));
    } catch (err) {
      console.error('Failed to fetch student subjects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubjects();
  }, []);

  const filtered = subjectsList.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q) ||
      (s.teacher?.name || '').toLowerCase().includes(q)
    );
  });

  // Aggregated KPI stats
  const totalCourses = subjectsList.length;
  const avgAttendance =
    totalCourses > 0
      ? Math.round(
          subjectsList.reduce((acc, s) => acc + (s.attendance?.percentage || 0), 0) / totalCourses
        )
      : 0;
  const totalCredits = subjectsList.reduce((acc, s) => acc + (Number(s.credits) || 3), 0);

  const openSubjectDetail = (subj) => {
    setSelectedSubject(subj);
    setDetailModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="My Courses" subtitle="Academic Curriculum & Faculty" navigation={navigation} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
      >
        {/* KPI Stats Bar */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, shadows.sm]}>
            <BookOpen size={18} color={colors.student} />
            <Text style={styles.statVal}>{totalCourses}</Text>
            <Text style={styles.statLbl}>Courses</Text>
          </View>
          <View style={[styles.statBox, shadows.sm]}>
            <Award size={18} color={avgAttendance >= 75 ? colors.success : colors.warning} />
            <Text
              style={[
                styles.statVal,
                { color: avgAttendance >= 75 ? colors.success : colors.warning },
              ]}
            >
              {avgAttendance}%
            </Text>
            <Text style={styles.statLbl}>Avg Turnout</Text>
          </View>
          <View style={[styles.statBox, shadows.sm]}>
            <GraduationCap size={18} color={colors.secondary} />
            <Text style={styles.statVal}>{totalCredits}</Text>
            <Text style={styles.statLbl}>Credits</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by course name, code, or faculty..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Courses List */}
        {loading ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpen size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Courses Found</Text>
            <Text style={styles.emptySub}>
              {search ? 'Try adjusting your search criteria.' : 'No enrolled courses available yet.'}
            </Text>
          </View>
        ) : (
          filtered.map((subject) => {
            const att = subject.attendance || { percentage: 0, present: 0, total: 0 };
            const pct = att.percentage || 0;
            const attColor = pct >= 75 ? colors.success : pct >= 50 ? colors.warning : colors.danger;

            return (
              <TouchableOpacity
                key={subject.id}
                style={[styles.courseCard, shadows.sm]}
                onPress={() => openSubjectDetail(subject)}
                activeOpacity={0.8}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.courseIconBox}>
                    <BookOpen size={20} color={colors.student} />
                  </View>
                  <View style={styles.titleArea}>
                    <View style={styles.codeRow}>
                      {subject.code ? (
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeBadgeText}>{subject.code}</Text>
                        </View>
                      ) : null}
                      <View style={styles.creditsBadge}>
                        <Text style={styles.creditsBadgeText}>{subject.credits} Credits</Text>
                      </View>
                    </View>
                    <Text style={styles.courseName}>{subject.name}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </View>

                {/* Faculty details */}
                {subject.teacher?.name && (
                  <View style={styles.facultyRow}>
                    <User size={14} color={colors.textMuted} />
                    <Text style={styles.facultyName}>{subject.teacher.name}</Text>
                    {subject.teacher.email && (
                      <Text style={styles.facultyEmail}>• {subject.teacher.email}</Text>
                    )}
                  </View>
                )}

                {/* Attendance Metric & Bar */}
                <View style={styles.attSection}>
                  <View style={styles.attHeader}>
                    <Text style={styles.attTitle}>Attendance Turnout</Text>
                    <View style={styles.attCountBox}>
                      <Text style={[styles.attPct, { color: attColor }]}>{pct}%</Text>
                      <Text style={styles.attCounts}>
                        ({att.present}/{att.total} sessions)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(100, pct)}%`, backgroundColor: attColor },
                      ]}
                    />
                  </View>
                </View>

                {/* Weekly Slots */}
                {subject.slots.length > 0 && (
                  <View style={styles.slotsContainer}>
                    <Text style={styles.slotsLabel}>Weekly Schedule:</Text>
                    <View style={styles.slotsList}>
                      {subject.slots.slice(0, 3).map((slot, idx) => (
                        <View key={idx} style={styles.slotChip}>
                          <Clock size={11} color={colors.student} />
                          <Text style={styles.slotChipText}>
                            {slot.day.slice(0, 3)} {slot.time.split('-')[0].trim()}
                            {slot.room ? ` (${slot.room})` : ''}
                          </Text>
                        </View>
                      ))}
                      {subject.slots.length > 3 && (
                        <View style={styles.slotChipMore}>
                          <Text style={styles.slotChipMoreText}>+{subject.slots.length - 3} more</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 4-Tab Interactive Subject Detail Modal */}
      {selectedSubject && (
        <StudentSubjectDetailModal
          visible={detailModalVisible}
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          onClose={() => setDetailModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statVal: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    marginTop: 4,
  },
  statLbl: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.sm,
    color: colors.textPrimary,
  },
  courseCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.student + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleArea: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  codeBadge: {
    backgroundColor: colors.student + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  codeBadgeText: {
    fontSize: 10,
    color: colors.student,
    fontWeight: '700',
  },
  creditsBadge: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  creditsBadgeText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  courseName: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  facultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  facultyName: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  facultyEmail: {
    ...typography.xs,
    color: colors.textMuted,
  },
  attSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border + '55',
  },
  attHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  attTitle: {
    ...typography.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  attCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attPct: {
    ...typography.xs,
    ...typography.bold,
  },
  attCounts: {
    fontSize: 10,
    color: colors.textMuted,
  },
  progressBg: {
    height: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  slotsContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  slotsLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  slotsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotChipText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  slotChipMore: {
    backgroundColor: colors.student + '15',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  slotChipMoreText: {
    fontSize: 10,
    color: colors.student,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    ...typography.xs,
    color: colors.textMuted,
  },
});

export default StudentSubjectsScreen;

