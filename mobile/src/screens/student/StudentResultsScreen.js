import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  TrendingUp,
  Calendar,
  Clock,
  MapPin,
  Printer,
  ChevronRight,
  Download,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText, generateReportCardText } from '../../utils/fileExporter';

/* ── Helpers ── */
const gradeColor = (g = '') => {
  const upper = (g || '').toUpperCase();
  if (['A+', 'A'].includes(upper)) return { bg: 'rgba(16,185,129,0.15)', fg: '#10b981' };
  if (['B+', 'B'].includes(upper)) return { bg: 'rgba(59,130,246,0.15)', fg: '#3b82f6' };
  if (['C+', 'C'].includes(upper)) return { bg: 'rgba(245,158,11,0.15)', fg: '#f59e0b' };
  return { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444' };
};

const pct = (obtained, max) =>
  max > 0 ? Math.round((obtained / max) * 100) : 0;

const termLabel = (r) =>
  r.term && r.term.trim() ? r.term.trim() : r.exam_name || 'Other';

const isExpired = (dateStr, timeSlot) => {
  if (!dateStr) return false;
  const examDay = new Date(dateStr);
  examDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (examDay < today) return true;
  if (examDay.getTime() === today.getTime() && timeSlot) {
    const parts = timeSlot.split('-');
    if (parts.length > 1) {
      const m = parts[1].trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (m) {
        let h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        if (m[3].toUpperCase() === 'PM' && h < 12) h += 12;
        if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
        return new Date() > new Date(new Date().setHours(h, min, 0));
      }
    }
  }
  return false;
};

const StudentResultsScreen = () => {
  const [academicData, setAcademicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab] = useState('results'); // 'results' | 'schedules'
  const [activeTab, setActiveTab] = useState(null); // Active term for results
  const [scheduleTab, setScheduleTab] = useState('upcoming'); // Active tab for schedules

  const fetchResults = async () => {
    try {
      const { data } = await api.get('/student/results');
      setAcademicData(data || {});
    } catch (err) {
      console.error('Results fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResults();
  }, []);

  // Group published results by term
  const { grouped, allTerms } = useMemo(() => {
    const results = academicData?.results || [];
    const map = {};
    results.forEach((r) => {
      const key = termLabel(r);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    const order = [
      'CIA-1',
      'CIA 1',
      'CIA1',
      'CIA-2',
      'CIA 2',
      'CIA2',
      'Mid-Term',
      'Midterm',
      'Mid Term',
      'End-Term',
      'Final',
      'Semester',
    ];
    const keys = Object.keys(map).sort((a, b) => {
      const ai = order.findIndex((o) => a.toLowerCase().includes(o.toLowerCase()));
      const bi = order.findIndex((o) => b.toLowerCase().includes(o.toLowerCase()));
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    });
    return { grouped: map, allTerms: keys };
  }, [academicData]);

  // Group schedules by term & extract upcoming
  const { scheduleGrouped, scheduleTerms, upcoming } = useMemo(() => {
    const schedules = academicData?.schedules || [];
    const active = schedules.filter((s) => !isExpired(s.exam_date, s.time_slot));
    const map = {};
    schedules.forEach((s) => {
      const key = termLabel(s);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return {
      scheduleGrouped: map,
      scheduleTerms: Object.keys(map),
      upcoming: active,
    };
  }, [academicData]);

  // Set default active term when data loads
  useEffect(() => {
    if (allTerms.length > 0 && !activeTab) {
      setActiveTab(allTerms[0]);
    }
  }, [allTerms, activeTab]);

  const results = academicData?.results || [];
  const schedules = academicData?.schedules || [];
  const student = academicData?.student;

  const activeResults = grouped[activeTab] || [];
  const termAvg = activeResults.length
    ? Math.round(
        activeResults.reduce(
          (s, r) => s + pct(r.marks_obtained, r.max_marks || 100),
          0
        ) / activeResults.length
      )
    : 0;

  const overallAvg = results.length
    ? Math.round(
        results.reduce(
          (s, r) => s + pct(r.marks_obtained, r.max_marks || 100),
          0
        ) / results.length
      )
    : 0;

  const handleDownloadReportCard = async () => {
    if (results.length === 0) {
      Alert.alert('No Results', 'No academic results available to download.');
      return;
    }

    const transcriptText = generateReportCardText({
      studentName: student?.name,
      className: student?.class_name,
      rollNumber: student?.roll_number,
      results: results,
      averageGpa: `${overallAvg}%`,
    });

    const success = await exportText(
      `ReportCard_${student?.roll_number || 'Student'}.txt`,
      transcriptText,
      'text/plain'
    );
    if (success) {
      Alert.alert('✅ Downloaded', 'Academic report card generated and ready to share!');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Exam Results"
        subtitle="Academic Performance & Schedules"
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
        <View style={styles.pageHeaderRow}>
          <View style={styles.pageTitleWrapper}>
            <View style={styles.titleWithIcon}>
              <Award size={24} color="#6366f1" />
              <Text style={styles.pageTitle}>Exam Results & Performance</Text>
            </View>
            <Text style={styles.pageSubtitle}>
              CIA-wise & term-wise breakdown of your academic performance.
            </Text>
          </View>

          {/* Download Report Card Button */}
          <TouchableOpacity
            style={styles.downloadReportBtnTouchable}
            onPress={handleDownloadReportCard}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.downloadReportBtnGradient}
            >
              <Printer size={15} color="#ffffff" />
              <Text style={styles.downloadReportBtnText}>Download Report Card</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── 4 Overview Metric Summary Cards ── */}
        <View style={styles.metricsGrid}>
          {[
            {
              label: 'OVERALL AVERAGE',
              value: `${overallAvg}%`,
              color: '#818cf8',
            },
            {
              label: 'EXAMS TAKEN',
              value: results.length,
              color: '#10b981',
            },
            {
              label: 'TERMS COVERED',
              value: allTerms.length,
              color: '#f59e0b',
            },
            {
              label: 'STATUS',
              value: overallAvg >= 75 ? 'PASS' : 'REVIEW',
              color: overallAvg >= 75 ? '#10b981' : '#ef4444',
            },
          ].map((item) => (
            <View key={item.label} style={[styles.metricCard, shadows.sm]}>
              <Text style={[styles.metricValue, { color: item.color }]}>
                {item.value}
              </Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Results vs. Schedule Segmented Toggle ── */}
        <View style={styles.mainToggleContainer}>
          <View style={styles.mainToggleTrack}>
            <TouchableOpacity
              style={styles.toggleBtnTouchable}
              onPress={() => setMainTab('results')}
              activeOpacity={0.85}
            >
              {mainTab === 'results' ? (
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.toggleBtnActiveGradient}
                >
                  <Award size={14} color="#ffffff" />
                  <Text style={styles.toggleTextActive} numberOfLines={1} ellipsizeMode="tail">
                    Results
                  </Text>
                  <View style={styles.countBadgeActive}>
                    <Text style={styles.countTextActive}>{results.length}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.toggleBtnInactive}>
                  <Award size={14} color={colors.textSecondary} />
                  <Text style={styles.toggleTextInactive} numberOfLines={1} ellipsizeMode="tail">
                    Results
                  </Text>
                  <View style={styles.countBadgeInactive}>
                    <Text style={styles.countTextInactive}>{results.length}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleBtnTouchable}
              onPress={() => setMainTab('schedules')}
              activeOpacity={0.85}
            >
              {mainTab === 'schedules' ? (
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.toggleBtnActiveGradient}
                >
                  <Calendar size={14} color="#ffffff" />
                  <Text style={styles.toggleTextActive} numberOfLines={1} ellipsizeMode="tail">
                    Schedule
                  </Text>
                  <View style={styles.countBadgeActive}>
                    <Text style={styles.countTextActive}>{schedules.length}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.toggleBtnInactive}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.toggleTextInactive} numberOfLines={1} ellipsizeMode="tail">
                    Schedule
                  </Text>
                  <View style={styles.countBadgeInactive}>
                    <Text style={styles.countTextInactive}>{schedules.length}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Content Area ── */}
        {loading ? (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <CardSkeleton style={{ height: 180 }} />
            <CardSkeleton style={{ height: 180 }} />
          </View>
        ) : mainTab === 'results' ? (
          /* ─────────────────────────────────────────────────────────────
             PUBLISHED EXAM RESULTS SECTION
          ───────────────────────────────────────────────────────────── */
          <View style={[styles.sectionCard, shadows.md]}>
            <Text style={styles.sectionHeading}>📊 Published Exam Results</Text>

            {results.length === 0 ? (
              <View style={styles.emptyState}>
                <Award size={44} color={colors.textMuted} style={{ opacity: 0.3 }} />
                <Text style={styles.emptyTitle}>No Published Results</Text>
                <Text style={styles.emptySub}>
                  No published examination results yet.
                </Text>
              </View>
            ) : (
              <>
                {/* Term Selector Pills */}
                <View style={styles.termsScrollWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.termsScrollContent}
                  >
                    {allTerms.map((term) => {
                      const isActive = term === activeTab;
                      const count = (grouped[term] || []).length;
                      return (
                        <TouchableOpacity
                          key={term}
                          activeOpacity={0.8}
                          onPress={() => setActiveTab(term)}
                          style={styles.termPillTouchable}
                        >
                          {isActive ? (
                            <LinearGradient
                              colors={['#6366f1', '#8b5cf6']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.termPillActiveGradient}
                            >
                              <Text style={styles.termPillTextActive}>{term}</Text>
                              <View style={styles.termCountActive}>
                                <Text style={styles.termCountTextActive}>{count}</Text>
                              </View>
                            </LinearGradient>
                          ) : (
                            <View style={styles.termPillInactive}>
                              <Text style={styles.termPillTextInactive}>{term}</Text>
                              <View style={styles.termCountInactive}>
                                <Text style={styles.termCountTextInactive}>{count}</Text>
                              </View>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Term Average Row */}
                <View style={styles.termAvgRow}>
                  <TrendingUp size={15} color="#6366f1" />
                  <Text style={styles.termAvgLabel}>Term Average:</Text>
                  <Text
                    style={[
                      styles.termAvgValue,
                      { color: termAvg >= 75 ? '#10b981' : '#f59e0b' },
                    ]}
                  >
                    {termAvg}%
                  </Text>
                  <Text style={styles.termAvgSub}>
                    across {activeResults.length} subject
                    {activeResults.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Exam Result Items */}
                <View style={styles.resultsList}>
                  {activeResults.map((item, idx) => {
                    const p = pct(item.marks_obtained, item.max_marks || 100);
                    const gc = gradeColor(item.grade);
                    return (
                      <View key={item.id || idx} style={styles.resultItemCard}>
                        {/* Top: Subject Name, Code & Grade */}
                        <View style={styles.resultItemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resultSubjectName} numberOfLines={1}>
                              {item.subject_name || 'General Subject'}
                            </Text>
                            {item.subject_code ? (
                              <Text style={styles.resultSubjectCode}>
                                {item.subject_code}
                              </Text>
                            ) : null}
                          </View>
                          <View
                            style={[
                              styles.gradeBadgePill,
                              { backgroundColor: gc.bg },
                            ]}
                          >
                            <Text style={[styles.gradeBadgeText, { color: gc.fg }]}>
                              {item.grade || '—'}
                            </Text>
                          </View>
                        </View>

                        {/* Middle: Marks & Progress Bar */}
                        <View style={styles.marksRow}>
                          <Text style={styles.marksLabel}>
                            Marks:{' '}
                            <Text style={styles.marksBold}>
                              {Number(item.marks_obtained).toFixed(2)}
                            </Text>{' '}
                            / {item.max_marks || 100}
                          </Text>
                          <Text style={[styles.pctText, { color: gc.fg }]}>{p}%</Text>
                        </View>

                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${p}%`, backgroundColor: gc.fg },
                            ]}
                          />
                        </View>

                        {/* Bottom: Date & Remarks */}
                        <View style={styles.metaBottomRow}>
                          <Text style={styles.examDateText}>
                            {item.exam_date
                              ? new Date(item.exam_date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </Text>
                          {item.remarks ? (
                            <Text style={styles.remarksText} numberOfLines={1}>
                              "{item.remarks}"
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Term Average Summary Strip */}
                <View style={styles.termFooterStrip}>
                  <Text style={styles.termFooterLabel}>Term Average</Text>
                  <Text
                    style={[
                      styles.termFooterValue,
                      { color: termAvg >= 75 ? '#10b981' : '#f59e0b' },
                    ]}
                  >
                    {termAvg}%
                  </Text>
                </View>
              </>
            )}
          </View>
        ) : (
          /* ─────────────────────────────────────────────────────────────
             EXAMINATION SCHEDULE SECTION
          ───────────────────────────────────────────────────────────── */
          <View style={[styles.sectionCard, shadows.md]}>
            <Text style={styles.sectionHeading}>📅 Examination Schedule</Text>

            {/* Schedule Term Filter Tabs */}
            <View style={styles.termsScrollWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.termsScrollContent}
              >
                {/* Upcoming Tab */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setScheduleTab('upcoming')}
                  style={styles.termPillTouchable}
                >
                  {scheduleTab === 'upcoming' ? (
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.termPillActiveGradient}
                    >
                      <Text style={styles.termPillTextActive}>Upcoming</Text>
                      <View style={styles.termCountActive}>
                        <Text style={styles.termCountTextActive}>{upcoming.length}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.termPillInactive}>
                      <Text style={styles.termPillTextInactive}>Upcoming</Text>
                      <View style={styles.termCountInactive}>
                        <Text style={styles.termCountTextInactive}>{upcoming.length}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Specific Terms */}
                {scheduleTerms.map((term) => {
                  const isActive = scheduleTab === term;
                  return (
                    <TouchableOpacity
                      key={term}
                      activeOpacity={0.8}
                      onPress={() => setScheduleTab(term)}
                      style={styles.termPillTouchable}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={['#6366f1', '#8b5cf6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.termPillActiveGradient}
                        >
                          <Text style={styles.termPillTextActive}>{term}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.termPillInactive}>
                          <Text style={styles.termPillTextInactive}>{term}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Schedule Cards */}
            {(() => {
              const list =
                scheduleTab === 'upcoming'
                  ? upcoming
                  : scheduleGrouped[scheduleTab] || [];

              if (list.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <Calendar size={44} color={colors.textMuted} style={{ opacity: 0.3 }} />
                    <Text style={styles.emptyTitle}>No Exam Schedule</Text>
                    <Text style={styles.emptySub}>
                      No scheduled exams found for this selection.
                    </Text>
                  </View>
                );
              }

              return (
                <View style={styles.schedulesList}>
                  {list.map((sc, idx) => {
                    const expired = isExpired(sc.exam_date, sc.time_slot);
                    const examDate = new Date(sc.exam_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil(
                      (examDate - today) / (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = !expired && diffDays <= 3;
                    const borderLeftColor = isUrgent
                      ? '#f59e0b'
                      : expired
                      ? '#94a3b8'
                      : '#6366f1';

                    return (
                      <View
                        key={sc.id || idx}
                        style={[
                          styles.scheduleItemCard,
                          {
                            borderLeftColor,
                            opacity: expired ? 0.7 : 1,
                          },
                        ]}
                      >
                        {/* Top: Exam Name & Status Badge */}
                        <View style={styles.scheduleItemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.scheduleExamTitle}>
                              {sc.exam_name} — {sc.subject_name}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.scheduleStatusBadge,
                              {
                                backgroundColor: isUrgent
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : expired
                                  ? 'rgba(148, 163, 184, 0.12)'
                                  : 'rgba(99, 102, 241, 0.12)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.scheduleStatusText,
                                {
                                  color: isUrgent
                                    ? '#f59e0b'
                                    : expired
                                    ? '#94a3b8'
                                    : '#818cf8',
                                },
                              ]}
                            >
                              {expired
                                ? 'Completed'
                                : diffDays === 0
                                ? 'Today'
                                : diffDays === 1
                                ? 'Tomorrow'
                                : `${diffDays} days left`}
                            </Text>
                          </View>
                        </View>

                        {/* Meta Row */}
                        <View style={styles.scheduleMetaRow}>
                          <View style={styles.scheduleMetaItem}>
                            <Calendar size={12} color={colors.textMuted} />
                            <Text style={styles.scheduleMetaText}>
                              {examDate.toLocaleDateString('en-IN', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                          {sc.time_slot ? (
                            <View style={styles.scheduleMetaItem}>
                              <Clock size={12} color={colors.textMuted} />
                              <Text style={styles.scheduleMetaText}>
                                {sc.time_slot}
                              </Text>
                            </View>
                          ) : null}
                          {sc.room_number ? (
                            <View style={styles.scheduleMetaItem}>
                              <MapPin size={12} color={colors.textMuted} />
                              <Text style={styles.scheduleMetaText}>
                                Room {sc.room_number}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Max marks */}
                        <View style={styles.maxMarksRow}>
                          <Text style={styles.maxMarksText}>
                            Max: {sc.max_marks || 100} marks
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ── Styles ── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.md },

  /* Header Section */
  pageHeaderRow: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  pageTitleWrapper: {},
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  downloadReportBtnTouchable: {
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  downloadReportBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  downloadReportBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  /* 4 Overview Metrics */
  metricsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  /* Main Results vs. Schedules Toggle */
  mainToggleContainer: {
    marginBottom: spacing.md,
  },
  mainToggleTrack: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    height: 46,
    alignItems: 'center',
    gap: 4,
  },
  toggleBtnTouchable: {
    flex: 1,
    height: 38,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  toggleBtnActiveGradient: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  toggleTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    flexShrink: 1,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radius.full,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countTextActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  toggleBtnInactive: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  toggleTextInactive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  countBadgeInactive: {
    backgroundColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radius.full,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countTextInactive: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },

  /* Section Container */
  sectionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  /* Term Selector Tabs */
  termsScrollWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  termsScrollContent: {
    gap: spacing.xs,
  },
  termPillTouchable: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  termPillActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  termPillTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  termCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  termCountTextActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  termPillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  termPillTextInactive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  termCountInactive: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  termCountTextInactive: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },

  /* Term Average Header */
  termAvgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  termAvgLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  termAvgValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  termAvgSub: {
    fontSize: 11,
    color: colors.textMuted,
  },

  /* Results List */
  resultsList: {
    gap: spacing.sm,
  },
  resultItemCard: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  resultItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  resultSubjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultSubjectCode: {
    fontSize: 11,
    color: '#818cf8',
    fontWeight: '700',
    marginTop: 2,
  },
  gradeBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gradeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  marksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marksLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  marksBold: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pctText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 4,
  },
  metaBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  examDateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  remarksText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
  },

  /* Term Footer Strip */
  termFooterStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  termFooterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  termFooterValue: {
    fontSize: 16,
    fontWeight: '800',
  },

  /* Schedules List */
  schedulesList: {
    gap: spacing.sm,
  },
  scheduleItemCard: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: 6,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  scheduleExamTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scheduleStatusBadge: {
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
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  scheduleMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleMetaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  maxMarksRow: {
    marginTop: 2,
  },
  maxMarksText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default StudentResultsScreen;
