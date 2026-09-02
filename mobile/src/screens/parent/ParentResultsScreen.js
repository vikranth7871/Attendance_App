import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Award, CalendarDays, TrendingUp, Clock } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const getLetterGrade = (pct) => {
  if (pct >= 90) return { grade: 'A+', color: colors.success };
  if (pct >= 80) return { grade: 'A', color: colors.teacher };
  if (pct >= 70) return { grade: 'B', color: colors.primary };
  if (pct >= 60) return { grade: 'C', color: colors.warning };
  if (pct >= 50) return { grade: 'D', color: '#f97316' };
  return { grade: 'F', color: colors.danger };
};

const ParentResultsScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('results'); // 'results' | 'upcoming'

  const fetchResults = async () => {
    try {
      const { data: res } = await api.get('/parent/student-results');
      setData(res);
    } catch (err) {
      console.error('Results fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchResults(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchResults(); }, []);

  if (loading) return <FullPageLoader message="Loading exam results..." />;

  const results = data?.examResults || [];
  const upcoming = data?.upcomingExams || [];
  const student = data?.student;

  const avgPct = results.length > 0
    ? Math.round(results.reduce((sum, r) => {
        const pct = r.marks_obtained && r.max_marks ? (r.marks_obtained / r.max_marks) * 100 : 0;
        return sum + pct;
      }, 0) / results.length)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Exam Results" subtitle={student?.name || 'Student'} />

      {/* Average Banner */}
      {results.length > 0 && (() => {
        const { grade, color } = getLetterGrade(avgPct);
        return (
          <View style={[styles.avgBanner, shadows.sm]}>
            <TrendingUp size={20} color={color} />
            <Text style={styles.avgLabel}>Overall Average</Text>
            <Text style={[styles.avgValue, { color }]}>{avgPct}%</Text>
            <View style={[styles.gradePill, { backgroundColor: color + '22' }]}>
              <Text style={[styles.gradeText, { color }]}>{grade}</Text>
            </View>
          </View>
        );
      })()}

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'results' && styles.tabActive]} onPress={() => setTab('results')}>
          <Text style={[styles.tabText, tab === 'results' && styles.tabTextActive]}>Results ({results.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'upcoming' && styles.tabActive]} onPress={() => setTab('upcoming')}>
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Upcoming ({upcoming.length})</Text>
        </TouchableOpacity>
      </View>

      {tab === 'results' ? (
        <FlatList
          data={results}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => {
            const pct = item.marks_obtained && item.max_marks
              ? Math.round((item.marks_obtained / item.max_marks) * 100)
              : 0;
            const { grade, color } = getLetterGrade(pct);
            return (
              <View style={[styles.resultCard, shadows.sm]}>
                <View style={styles.resultTop}>
                  <View style={styles.resultInfo}>
                    <Text style={styles.examName}>{item.exam_name || 'Exam'}</Text>
                    <Text style={styles.subjectName}>{item.subject_name || '—'}</Text>
                    {item.exam_date && (
                      <Text style={styles.examDate}>{new Date(item.exam_date).toLocaleDateString()}</Text>
                    )}
                  </View>
                  <View style={styles.scoreSection}>
                    <View style={[styles.gradeBadge, { backgroundColor: color + '22', borderColor: color + '44', borderWidth: 1 }]}>
                      <Text style={[styles.gradeLetter, { color }]}>{grade}</Text>
                    </View>
                    <Text style={[styles.scorePct, { color }]}>{pct}%</Text>
                  </View>
                </View>
                <Text style={styles.marksText}>{item.marks_obtained ?? '—'} / {item.max_marks ?? '—'} marks</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
                </View>
                {item.remarks && <Text style={styles.remarks}>{item.remarks}</Text>}
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Award size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No results yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={upcoming}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => (
            <View style={[styles.upcomingCard, shadows.sm]}>
              <View style={[styles.upcomingIcon, { backgroundColor: colors.parent + '22' }]}>
                <CalendarDays size={20} color={colors.parent} />
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingName}>{item.exam_name}</Text>
                <Text style={styles.upcomingSubject}>{item.subject_name}</Text>
                <View style={styles.upcomingMeta}>
                  <CalendarDays size={12} color={colors.textMuted} />
                  <Text style={styles.upcomingDate}>
                    {item.exam_date ? new Date(item.exam_date).toLocaleDateString() : '—'}
                  </Text>
                  {item.time_slot && (
                    <>
                      <Clock size={12} color={colors.textMuted} style={{ marginLeft: 8 }} />
                      <Text style={styles.upcomingDate}>{item.time_slot}</Text>
                    </>
                  )}
                </View>
              </View>
              {item.max_marks && (
                <Text style={styles.maxMarks}>{item.max_marks} marks</Text>
              )}
            </View>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CalendarDays size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No upcoming exams</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  avgBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.md, backgroundColor: colors.bgCard,
    borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  avgLabel: { ...typography.sm, color: colors.textSecondary, flex: 1 },
  avgValue: { ...typography.xl, ...typography.bold },
  gradePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  gradeText: { fontSize: 12, fontWeight: '700' },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  tab: { flex: 1, padding: spacing.sm, borderRadius: radius.full, backgroundColor: colors.bgCard, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.parent + '22', borderColor: colors.parent },
  tabText: { ...typography.sm, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.parent },
  list: { padding: spacing.md, paddingTop: 0 },
  resultCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  resultInfo: { flex: 1 },
  examName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  subjectName: { ...typography.sm, color: colors.textSecondary },
  examDate: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  scoreSection: { alignItems: 'center', gap: 4 },
  gradeBadge: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  gradeLetter: { ...typography.lg, ...typography.bold },
  scorePct: { ...typography.sm, ...typography.semibold },
  marksText: { ...typography.sm, color: colors.textMuted, marginBottom: 6 },
  barBg: { height: 5, backgroundColor: colors.bgElevated, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },
  remarks: { ...typography.xs, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  upcomingCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  upcomingIcon: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  upcomingInfo: { flex: 1 },
  upcomingName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  upcomingSubject: { ...typography.sm, color: colors.textSecondary },
  upcomingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  upcomingDate: { ...typography.xs, color: colors.textMuted },
  maxMarks: { ...typography.sm, color: colors.parent, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default ParentResultsScreen;
