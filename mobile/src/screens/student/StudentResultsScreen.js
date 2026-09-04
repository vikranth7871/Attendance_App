import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Award, TrendingUp, Download, Calendar, Clock, MapPin, CheckCircle2, AlertCircle } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText, generateReportCardText } from '../../utils/fileExporter';

const getLetterGrade = (pct) => {
  if (pct >= 90) return { grade: 'A+', color: colors.success };
  if (pct >= 80) return { grade: 'A', color: colors.teacher };
  if (pct >= 70) return { grade: 'B', color: colors.primary };
  if (pct >= 60) return { grade: 'C', color: colors.warning };
  if (pct >= 50) return { grade: 'D', color: '#f97316' };
  return { grade: 'F', color: colors.danger };
};

const termLabel = (r) => (r.term && r.term.trim()) ? r.term.trim() : (r.exam_name || r.exam_title || 'General');

const StudentResultsScreen = () => {
  const [academicData, setAcademicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab] = useState('results'); // 'results' | 'schedules'
  const [activeTerm, setActiveTerm] = useState('All');

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

  const results = academicData?.results || (Array.isArray(academicData) ? academicData : []);
  const schedules = academicData?.schedules || [];
  const student = academicData?.student;

  const termsList = useMemo(() => {
    const set = new Set();
    results.forEach((r) => set.add(termLabel(r)));
    return ['All', ...Array.from(set)];
  }, [results]);

  const filteredResults = useMemo(() => {
    if (activeTerm === 'All') return results;
    return results.filter((r) => termLabel(r) === activeTerm);
  }, [results, activeTerm]);

  const overallAvg = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.percentage || (r.marks_obtained && r.max_marks ? (r.marks_obtained / r.max_marks * 100) : 0)), 0) / results.length)
    : 0;

  const handleDownloadReportCard = async () => {
    if (results.length === 0) {
      Alert.alert('No Data', 'No academic results to export.');
      return;
    }

    const transcriptText = generateReportCardText({
      studentName: student?.name,
      className: student?.class_name,
      rollNumber: student?.roll_number,
      results: results,
      averageGpa: `${overallAvg}% (${getLetterGrade(overallAvg).grade})`,
    });

    const success = await exportText(
      `ReportCard_${student?.roll_number || 'Student'}.txt`,
      transcriptText,
      'text/plain'
    );
    if (success) {
      Alert.alert('✅ Exported', 'Official academic report card generated successfully.');
    }
  };

  if (loading) return <FullPageLoader message="Loading academic results & schedules..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Academic Performance"
        subtitle={`${results.length} results • ${schedules.length} schedules`}
        rightAction={
          <TouchableOpacity style={styles.exportBtn} onPress={handleDownloadReportCard}>
            <Download size={17} color={colors.student} />
          </TouchableOpacity>
        }
      />

      {/* Main Tab Switcher */}
      <View style={styles.mainTabWrapper}>
        <View style={styles.mainTabBar}>
          <TouchableOpacity
            style={[styles.mainTabBtn, mainTab === 'results' && styles.mainTabBtnActive]}
            onPress={() => setMainTab('results')}
          >
            <Award size={14} color={mainTab === 'results' ? '#fff' : colors.textMuted} />
            <Text style={[styles.mainTabText, mainTab === 'results' && styles.mainTabTextActive]}>
              Results ({results.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, mainTab === 'schedules' && styles.mainTabBtnActive]}
            onPress={() => setMainTab('schedules')}
          >
            <Calendar size={14} color={mainTab === 'schedules' ? '#fff' : colors.textMuted} />
            <Text style={[styles.mainTabText, mainTab === 'schedules' && styles.mainTabTextActive]}>
              Schedules ({schedules.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mainTab === 'results' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
        >
          {/* Overall Stats Banner */}
          {results.length > 0 && (
            <View style={[styles.avgCard, shadows.sm]}>
              <View style={styles.avgLeft}>
                <TrendingUp size={22} color={colors.student} />
                <View>
                  <Text style={styles.avgLabel}>Overall Average Score</Text>
                  <Text style={[styles.avgScore, { color: getLetterGrade(overallAvg).color }]}>
                    {overallAvg}%
                  </Text>
                </View>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: getLetterGrade(overallAvg).color + '22' }]}>
                <Text style={[styles.gradeText, { color: getLetterGrade(overallAvg).color }]}>
                  {getLetterGrade(overallAvg).grade}
                </Text>
              </View>
            </View>
          )}

          {/* Term Chips Filter */}
          {termsList.length > 2 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.termScroll}>
              {termsList.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={[styles.termChip, activeTerm === term && styles.termChipActive]}
                  onPress={() => setActiveTerm(term)}
                >
                  <Text style={[styles.termChipText, activeTerm === term && styles.termChipTextActive]}>
                    {term}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Results List */}
          {filteredResults.length === 0 ? (
            <View style={styles.empty}>
              <Award size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No results available for {activeTerm}</Text>
            </View>
          ) : (
            filteredResults.map((item, i) => {
              const pct = item.percentage || (item.marks_obtained && item.max_marks ? Math.round(item.marks_obtained / item.max_marks * 100) : 0);
              const { grade, color } = getLetterGrade(pct);
              const scoreBar = Math.min(pct, 100);

              return (
                <View key={item.id?.toString() || item._id?.toString() || i.toString()} style={[styles.resultCard, shadows.sm]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.examTitle}>{item.exam_title || item.title || item.exam_name || 'Assessment'}</Text>
                      <Text style={styles.subject}>{item.subject_name || item.subject || '—'}</Text>
                      {item.term ? (
                        <View style={styles.termPill}>
                          <Text style={styles.termPillText}>{item.term}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.scoreSection}>
                      <View style={[styles.gradeBadgeLg, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                        <Text style={[styles.gradeLg, { color }]}>{item.grade || grade}</Text>
                      </View>
                      <Text style={[styles.scorePct, { color }]}>{pct}%</Text>
                    </View>
                  </View>

                  <View style={styles.scoreRow}>
                    <Text style={styles.marksText}>
                      Marks: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.marks_obtained ?? '—'}</Text> / {item.max_marks ?? 100}
                    </Text>
                    {item.exam_date ? (
                      <Text style={styles.date}>{new Date(item.exam_date).toLocaleDateString()}</Text>
                    ) : null}
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${scoreBar}%`, backgroundColor: color }]} />
                  </View>

                  {item.remarks ? (
                    <Text style={styles.remarksText}>Teacher remarks: "{item.remarks}"</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* Schedules Tab */
        <FlatList
          data={schedules}
          keyExtractor={(item, i) => item.id?.toString() || item._id?.toString() || i.toString()}
          renderItem={({ item }) => (
            <View style={[styles.scheduleCard, shadows.sm]}>
              <View style={styles.schedHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.schedExamTitle}>{item.exam_name || item.exam_title || 'Examination'}</Text>
                  <Text style={styles.schedSubject}>{item.subject_name || 'Assigned Subject'}</Text>
                </View>
                {item.term ? (
                  <View style={styles.termPill}>
                    <Text style={styles.termPillText}>{item.term}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.schedDetailsGrid}>
                <View style={styles.schedDetailItem}>
                  <Calendar size={14} color={colors.primary} />
                  <Text style={styles.schedDetailText}>
                    {item.exam_date ? new Date(item.exam_date).toLocaleDateString() : 'Date TBA'}
                  </Text>
                </View>
                {item.time_slot ? (
                  <View style={styles.schedDetailItem}>
                    <Clock size={14} color={colors.student} />
                    <Text style={styles.schedDetailText}>{item.time_slot}</Text>
                  </View>
                ) : null}
                {item.room_number ? (
                  <View style={styles.schedDetailItem}>
                    <MapPin size={14} color={colors.warning} />
                    <Text style={styles.schedDetailText}>Room {item.room_number}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Calendar size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No upcoming exam schedules posted</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  exportBtn: {
    padding: spacing.sm, backgroundColor: colors.student + '22',
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.student + '44',
  },
  mainTabWrapper: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  mainTabBar: {
    flexDirection: 'row', backgroundColor: colors.bgCard,
    borderRadius: radius.md, padding: 3, borderWidth: 1, borderColor: colors.border,
  },
  mainTabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: radius.sm,
  },
  mainTabBtnActive: { backgroundColor: colors.student },
  mainTabText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  mainTabTextActive: { color: '#ffffff', fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  list: { padding: spacing.md },
  avgCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  avgLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avgLabel: { ...typography.xs, color: colors.textSecondary },
  avgScore: { ...typography.xxl, ...typography.bold, marginTop: 2 },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
  gradeText: { ...typography.base, ...typography.bold },
  termScroll: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, paddingVertical: 4 },
  termChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.full, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
  },
  termChipActive: { backgroundColor: colors.student + '22', borderColor: colors.student },
  termChipText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  termChipTextActive: { color: colors.student, fontWeight: '700' },
  resultCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: spacing.sm },
  examTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  subject: { ...typography.sm, color: colors.textSecondary, marginTop: 2 },
  termPill: {
    alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: colors.primary + '15', borderRadius: radius.xs, marginTop: 4,
  },
  termPillText: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  scoreSection: { alignItems: 'center', gap: 4 },
  gradeBadgeLg: {
    width: 44, height: 44, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  gradeLg: { ...typography.lg, ...typography.bold },
  scorePct: { ...typography.xs, ...typography.semibold },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  marksText: { ...typography.xs, color: colors.textMuted },
  date: { ...typography.xs, color: colors.textMuted },
  barBg: { height: 5, backgroundColor: colors.bgElevated, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },
  remarksText: { ...typography.xs, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
  scheduleCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  schedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  schedExamTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  schedSubject: { ...typography.sm, color: colors.textSecondary, marginTop: 2 },
  schedDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 4 },
  schedDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  schedDetailText: { ...typography.xs, color: colors.textPrimary, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default StudentResultsScreen;
