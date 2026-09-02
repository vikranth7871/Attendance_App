import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Award, TrendingUp } from 'lucide-react-native';
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

const StudentResultsScreen = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResults = async () => {
    try {
      const { data } = await api.get('/student/results');
      setResults(data || []);
    } catch (err) { console.error('Results fetch error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchResults(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchResults(); }, []);

  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.percentage || (r.marks_obtained / r.max_marks * 100) || 0), 0) / results.length)
    : 0;

  if (loading) return <FullPageLoader message="Loading results..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Exam Results" subtitle={`${results.length} results`} />

      {results.length > 0 && (
        <View style={styles.avgCard}>
          <TrendingUp size={20} color={colors.teacher} />
          <Text style={styles.avgLabel}>Overall Average</Text>
          <Text style={[styles.avgScore, { color: getLetterGrade(avgScore).color }]}>{avgScore}%</Text>
          <View style={[styles.gradeBadge, { backgroundColor: getLetterGrade(avgScore).color + '22' }]}>
            <Text style={[styles.gradeText, { color: getLetterGrade(avgScore).color }]}>{getLetterGrade(avgScore).grade}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item, i) => item.id?.toString() || i.toString()}
        renderItem={({ item }) => {
          const pct = item.percentage || (item.marks_obtained && item.max_marks ? Math.round(item.marks_obtained / item.max_marks * 100) : 0);
          const { grade, color } = getLetterGrade(pct);
          const scoreBar = Math.min(pct, 100);

          return (
            <View style={[styles.resultCard, shadows.sm]}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.examTitle}>{item.exam_title || item.title}</Text>
                  <Text style={styles.subject}>{item.subject_name || '—'}</Text>
                  {item.exam_date && (
                    <Text style={styles.date}>{new Date(item.exam_date).toLocaleDateString()}</Text>
                  )}
                </View>
                <View style={styles.scoreSection}>
                  <View style={[styles.gradeBadgeLg, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                    <Text style={[styles.gradeLg, { color }]}>{grade}</Text>
                  </View>
                  <Text style={[styles.scorePct, { color }]}>{pct}%</Text>
                </View>
              </View>
              <Text style={styles.marksText}>
                {item.marks_obtained ?? '—'} / {item.max_marks ?? '—'} marks
              </Text>
              {/* Score bar */}
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${scoreBar}%`, backgroundColor: color }]} />
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Award size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No results available yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  avgCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.md, backgroundColor: colors.bgCard,
    borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  avgLabel: { ...typography.sm, color: colors.textSecondary, flex: 1 },
  avgScore: { ...typography.xl, ...typography.bold },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  gradeText: { fontSize: 12, fontWeight: '700' },
  list: { padding: spacing.md, paddingTop: 0 },
  resultCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardInfo: { flex: 1 },
  examTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  subject: { ...typography.sm, color: colors.textSecondary },
  date: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  scoreSection: { alignItems: 'center', gap: 4 },
  gradeBadgeLg: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  gradeLg: { ...typography.lg, ...typography.bold },
  scorePct: { ...typography.sm, ...typography.semibold },
  marksText: { ...typography.sm, color: colors.textMuted, marginBottom: 8 },
  barBg: { height: 5, backgroundColor: colors.bgElevated, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default StudentResultsScreen;
