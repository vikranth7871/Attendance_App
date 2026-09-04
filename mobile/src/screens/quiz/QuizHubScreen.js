import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  TextInput, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Gamepad2, Search, X, Clock, Award, Trophy, ChevronRight, CheckCircle,
  Brain, Building, BarChart2, Download, AlertCircle, Sparkles
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText, generateCertificateText } from '../../utils/fileExporter';
import { useAuth } from '../../context/AuthContext';

const DIFFICULTY_COLORS = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.danger,
};

const QuizHubScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [myAttempts, setMyAttempts] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('practice'); // 'practice' | 'university' | 'results' | 'certificates'

  const fetchData = async () => {
    try {
      const [quizRes, attemptRes, certRes] = await Promise.all([
        api.get('/quiz').catch(() => ({ data: [] })),
        api.get('/quiz/my-attempts').catch(() => ({ data: [] })),
        api.get('/quiz/my-certificates').catch(() => ({ data: [] })),
      ]);
      setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : []);
      setMyAttempts(Array.isArray(attemptRes.data) ? attemptRes.data : []);
      setCertificates(Array.isArray(certRes.data) ? certRes.data : []);
    } catch (err) {
      console.error('Quiz hub fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const attemptedIds = new Set(myAttempts.map((a) => a.quiz_id || a.quizId));

  const practiceQuizzes = quizzes.filter((q) => (q.type || 'practice').toLowerCase() === 'practice');
  const universityQuizzes = quizzes.filter((q) => (q.type || '').toLowerCase() === 'university');

  const filterList = (list) => {
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((q) =>
      (q.title || '').toLowerCase().includes(s) ||
      (q.category || '').toLowerCase().includes(s) ||
      (q.quiz_title || '').toLowerCase().includes(s)
    );
  };

  const handleDownloadCert = async (cert) => {
    const certText = generateCertificateText({
      certId: cert.certificate_id || cert.id,
      studentName: user?.name,
      quizTitle: cert.quiz_title || 'Quiz Arena',
      percentage: cert.percentage || 100,
      date: cert.created_at || new Date(),
    });

    const success = await exportText(
      `Certificate_${cert.certificate_id || 'Merit'}.txt`,
      certText,
      'text/plain'
    );
    if (success) {
      Alert.alert('🏆 Downloaded', 'Merit certificate saved and ready to share!');
    }
  };

  const tabs = [
    { id: 'practice', label: 'Practice', icon: Brain, count: practiceQuizzes.length },
    { id: 'university', label: 'University', icon: Building, count: universityQuizzes.length },
    { id: 'results', label: 'My Results', icon: BarChart2, count: myAttempts.length },
    { id: 'certificates', label: 'Certificates', icon: Award, count: certificates.length },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Quiz Arena"
        subtitle={`${quizzes.length} active quizzes • ${certificates.length} certificates`}
        showLogout={false}
      />

      {/* Search */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search quizzes or topics..."
          placeholderTextColor={colors.textMuted}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 4 Navigation Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Icon size={14} color={isActive ? colors.student : colors.textMuted} />
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                    <Text style={[styles.countText, isActive && styles.countTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Practice & University Quizzes */}
          {(activeTab === 'practice' || activeTab === 'university') && (
            <FlatList
              data={filterList(activeTab === 'practice' ? practiceQuizzes : universityQuizzes)}
              keyExtractor={(item) => item.id?.toString() || item._id?.toString()}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
              renderItem={({ item }) => {
                const diffColor = DIFFICULTY_COLORS[item.difficulty?.toLowerCase()] || colors.primary;
                const isAttempted = attemptedIds.has(item.id || item._id);

                return (
                  <TouchableOpacity
                    style={[styles.card, shadows.sm]}
                    onPress={() => navigation.navigate('QuizAttempt', { quiz: item })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.categoryBadge, { backgroundColor: colors.student + '22' }]}>
                        <Text style={[styles.categoryText, { color: colors.student }]}>
                          {item.category || 'General'}
                        </Text>
                      </View>
                      {isAttempted ? (
                        <View style={styles.attemptedBadge}>
                          <CheckCircle size={12} color={colors.success} />
                          <Text style={styles.attemptedText}>Completed</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.quizTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.quizDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}

                    <View style={styles.metaRow}>
                      <View style={[styles.diffBadge, { backgroundColor: diffColor + '22' }]}>
                        <Text style={[styles.diffText, { color: diffColor }]}>{item.difficulty || 'Medium'}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Gamepad2 size={13} color={colors.textMuted} />
                        <Text style={styles.metaText}>{item.question_count || item.questions?.length || 0} Qs</Text>
                      </View>
                      {item.time_limit ? (
                        <View style={styles.metaItem}>
                          <Clock size={13} color={colors.textMuted} />
                          <Text style={styles.metaText}>{item.time_limit} min</Text>
                        </View>
                      ) : null}
                      <ChevronRight size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Gamepad2 size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No {activeTab} quizzes found</Text>
                </View>
              }
            />
          )}

          {/* My Past Results */}
          {activeTab === 'results' && (
            <FlatList
              data={myAttempts}
              keyExtractor={(item, i) => item.id?.toString() || item._id?.toString() || i.toString()}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
              renderItem={({ item }) => {
                const passed = item.passed || (item.percentage >= 80);
                const statusColor = passed ? colors.success : colors.danger;

                return (
                  <View style={[styles.attemptCard, shadows.sm, { borderLeftColor: statusColor }]}>
                    <View style={styles.attemptHeader}>
                      <Text style={styles.attemptTitle}>{item.quiz_title || item.title || 'Quiz Assessment'}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {passed ? 'Passed' : 'Review'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.attemptMetaRow}>
                      <Text style={[styles.scoreBig, { color: statusColor }]}>
                        {item.percentage ?? Math.round((item.score / (item.total_questions || 1)) * 100)}%
                      </Text>
                      <View style={{ flex: 1, paddingLeft: spacing.sm }}>
                        <Text style={styles.attemptDetailText}>
                          Score: {item.score} / {item.total_questions || 0} correct
                        </Text>
                        <Text style={styles.attemptDetailSub}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <BarChart2 size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No quiz attempts yet. Take a quiz to test your knowledge!</Text>
                </View>
              }
            />
          )}

          {/* Certificates */}
          {activeTab === 'certificates' && (
            <FlatList
              data={certificates}
              keyExtractor={(item, i) => item.id?.toString() || item.certificate_id || i.toString()}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
              renderItem={({ item }) => (
                <View style={[styles.certCard, shadows.sm]}>
                  <View style={styles.certHeader}>
                    <View style={styles.certIconBox}>
                      <Award size={24} color="#f59e0b" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.certTitle}>{item.quiz_title || 'Institutional Merit'}</Text>
                      <Text style={styles.certId}>ID: {item.certificate_id}</Text>
                      <Text style={styles.certDate}>
                        Issued: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Verified'}
                      </Text>
                    </View>
                    <View style={styles.certScoreBox}>
                      <Text style={styles.certScore}>{item.percentage || 100}%</Text>
                      <Text style={styles.certScoreLbl}>Score</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.downloadCertBtn}
                    onPress={() => handleDownloadCert(item)}
                  >
                    <Download size={14} color="#f59e0b" />
                    <Text style={styles.downloadCertText}>Download & Share Certificate</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Trophy size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No certificates earned yet. Pass a University Quiz with ≥80% to earn verified certification!</Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    marginHorizontal: spacing.md, marginTop: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  tabContainer: {
    paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border,
    marginTop: spacing.xs,
  },
  tabScroll: { paddingHorizontal: spacing.md, gap: spacing.xs },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
  },
  tabBtnActive: { backgroundColor: colors.student + '22', borderColor: colors.student },
  tabBtnText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  tabBtnTextActive: { color: colors.student, fontWeight: '700' },
  countBadge: {
    backgroundColor: colors.bgPrimary, paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: radius.full,
  },
  countBadgeActive: { backgroundColor: colors.student },
  countText: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
  countTextActive: { color: '#ffffff' },
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  categoryText: { fontSize: 11, fontWeight: '700' },
  attemptedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attemptedText: { fontSize: 11, color: colors.success, fontWeight: '600' },
  quizTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  quizDesc: { ...typography.xs, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs },
  diffText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.xs, color: colors.textMuted },
  attemptCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4,
  },
  attemptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  attemptTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  attemptMetaRow: { flexDirection: 'row', alignItems: 'center' },
  scoreBig: { ...typography.xl, ...typography.bold, width: 60 },
  attemptDetailText: { ...typography.xs, color: colors.textPrimary, fontWeight: '600' },
  attemptDetailSub: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  certCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  certHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  certIconBox: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: '#f59e0b18', justifyContent: 'center', alignItems: 'center',
  },
  certTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  certId: { ...typography.xs, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  certDate: { ...typography.xs, color: colors.textMuted, marginTop: 1 },
  certScoreBox: { alignItems: 'center' },
  certScore: { ...typography.lg, ...typography.bold, color: colors.success },
  certScoreLbl: { fontSize: 10, color: colors.textMuted },
  downloadCertBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: '#f59e0b15', borderWidth: 1, borderColor: '#f59e0b44',
  },
  downloadCertText: { ...typography.xs, fontWeight: '700', color: '#f59e0b' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyText: { ...typography.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});

export default QuizHubScreen;
