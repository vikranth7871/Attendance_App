import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  User,
  Calendar,
  Search,
  ChevronRight,
  X,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import StudentSubjectDetailModal from '../../components/StudentSubjectDetailModal';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const StudentSubjectsScreen = ({ navigation }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Selected subject for detail modal
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/student/subjects');
      setSubjects(Array.isArray(data) ? data : []);
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

  // Group allocations by subjectId and build schedule badge (matching web SubjectsPage.jsx)
  const uniqueSubjectCards = useMemo(() => {
    const map = new Map();
    subjects.forEach((sub) => {
      const subId = sub.subjectId?._id || sub.subjectId?.id || sub.subjectId || sub._id;
      if (!map.has(subId)) {
        map.set(subId, {
          ...sub,
          allSlots: [],
        });
      }
      if (sub.dayOfWeek || sub.timeSlot || sub.startTime) {
        map.get(subId).allSlots.push(sub);
      }
    });

    return Array.from(map.values()).map((item) => {
      let scheduleBadge = 'Individual Assignment';
      if (item.allSlots.length > 0) {
        const days = [
          ...new Set(
            item.allSlots.map((s) => (s.dayOfWeek ? s.dayOfWeek.substring(0, 3) : ''))
          ),
        ]
          .filter(Boolean)
          .join(', ');
        scheduleBadge = `${item.allSlots.length} Weekly Slot${
          item.allSlots.length > 1 ? 's' : ''
        }${days ? ` (${days})` : ''}`;
      }
      return {
        ...item,
        scheduleBadge,
      };
    });
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return uniqueSubjectCards;
    const q = search.toLowerCase();
    return uniqueSubjectCards.filter((s) => {
      const name = (
        s.subjectId?.subjectName ||
        s.subjectId?.name ||
        s.name ||
        ''
      ).toLowerCase();
      const teacher = (s.teacherId?.name || s.teacher?.name || '').toLowerCase();
      return name.includes(q) || teacher.includes(q);
    });
  }, [uniqueSubjectCards, search]);

  const handleCardClick = (subject) => {
    const subjectId =
      subject.subjectId?.id ||
      subject.subjectId?._id ||
      subject.subjectId ||
      subject.id;
    const subjectName =
      subject.subjectId?.subjectName ||
      subject.subjectId?.name ||
      subject.name ||
      'Subject';
    setSelectedSubject({ id: subjectId, name: subjectName });
    setDetailModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="My Subjects"
        subtitle="Curriculum & Attendance"
        showLogout={false}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.student}
          />
        }
      >
        {/* ── Page Section Header (Matches Web Screenshot) ── */}
        <View style={styles.pageHeaderSection}>
          <Text style={styles.pageTitle}>My Subjects</Text>
          <Text style={styles.pageSubtitle}>
            All subjects assigned to your class. Click a subject for detailed info.
          </Text>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} style={{ marginRight: spacing.xs }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects or faculty..."
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

        {/* ── Subject Cards List ── */}
        {loading ? (
          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            <CardSkeleton style={{ height: 220 }} />
            <CardSkeleton style={{ height: 220 }} />
            <CardSkeleton style={{ height: 220 }} />
          </View>
        ) : filteredSubjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpen size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>
              {search ? 'No Matching Subjects' : 'No Subjects Assigned'}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? `No subjects match "${search}". Try a different keyword.`
                : 'No subjects have been assigned to your class yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filteredSubjects.map((subject) => {
              const subjectId =
                subject.subjectId?.id ||
                subject.subjectId?._id ||
                subject.subjectId ||
                subject.id;
              const subjectName =
                subject.subjectId?.subjectName ||
                subject.subjectId?.name ||
                subject.name ||
                'Unknown Subject';
              const isIndividual = subject.isIndividuallyAssigned;
              const teacherName =
                subject.teacherId?.name || subject.teacher?.name || 'Unassigned';
              const att = subject.attendance || {
                total: 0,
                present: 0,
                absent: 0,
                leave: 0,
                percentage: 0,
              };
              const totalSessions = att.total || 0;
              const percentage = att.percentage || 0;
              const isSafeAttendance = percentage >= 75 || totalSessions === 0;
              const attColor = isSafeAttendance ? '#16a34a' : '#ef4444';
              const topBorderColor = isIndividual ? '#10b981' : '#6366f1';

              return (
                <TouchableOpacity
                  key={subjectId}
                  style={[
                    styles.subjectCard,
                    shadows.sm,
                    { borderTopColor: topBorderColor },
                  ]}
                  onPress={() => handleCardClick(subject)}
                  activeOpacity={0.85}
                >
                  {/* Top-Right Badge: Class Subject / Individual */}
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor: isIndividual
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(99, 102, 241, 0.12)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: isIndividual ? '#10b981' : '#818cf8' },
                      ]}
                    >
                      {isIndividual ? 'Individual' : 'Class Subject'}
                    </Text>
                  </View>

                  {/* Top Left: Icon & Subject Title & Schedule */}
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.subjectIconBox,
                        {
                          backgroundColor: isIndividual
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(99, 102, 241, 0.12)',
                        },
                      ]}
                    >
                      <BookOpen
                        size={20}
                        color={isIndividual ? '#10b981' : '#818cf8'}
                      />
                    </View>
                    <View style={styles.cardTitleCol}>
                      <Text style={styles.subjectTitle} numberOfLines={1}>
                        {subjectName}
                      </Text>
                      {subject.scheduleBadge ? (
                        <View style={styles.scheduleRow}>
                          <Calendar size={12} color="#818cf8" style={{ marginRight: 4 }} />
                          <Text style={styles.scheduleText} numberOfLines={1}>
                            {subject.scheduleBadge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Recessed "TAUGHT BY" Box */}
                  <View style={styles.taughtByBox}>
                    <User size={16} color={colors.textSecondary} style={styles.taughtByIcon} />
                    <View style={styles.taughtByCol}>
                      <Text style={styles.taughtByLabel}>TAUGHT BY</Text>
                      <Text style={styles.taughtByName}>{teacherName}</Text>
                    </View>
                  </View>

                  {/* Recessed "SUBJECT ATTENDANCE" Box */}
                  <View style={styles.attendanceBox}>
                    <View style={styles.attendanceHeaderRow}>
                      <Text style={styles.attendanceLabel}>SUBJECT ATTENDANCE</Text>
                      <Text style={[styles.attendancePct, { color: attColor }]}>
                        {totalSessions > 0 ? `${percentage}%` : 'No Classes Yet'}
                      </Text>
                    </View>

                    {/* Horizontal Progress Bar Track */}
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(
                              100,
                              Math.max(0, totalSessions > 0 ? percentage : 0)
                            )}%`,
                            backgroundColor: attColor,
                          },
                        ]}
                      />
                    </View>

                    {/* Stats Counters Row */}
                    <View style={styles.attendanceStatsRow}>
                      <Text style={styles.statText}>
                        Present:{' '}
                        <Text style={styles.boldGreen}>{att.present || 0}</Text>
                      </Text>
                      <Text style={styles.statText}>
                        Absent:{' '}
                        <Text style={styles.boldRed}>{att.absent || 0}</Text>
                      </Text>
                      <Text style={styles.statText}>
                        Total:{' '}
                        <Text style={styles.boldWhite}>{totalSessions}</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Click Hint / Footer */}
                  <View style={styles.cardFooterRow}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <ChevronRight size={13} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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

  /* Page Section Header */
  pageHeaderSection: {
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },

  /* Card List */
  cardList: {
    gap: spacing.md,
  },

  /* Subject Card */
  subjectCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    gap: spacing.sm,
  },

  /* Type Badge (Top Right) */
  typeBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Card Header: Icon & Subject Title */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingRight: 90, // Leave room for top-right type badge
  },
  subjectIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardTitleCol: {
    flex: 1,
  },
  subjectTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scheduleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#818cf8',
    flexShrink: 1,
  },

  /* Recessed Taught By Box */
  taughtByBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  taughtByIcon: {
    opacity: 0.7,
  },
  taughtByCol: {
    flex: 1,
  },
  taughtByLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  taughtByName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },

  /* Recessed Subject Attendance Box */
  attendanceBox: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 8,
  },
  attendanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  attendancePct: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 999,
  },
  attendanceStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  statText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  boldGreen: {
    fontWeight: '800',
    color: '#16a34a',
  },
  boldRed: {
    fontWeight: '800',
    color: '#ef4444',
  },
  boldWhite: {
    fontWeight: '800',
    color: colors.textPrimary,
  },

  /* Card Footer (Click Hint) */
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 2,
    opacity: 0.7,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default StudentSubjectsScreen;
