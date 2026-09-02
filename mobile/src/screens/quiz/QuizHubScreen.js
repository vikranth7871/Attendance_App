import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Gamepad2, Search, X, Clock, Award, Trophy, ChevronRight, CheckCircle
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const DIFFICULTY_COLORS = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.danger,
};

const QuizCard = ({ quiz, onPress, attempted }) => {
  const diffColor = DIFFICULTY_COLORS[quiz.difficulty?.toLowerCase()] || colors.primary;

  return (
    <TouchableOpacity style={[styles.card, shadows.sm]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: colors.student + '22' }]}>
          <Text style={[styles.categoryText, { color: colors.student }]}>
            {quiz.category || 'General'}
          </Text>
        </View>
        {attempted && (
          <View style={styles.attemptedBadge}>
            <CheckCircle size={13} color={colors.success} />
            <Text style={styles.attemptedText}>Attempted</Text>
          </View>
        )}
      </View>

      <Text style={styles.quizTitle}>{quiz.title}</Text>
      {quiz.description && (
        <Text style={styles.quizDesc} numberOfLines={2}>{quiz.description}</Text>
      )}

      <View style={styles.metaRow}>
        <View style={[styles.diffBadge, { backgroundColor: diffColor + '22' }]}>
          <Text style={[styles.diffText, { color: diffColor }]}>{quiz.difficulty || 'Medium'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Gamepad2 size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{quiz.question_count || quiz.questions?.length || 0} Q's</Text>
        </View>
        {quiz.time_limit && (
          <View style={styles.metaItem}>
            <Clock size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{quiz.time_limit} min</Text>
          </View>
        )}
        {quiz.attempt_count !== undefined && (
          <View style={styles.metaItem}>
            <Trophy size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{quiz.attempt_count} attempts</Text>
          </View>
        )}
        <ChevronRight size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );
};

const QuizHubScreen = ({ navigation }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [myAttempts, setMyAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'attempted'

  const fetchData = async () => {
    try {
      const [quizRes, attemptRes] = await Promise.all([
        api.get('/quiz').catch(() => ({ data: [] })),
        api.get('/quiz/my-attempts').catch(() => ({ data: [] })),
      ]);
      setQuizzes(quizRes.data || []);
      setMyAttempts(attemptRes.data || []);
    } catch (err) {
      console.error('Quiz hub fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const attemptedIds = new Set(myAttempts.map(a => a.quiz_id));

  const filtered = quizzes.filter(q => {
    const matchSearch = !search.trim() ||
      q.title?.toLowerCase().includes(search.toLowerCase()) ||
      q.category?.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' || (activeTab === 'attempted' && attemptedIds.has(q.id));
    return matchSearch && matchTab;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Quiz Arena" subtitle={`${quizzes.length} quizzes available`} />

      {/* Search */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search quizzes..."
          placeholderTextColor={colors.textMuted}
        />
        {!!search && <TouchableOpacity onPress={() => setSearch('')}><X size={16} color={colors.textMuted} /></TouchableOpacity>}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.tabActive]} onPress={() => setActiveTab('all')}>
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All ({quizzes.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'attempted' && styles.tabActive]} onPress={() => setActiveTab('attempted')}>
          <Text style={[styles.tabText, activeTab === 'attempted' && styles.tabTextActive]}>Attempted ({myAttempts.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <QuizCard
              quiz={item}
              attempted={attemptedIds.has(item.id)}
              onPress={() => navigation.navigate('QuizAttempt', { quiz: item })}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Gamepad2 size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'attempted' ? 'No attempted quizzes' : 'No quizzes found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'attempted' ? 'Take your first quiz below!' : 'Check back later for new quizzes'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, margin: spacing.md, marginBottom: 0,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: colors.textPrimary, ...typography.sm },
  tabRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.sm },
  tab: { flex: 1, padding: spacing.sm, borderRadius: radius.full, backgroundColor: colors.bgCard, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.student + '22', borderColor: colors.student },
  tabText: { ...typography.sm, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.student },
  list: { padding: spacing.md, paddingTop: 0 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  categoryText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  attemptedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attemptedText: { ...typography.xs, color: colors.success, fontWeight: '600' },
  quizTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: 4 },
  quizDesc: { ...typography.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  diffText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...typography.xs, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.lg, ...typography.semibold, color: colors.textSecondary },
  emptySubtitle: { ...typography.sm, color: colors.textMuted, textAlign: 'center' },
});

export default QuizHubScreen;
