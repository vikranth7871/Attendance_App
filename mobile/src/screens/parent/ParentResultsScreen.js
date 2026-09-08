import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Award, Calendar, Clock, MapPin, TrendingUp, Download,
  CheckCircle, AlertCircle, FileText, ChevronRight
} from 'lucide-react-native';
import Header from '../../components/Header';
import ChildSwitcher from '../../components/ChildSwitcher';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText } from '../../utils/fileExporter';

const pct = (obtained, max) => (max > 0 ? Math.round((obtained / max) * 100) : 0);
const termLabel = (r) => (r.term && r.term.trim()) ? r.term.trim() : (r.exam_name || 'General Term');

const gradeColor = (g = '') => {
  if (['A+', 'A'].includes(g)) return { bg: 'rgba(16,185,129,0.15)', fg: colors.success };
  if (['B+', 'B'].includes(g)) return { bg: 'rgba(59,130,246,0.15)', fg: colors.primaryLight };
  if (['C+', 'C'].includes(g)) return { bg: 'rgba(245,158,11,0.15)', fg: colors.warning };
  return { bg: 'rgba(239,68,68,0.15)', fg: colors.danger };
};

const isExpired = (dateStr) => {
  if (!dateStr) return false;
  const examDay = new Date(dateStr);
  examDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return examDay < today;
};

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
};

const ParentResultsScreen = ({ route, navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(route?.params?.studentId || null);
  const [academicData, setAcademicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeSegment, setActiveSegment] = useState('results'); // 'results' | 'schedule'
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('upcoming'); // 'all' | 'upcoming'
  const [downloading, setDownloading] = useState(false);

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      const kids = Array.isArray(data) ? data : [];
      setChildren(kids);
      if (!selectedChildId && kids.length > 0) {
        setSelectedChildId(String(route?.params?.studentId || kids[0].id || kids[0].studentId));
      }
    } catch (err) {
      console.error('Fetch children error in results:', err);
    }
  };

  const fetchResults = async (childId = selectedChildId) => {
    setLoading(true);
    try {
      const url = childId
        ? `/parent/student-results?studentId=${childId}`
        : '/parent/student-results';
      const { data } = await api.get(url);

      if (data.examResults !== undefined) {
        setAcademicData({
          results: data.examResults || [],
          schedules: data.upcomingExams || [],
          student: data.student || {},
        });
      } else {
        setAcademicData(data);
      }
    } catch (err) {
      console.error('Failed to fetch student results:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchResults(selectedChildId);
    } else {
      fetchResults();
    }
  }, [selectedChildId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
    fetchResults(selectedChildId);
  }, [selectedChildId]);

  const results = academicData?.results || [];
  const schedules = academicData?.schedules || [];
  const student = academicData?.student || {};

  // Grouping results by term
  const { grouped, allTerms } = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      const t = termLabel(r);
      if (!map[t]) map[t] = [];
      map[t].push(r);
    });
    return { grouped: map, allTerms: Object.keys(map) };
  }, [results]);

  // Overall calculations
  const overallAvg = useMemo(() => {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + pct(r.marks_obtained, r.max_marks || 100), 0);
    return Math.round(sum / results.length);
  }, [results]);

  const isPassed = overallAvg >= 75;

  // Filtered published results
  const displayedTerms = selectedTerm === 'all' ? allTerms : [selectedTerm];

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    if (scheduleFilter === 'upcoming') {
      return schedules.filter((s) => !isExpired(s.exam_date));
    }
    return schedules;
  }, [schedules, scheduleFilter]);

  const handleDownloadReportCard = async () => {
    if (results.length === 0) {
      Alert.alert('No Data', 'No examination results available to generate report card.');
      return;
    }

    setDownloading(true);
    try {
      let doc = `=================================================\n`;
      doc += `       OFFICIAL ACADEMIC REPORT CARD\n`;
      doc += `   iAttend Smart Academic Management System\n`;
      doc += `=================================================\n\n`;
      doc += `Student Name : ${student.name || 'Student'}\n`;
      doc += `Class        : ${student.class_name || student.classInfo?.className || '—'}\n`;
      doc += `Roll Number  : ${student.roll_number || '—'}\n`;
      doc += `Overall Avg  : ${overallAvg}%\n`;
      doc += `Status       : ${isPassed ? 'PASS / PROMOTED' : 'NEEDS IMPROVEMENT'}\n\n`;

      allTerms.forEach((term) => {
        doc += `-------------------------------------------------\n`;
        doc += ` TERM: ${term.toUpperCase()}\n`;
        doc += `-------------------------------------------------\n`;
        const items = grouped[term] || [];
        items.forEach((r) => {
          const p = pct(r.marks_obtained, r.max_marks || 100);
          doc += ` • ${r.subject_name.padEnd(20)} | Marks: ${r.marks_obtained}/${r.max_marks || 100} (${p}%) | Grade: ${r.grade || '—'}\n`;
          if (r.remarks) doc += `   Remarks: ${r.remarks}\n`;
        });
        const termAvg = items.length
          ? Math.round(items.reduce((s, r) => s + pct(r.marks_obtained, r.max_marks || 100), 0) / items.length)
          : 0;
        doc += ` Term Average: ${termAvg}%\n\n`;
      });

      doc += `=================================================\n`;
      doc += ` Generated on: ${new Date().toLocaleDateString()}\n`;
      doc += `=================================================\n`;

      const fileName = `Report_Card_${student.name?.replace(/\s+/g, '_') || 'Student'}.txt`;
      const success = await exportText(fileName, doc, 'text/plain');
      if (success) {
        Alert.alert('✅ Downloaded', 'Official report card text document exported successfully.');
      }
    } catch (err) {
      console.error('Failed to export report card:', err);
      Alert.alert('Error', 'Failed to generate report card document.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !refreshing) return <FullPageLoader message="Loading official academic results..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Exam Results & Performance"
        subtitle={student.name ? `Performance breakdown for ${student.name}` : 'Official exam results'}
        navigation={navigation}
        rightAction={
          <TouchableOpacity
            style={[styles.exportBtn, downloading && { opacity: 0.6 }]}
            onPress={handleDownloadReportCard}
            disabled={downloading}
            activeOpacity={0.8}
          >
            <Download size={15} color={colors.primaryLight} />
            <Text style={styles.exportBtnText}>{downloading ? 'Exporting...' : 'Report Card'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
      >
        {/* Child Switcher Component */}
        {children.length > 0 && (
          <ChildSwitcher
            childrenList={children}
            selectedChildId={selectedChildId}
            onSelectChild={(id) => setSelectedChildId(id)}
          />
        )}

        {/* 4 Summary Metric Cards matching Web */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Overall Average */}
          <View style={[styles.metricCard, shadows.sm, { borderColor: 'rgba(99,102,241,0.3)' }]}>
            <Text style={styles.metricLabel}>OVERALL AVERAGE</Text>
            <Text style={[styles.metricValue, { color: colors.primaryLight }]}>
              {results.length > 0 ? `${overallAvg}%` : '—'}
            </Text>
            <Text style={styles.metricSub}>Academic Year</Text>
          </View>

          {/* Card 2: Exams Taken */}
          <View style={[styles.metricCard, shadows.sm, { borderColor: 'rgba(16,185,129,0.3)' }]}>
            <Text style={styles.metricLabel}>EXAMS TAKEN</Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {results.length}
            </Text>
            <Text style={styles.metricSub}>Completed Tests</Text>
          </View>

          {/* Card 3: Terms Covered */}
          <View style={[styles.metricCard, shadows.sm, { borderColor: 'rgba(245,158,11,0.3)' }]}>
            <Text style={styles.metricLabel}>TERMS COVERED</Text>
            <Text style={[styles.metricValue, { color: colors.warning }]}>
              {allTerms.length}
            </Text>
            <Text style={styles.metricSub}>Semesters / CIAs</Text>
          </View>

          {/* Card 4: Status */}
          <View style={[styles.metricCard, shadows.sm, { borderColor: isPassed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }]}>
            <Text style={styles.metricLabel}>STATUS</Text>
            <Text style={[styles.metricValue, { color: isPassed ? colors.success : colors.danger }]}>
              {results.length > 0 ? (isPassed ? 'PASS' : 'REVIEW') : '—'}
            </Text>
            <Text style={styles.metricSub}>Min 75% Benchmark</Text>
          </View>
        </View>

        {/* Segmented Toggle: Published Results vs Schedule */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'results' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('results')}
            activeOpacity={0.8}
          >
            <Award size={15} color={activeSegment === 'results' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.segmentBtnText, activeSegment === 'results' && styles.segmentBtnTextActive]}>
              Published Results ({results.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'schedule' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('schedule')}
            activeOpacity={0.8}
          >
            <Calendar size={15} color={activeSegment === 'schedule' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.segmentBtnText, activeSegment === 'schedule' && styles.segmentBtnTextActive]}>
              Exam Schedule ({schedules.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* View 1: Published Results */}
        {activeSegment === 'results' && (
          <View>
            {/* Term Filter Pills */}
            {allTerms.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.termScroll}>
                <TouchableOpacity
                  style={[styles.termChip, selectedTerm === 'all' && styles.termChipActive]}
                  onPress={() => setSelectedTerm('all')}
                >
                  <Text style={[styles.termChipText, selectedTerm === 'all' && styles.termChipTextActive]}>
                    All Terms ({results.length})
                  </Text>
                </TouchableOpacity>

                {allTerms.map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={[styles.termChip, selectedTerm === term && styles.termChipActive]}
                    onPress={() => setSelectedTerm(term)}
                  >
                    <Text style={[styles.termChipText, selectedTerm === term && styles.termChipTextActive]}>
                      {term} ({(grouped[term] || []).length})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {results.length === 0 ? (
              <View style={[styles.emptyCard, shadows.sm]}>
                <Award size={44} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Results Published Yet</Text>
                <Text style={styles.emptySub}>
                  Official grades and marks for {student.name || 'this student'} will appear here once published.
                </Text>
              </View>
            ) : (
              displayedTerms.map((term) => {
                const termItems = grouped[term] || [];
                const termAvg = termItems.length
                  ? Math.round(termItems.reduce((s, r) => s + pct(r.marks_obtained, r.max_marks || 100), 0) / termItems.length)
                  : 0;

                return (
                  <View key={term} style={styles.termSection}>
                    {/* Term Header Strip */}
                    <View style={styles.termHeaderBox}>
                      <Text style={styles.termHeaderTitle}>{term}</Text>
                      <View style={styles.termAveragePill}>
                        <TrendingUp size={13} color={colors.primaryLight} />
                        <Text style={styles.termAverageText}>Term Avg: {termAvg}%</Text>
                      </View>
                    </View>

                    {/* Subject Result Cards */}
                    {termItems.map((r, idx) => {
                      const scorePct = pct(r.marks_obtained, r.max_marks || 100);
                      const gc = gradeColor(r.grade);

                      return (
                        <View key={r.id || idx} style={[styles.subjectResultCard, shadows.sm]}>
                          <View style={styles.subjectTopRow}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.subjectName}>{r.subject_name}</Text>
                              <Text style={styles.subjectCode}>
                                {r.subject_code ? `Code: ${r.subject_code}` : 'Core Subject'}
                              </Text>
                            </View>

                            <View style={[styles.gradePill, { backgroundColor: gc.bg }]}>
                              <Text style={[styles.gradePillText, { color: gc.fg }]}>
                                {r.grade || '—'}
                              </Text>
                            </View>
                          </View>

                          {/* Marks and Progress Bar */}
                          <View style={styles.scoreRow}>
                            <Text style={styles.marksLabel}>
                              Marks: <Text style={styles.marksVal}>{r.marks_obtained ?? '—'}</Text> / {r.max_marks || 100}
                            </Text>
                            <Text style={[styles.scorePercentage, { color: scorePct >= 75 ? colors.success : colors.danger }]}>
                              {scorePct}%
                            </Text>
                          </View>

                          <View style={styles.progressBarTrack}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${Math.min(scorePct, 100)}%`,
                                  backgroundColor: scorePct >= 75 ? colors.success : colors.danger,
                                }
                              ]}
                            />
                          </View>

                          {/* Remarks */}
                          {r.remarks ? (
                            <Text style={styles.remarksText}>"{r.remarks}"</Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* View 2: Examination Schedule */}
        {activeSegment === 'schedule' && (
          <View>
            {/* Filter pills */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, scheduleFilter === 'upcoming' && styles.filterChipActive]}
                onPress={() => setScheduleFilter('upcoming')}
              >
                <Text style={[styles.filterChipText, scheduleFilter === 'upcoming' && styles.filterChipTextActive]}>
                  Upcoming Exams
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, scheduleFilter === 'all' && styles.filterChipActive]}
                onPress={() => setScheduleFilter('all')}
              >
                <Text style={[styles.filterChipText, scheduleFilter === 'all' && styles.filterChipTextActive]}>
                  All Schedules ({schedules.length})
                </Text>
              </TouchableOpacity>
            </View>

            {filteredSchedules.length === 0 ? (
              <View style={[styles.emptyCard, shadows.sm]}>
                <Calendar size={44} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Examination Schedules</Text>
                <Text style={styles.emptySub}>
                  There are no scheduled examinations found matching the selected filter.
                </Text>
              </View>
            ) : (
              filteredSchedules.map((item, idx) => {
                const expired = isExpired(item.exam_date);
                const daysLeft = getDaysUntil(item.exam_date);
                const isUrgent = daysLeft !== null && daysLeft <= 3 && !expired;

                const formattedDate = item.exam_date
                  ? new Date(item.exam_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'TBD';

                return (
                  <View
                    key={item.id || idx}
                    style={[
                      styles.scheduleCard,
                      shadows.sm,
                      {
                        borderLeftColor: expired
                          ? colors.textMuted
                          : isUrgent
                          ? colors.warning
                          : colors.primary,
                      }
                    ]}
                  >
                    <View style={styles.scheduleHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scheduleExamName}>
                          {item.exam_name || 'Terminal Exam'}
                        </Text>
                        <Text style={styles.scheduleSubject}>{item.subject_name}</Text>
                      </View>

                      <View
                        style={[
                          styles.scheduleStatusPill,
                          {
                            backgroundColor: expired
                              ? 'rgba(100, 116, 139, 0.15)'
                              : isUrgent
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(99, 102, 241, 0.15)',
                          }
                        ]}
                      >
                        <Text
                          style={[
                            styles.scheduleStatusText,
                            {
                              color: expired
                                ? colors.textMuted
                                : isUrgent
                                ? colors.warning
                                : colors.primaryLight,
                            }
                          ]}
                        >
                          {expired ? 'Completed' : daysLeft === 0 ? 'Today' : `${daysLeft}d Left`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scheduleMetaRow}>
                      <View style={styles.scheduleMetaItem}>
                        <Calendar size={13} color={colors.textSecondary} />
                        <Text style={styles.scheduleMetaText}>{formattedDate}</Text>
                      </View>

                      <View style={styles.scheduleMetaItem}>
                        <Clock size={13} color={colors.textSecondary} />
                        <Text style={styles.scheduleMetaText}>
                          {item.time_slot || `${item.start_time || '09:00'} - ${item.end_time || '12:00'}`}
                        </Text>
                      </View>

                      <View style={styles.scheduleMetaItem}>
                        <MapPin size={13} color={colors.textSecondary} />
                        <Text style={styles.scheduleMetaText}>Room: {item.room_number || 'Hall A'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing.md,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#ffffff',
  },
  termScroll: {
    gap: 8,
    marginBottom: spacing.md,
  },
  termChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  termChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primary,
  },
  termChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  termChipTextActive: {
    color: colors.primaryLight,
  },
  termSection: {
    marginBottom: spacing.lg,
  },
  termHeaderBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.sm,
  },
  termHeaderTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  termAveragePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  termAverageText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  subjectResultCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  subjectTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  subjectName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  subjectCode: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  gradePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  gradePillText: {
    fontSize: 13,
    fontWeight: '900',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  marksLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  marksVal: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scorePercentage: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  remarksText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textMuted,
    marginTop: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primaryLight,
  },
  scheduleCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  scheduleExamName: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scheduleSubject: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  scheduleStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  scheduleStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scheduleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  scheduleMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    ...typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default ParentResultsScreen;
