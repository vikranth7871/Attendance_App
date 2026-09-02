import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Alert, ActivityIndicator, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Award, Sparkles, Plus, Search, Trash2, Globe, EyeOff,
  Clock, Gamepad2, X, CheckCircle, ChevronRight
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import AIQuizGeneratorModal from '../../components/AIQuizGeneratorModal';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const AdminQuizManageScreen = ({ navigation }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  const fetchQuizzes = async () => {
    try {
      const { data } = await api.get('/quiz/admin/manage');
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch quizzes error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchQuizzes(); }, []);

  const handleTogglePublish = async (quiz) => {
    try {
      await api.put(`/quiz/${quiz.id}/publish`);
      setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, isPublished: !q.isPublished } : q));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to toggle publish state.');
    }
  };

  const handleDelete = (quiz) => {
    Alert.alert(
      'Delete Quiz',
      `Are you sure you want to delete "${quiz.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/quiz/${quiz.id}`);
              fetchQuizzes();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete quiz.');
            }
          }
        }
      ]
    );
  };

  const handleAIGenerated = async (generatedData) => {
    try {
      await api.post('/quiz/create', {
        title: generatedData.title,
        questions: generatedData.questions,
        difficulty: generatedData.difficulty || 'medium',
        timeLimit: 30,
        passingScore: 80,
        isPublished: true,
      });
      fetchQuizzes();
    } catch (err) {
      Alert.alert('Save Error', err.response?.data?.message || 'Could not save AI generated quiz.');
    }
  };

  const filtered = quizzes.filter(q => {
    const s = search.toLowerCase();
    return !s ||
      q.title?.toLowerCase().includes(s) ||
      q.subjectId?.subjectName?.toLowerCase().includes(s) ||
      q.createdBy?.name?.toLowerCase().includes(s);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Quiz Arena Management"
        subtitle={`${quizzes.length} quizzes in library`}
        rightAction={
          <TouchableOpacity style={styles.aiBtn} onPress={() => setShowAIModal(true)}>
            <Sparkles size={16} color="#fff" />
            <Text style={styles.aiBtnText}>AI Generator</Text>
          </TouchableOpacity>
        }
        navigation={navigation}
      />

      {/* Search */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search quizzes by title or subject..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, shadows.sm]}>
              <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: colors.student + '22' }]}>
                  <Text style={[styles.typeBadgeText, { color: colors.student }]}>
                    {item.type || 'Practice'}
                  </Text>
                </View>
                <View style={styles.statusToggle}>
                  <Text style={[styles.statusText, { color: item.isPublished ? colors.success : colors.textMuted }]}>
                    {item.isPublished ? 'Published' : 'Draft'}
                  </Text>
                  <Switch
                    value={item.isPublished}
                    onValueChange={() => handleTogglePublish(item)}
                    trackColor={{ false: colors.bgElevated, true: colors.success + '66' }}
                    thumbColor={item.isPublished ? colors.success : colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.quizTitle}>{item.title}</Text>
              {item.subjectId?.subjectName && (
                <Text style={styles.subjectText}>{item.subjectId.subjectName}</Text>
              )}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Gamepad2 size={13} color={colors.textMuted} />
                  <Text style={styles.metaText}>{item.questionCount || item.questions?.length || 0} Qs</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={13} color={colors.textMuted} />
                  <Text style={styles.metaText}>{item.timeLimit || 30} min</Text>
                </View>
                <Text style={styles.creatorText}>By {item.createdBy?.name || 'Faculty'}</Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item)}
                >
                  <Trash2 size={14} color={colors.danger} />
                  <Text style={[styles.actionBtnText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Award size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Quizzes Found</Text>
              <Text style={styles.emptySub}>Tap 'AI Generator' to instantly create a quiz</Text>
            </View>
          }
        />
      )}

      {/* AI Quiz Generator Modal */}
      <AIQuizGeneratorModal
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerated={handleAIGenerated}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  aiBtnText: { ...typography.xs, ...typography.bold, color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, margin: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  searchInput: { flex: 1, color: colors.textPrimary, ...typography.sm },
  list: { padding: spacing.md, paddingTop: 0 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  typeBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statusToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  quizTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: 2 },
  subjectText: { ...typography.xs, color: colors.textSecondary, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border + '66', paddingTop: spacing.sm, marginBottom: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.xs, color: colors.textMuted },
  creatorText: { ...typography.xs, color: colors.textMuted, marginLeft: 'auto' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1 },
  deleteBtn: { borderColor: colors.danger + '44', backgroundColor: colors.danger + '12' },
  actionBtnText: { ...typography.xs, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.base, ...typography.semibold, color: colors.textSecondary },
  emptySub: { ...typography.sm, color: colors.textMuted },
});

export default AdminQuizManageScreen;
