import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  TextInput, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Brain, Trophy, BookOpen, Clock, Target, CheckCircle, XCircle,
  Award, Search, X, RefreshCw, Lock, Play, BarChart2, Download, Building
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText, generateCertificateText } from '../../utils/fileExporter';
import { useAuth } from '../../context/AuthContext';

/* ─────────────────────────────────────────────────────────────
   Difficulty Badge Component
───────────────────────────────────────────────────────────── */
const DifficultyBadge = ({ difficulty }) => {
  const map = {
    easy: { color: '#16a34a', bg: 'rgba(22,163,74,0.12)', label: 'EASY' },
    medium: { color: '#d97706', bg: 'rgba(217,119,6,0.12)', label: 'MEDIUM' },
    hard: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'HARD' },
    mixed: { color: '#818cf8', bg: 'rgba(99,102,241,0.15)', label: 'MIXED' },
  };
  const cfg = map[(difficulty || '').toLowerCase()] || map.mixed;
  return (
    <View style={[styles.diffBadge, { backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }]}>
      <Text style={[styles.diffText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────
   Quiz Card Component (Replica of Web Quiz Arena Card)
───────────────────────────────────────────────────────────── */
const QuizCard = ({ quiz, onStart }) => {
  const canAttempt = quiz.canAttempt ?? (quiz.studentAttempts < quiz.maxAttempts);
  const hasPassed = quiz.hasPassed;
  const bestScore = quiz.bestScore;
  const isUniversity = (quiz.type || '').toLowerCase() === 'university' ||
                       (quiz.type || '').toLowerCase() === 'official' ||
                       (quiz.type || '').toLowerCase() === 'competitive';
  const tries = quiz.studentAttempts ?? 0;
  const maxTries = quiz.maxAttempts ?? 3;
  const passingScore = quiz.passingScore ?? 80;
  const isBestPassing = bestScore !== null && bestScore >= passingScore;

  return (
    <View style={[styles.quizCard, shadows.sm]}>
      {/* Top Right Quiz Type Badge */}
      <View style={styles.topRightBadgeWrapper}>
        <LinearGradient
          colors={isUniversity ? ['#4f46e5', '#7c3aed'] : ['#0ea5e9', '#0284c7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topRightBadgeGradient}
        >
          {isUniversity ? (
            <Building size={11} color="#ffffff" />
          ) : (
            <Brain size={11} color="#ffffff" />
          )}
          <Text style={styles.topRightBadgeText}>
            {isUniversity ? 'UNIVERSITY' : 'PRACTICE'}
          </Text>
        </LinearGradient>
      </View>

      {/* Top Left Status Badge (Passed / Incomplete) */}
      <View
        style={[
          styles.statusPill,
          hasPassed ? styles.statusPillPassed : styles.statusPillIncomplete,
        ]}
      >
        {hasPassed ? (
          <CheckCircle size={10} color="#16a34a" />
        ) : (
          <Clock size={10} color="#f59e0b" />
        )}
        <Text
          style={[
            styles.statusPillText,
            { color: hasPassed ? '#16a34a' : '#f59e0b' },
          ]}
        >
          {hasPassed ? 'Passed' : 'Incomplete'}
        </Text>
      </View>

      {/* Card Header Row: Gradient Icon & Difficulty */}
      <View style={styles.cardHeaderRow}>
        <LinearGradient
          colors={isUniversity ? ['#4f46e5', '#7c3aed'] : ['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quizIconBox}
        >
          {isUniversity ? (
            <Trophy size={20} color="#ffffff" />
          ) : (
            <Brain size={20} color="#ffffff" />
          )}
        </LinearGradient>

        <DifficultyBadge difficulty={quiz.difficulty} />
      </View>

      {/* Title & Description */}
      <Text style={styles.quizCardTitle} numberOfLines={2}>
        {quiz.title}
      </Text>
      {quiz.description ? (
        <Text style={styles.quizCardDesc} numberOfLines={2}>
          {quiz.description}
        </Text>
      ) : null}

      {/* Subject Tag */}
      {(quiz.subjectId?.subjectName || quiz.subjectId?.name) ? (
        <View style={styles.subjectRow}>
          <BookOpen size={12} color="#6366f1" />
          <Text style={styles.subjectText}>
            {quiz.subjectId.subjectName || quiz.subjectId.name}
          </Text>
        </View>
      ) : null}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <BookOpen size={12} color={colors.textMuted} />
          <Text style={styles.statChipText}>
            {quiz.questionCount ?? (quiz.questions?.length || 0)} Qs
          </Text>
        </View>
        {isUniversity && quiz.timeLimit ? (
          <View style={styles.statChip}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={styles.statChipText}>{quiz.timeLimit}m</Text>
          </View>
        ) : null}
        <View style={styles.statChip}>
          <RefreshCw size={12} color={colors.textMuted} />
          <Text style={styles.statChipText}>{tries}/{maxTries} tries</Text>
        </View>
      </View>

      {/* Best Score Progress Bar */}
      {bestScore !== null && (
        <View style={styles.bestScoreContainer}>
          <View style={styles.bestScoreHeader}>
            <Text style={styles.bestScoreLabel}>Best Score</Text>
            <Text style={[styles.bestScoreValue, { color: isBestPassing ? '#16a34a' : '#dc2626' }]}>
              {bestScore}%
            </Text>
          </View>
          <View style={styles.bestScoreTrack}>
            <View
              style={[
                styles.bestScoreFill,
                {
                  width: `${Math.min(100, Math.max(0, bestScore))}%`,
                  backgroundColor: isBestPassing ? '#16a34a' : '#dc2626',
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Action CTA Button */}
      {!canAttempt ? (
        <View style={styles.exhaustedBtn}>
          <Lock size={14} color="#64748b" />
          <Text style={styles.exhaustedBtnText}>Attempts Exhausted</Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onStart(quiz)}
          style={styles.actionBtnTouchable}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionBtnGradient}
          >
            <Play size={14} color="#ffffff" fill="#ffffff" />
            <Text style={styles.actionBtnText}>
              {tries === 0 ? 'Start Quiz' : 'Retry Quiz'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────
   My Result Row Component
───────────────────────────────────────────────────────────── */
const AttemptRow = ({ attempt }) => {
  const percentage = parseFloat(attempt.percentage) || 0;
  const passingScore = attempt.passing_score || 80;
  const passed = attempt.passed !== undefined ? attempt.passed : percentage >= passingScore;
  const dateObj = new Date(attempt.completedAt || attempt.submitted_at || attempt.created_at || Date.now());
  const dateStr = isNaN(dateObj.getTime())
    ? 'Recent'
    : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const totalSecs = parseInt(attempt.duration_seconds || attempt.timeTaken || 0, 10);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  const title = attempt.quiz_title || attempt.quizId?.title || 'Quiz Assessment';
  const score = attempt.score ?? 0;
  const totalMarks = attempt.total_marks || attempt.totalQuestions || attempt.quizId?.questions?.length || '?';
  const statusColor = passed ? '#16a34a' : '#dc2626';

  return (
    <View style={[styles.attemptCard, shadows.sm, { borderLeftColor: statusColor }]}>
      <View style={styles.attemptInnerRow}>
        <View style={[styles.attemptIconBox, { backgroundColor: `${statusColor}18` }]}>
          {passed ? (
            <CheckCircle size={20} color="#16a34a" />
          ) : (
            <XCircle size={20} color="#dc2626" />
          )}
        </View>

        <View style={styles.attemptInfoCol}>
          <Text style={styles.attemptTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.attemptMetaRow}>
            <Text style={styles.attemptMetaText}>{dateStr}</Text>
            <Text style={styles.attemptMetaDot}>•</Text>
            <View style={styles.attemptDurationRow}>
              <Clock size={11} color={colors.textMuted} />
              <Text style={styles.attemptMetaText}>{durationStr}</Text>
            </View>
            {passed ? (
              <>
                <Text style={styles.attemptMetaDot}>•</Text>
                <View style={styles.attemptPassedPill}>
                  <Text style={styles.attemptPassedPillText}>Passed</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.attemptScoreCol}>
          <Text style={[styles.attemptScoreBig, { color: statusColor }]}>
            {percentage}%
          </Text>
          <Text style={styles.attemptScoreSub}>
            {score}/{totalMarks} Correct
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────
   Certificate Card Component
───────────────────────────────────────────────────────────── */
const CertificateCard = ({ cert, onDownload }) => {
  const dateObj = new Date(cert.created_at || cert.issuedAt || Date.now());
  const dateStr = isNaN(dateObj.getTime())
    ? 'Verified'
    : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={[styles.certCard, shadows.sm]}>
      <View style={styles.certHeader}>
        <LinearGradient
          colors={['#f59e0b', '#f97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.certIconBox}
        >
          <Award size={22} color="#ffffff" />
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.certTitle} numberOfLines={1}>
            {cert.quiz_title || cert.quizTitle || 'Institutional Merit'}
          </Text>
          <Text style={styles.certDate}>Issued: {dateStr}</Text>
        </View>
        <View style={styles.certScoreBox}>
          <Text style={styles.certScore}>{cert.percentage || 100}%</Text>
          <Text style={styles.certScoreLbl}>Score</Text>
        </View>
      </View>

      {/* Monospace Certificate ID */}
      <View style={styles.certIdBadge}>
        <Award size={12} color="#f59e0b" />
        <Text style={styles.certIdText} numberOfLines={1}>
          {cert.certificate_id || cert.certificateId || cert.id}
        </Text>
      </View>

      {/* Download Button */}
      <TouchableOpacity
        style={styles.downloadCertBtn}
        onPress={() => onDownload(cert)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#f59e0b', '#f97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.downloadCertGradient}
        >
          <Download size={14} color="#ffffff" />
          <Text style={styles.downloadCertText}>Download & Share Certificate</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main QuizHubScreen
───────────────────────────────────────────────────────────── */
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

  // Categorize quizzes
  const practiceQuizzes = quizzes.filter(
    (q) => !q.type || (q.type || '').toLowerCase() === 'practice'
  );
  const universityQuizzes = quizzes.filter(
    (q) =>
      (q.type || '').toLowerCase() === 'university' ||
      (q.type || '').toLowerCase() === 'official' ||
      (q.type || '').toLowerCase() === 'competitive'
  );

  // Unattempted / Pending published count badge
  const practiceNewCount = practiceQuizzes.filter((q) => q.canAttempt && !q.hasPassed).length;
  const universityNewCount = universityQuizzes.filter((q) => q.canAttempt && !q.hasPassed).length;
  const passedCount = myAttempts.filter((a) => a.passed || (parseFloat(a.percentage) || 0) >= 80).length;

  const filterList = (list) => {
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((q) =>
      (q.title || '').toLowerCase().includes(s) ||
      (q.description || '').toLowerCase().includes(s) ||
      (q.subjectId?.subjectName || q.subjectId?.name || '').toLowerCase().includes(s) ||
      (q.category || '').toLowerCase().includes(s)
    );
  };

  const handleStartQuiz = (quiz) => {
    navigation.navigate('QuizAttempt', { quiz });
  };

  const handleDownloadCert = async (cert) => {
    const certText = generateCertificateText({
      certId: cert.certificate_id || cert.certificateId || cert.id,
      studentName: user?.name,
      quizTitle: cert.quiz_title || cert.quizTitle || 'Quiz Arena',
      percentage: cert.percentage || 100,
      date: cert.created_at || cert.issuedAt || new Date(),
    });

    const success = await exportText(
      `Certificate_${cert.certificate_id || cert.certificateId || 'Merit'}.txt`,
      certText,
      'text/plain'
    );
    if (success) {
      Alert.alert('🏆 Certificate Saved', 'Merit certificate saved and ready to share!');
    }
  };

  const tabs = [
    { id: 'practice', label: 'Practice Quizzes', icon: Brain, count: practiceNewCount },
    { id: 'university', label: 'University Quizzes', icon: Trophy, count: universityNewCount },
    { id: 'results', label: 'My Results', icon: BarChart2, count: 0 },
    { id: 'certificates', label: 'Certificates', icon: Award, count: 0 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Quiz Arena"
        subtitle="Test your knowledge, earn certifications"
        showLogout={false}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.student}
          />
        }
      >
        {/* ── Top Hero Gradient Card ── */}
        <View style={[styles.heroCard, shadows.md]}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.18)', 'rgba(139, 92, 246, 0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradientBg}
          >
            {/* Hero Header */}
            <View style={styles.heroHeaderRow}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroIconBox}
              >
                <Brain size={24} color="#ffffff" />
              </LinearGradient>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroTitle}>Quiz Arena</Text>
                <Text style={styles.heroSubtitle}>
                  Test your knowledge, earn certifications
                </Text>
              </View>
            </View>

            {/* 4 Metric Cards */}
            <View style={styles.heroMetricsGrid}>
              {[
                { label: 'AVAILABLE', value: quizzes.length, icon: BookOpen, color: '#6366f1' },
                { label: 'ATTEMPTS', value: myAttempts.length, icon: Target, color: '#f59e0b' },
                { label: 'PASSED', value: passedCount, icon: CheckCircle, color: '#16a34a' },
                { label: 'CERTIFICATES', value: certificates.length, icon: Award, color: '#f97316' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <View
                    key={s.label}
                    style={[styles.heroMetricItem, { borderColor: `${s.color}33` }]}
                  >
                    <Icon size={16} color={s.color} style={{ marginBottom: 4 }} />
                    <Text style={[styles.heroMetricValue, { color: s.color }]}>
                      {s.value}
                    </Text>
                    <Text style={styles.heroMetricLabel}>{s.label}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </View>

        {/* ── 4 Navigation Tabs (Pills) ── */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  onPress={() => setActiveTab(tab.id)}
                  style={styles.tabBtnTouchable}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={['#6366f1', '#8b5cf6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.tabBtnActiveGradient}
                    >
                      <Icon size={14} color="#ffffff" />
                      <Text style={styles.tabBtnTextActive}>{tab.label}</Text>
                      {tab.count > 0 && (
                        <View style={styles.countBadgeActive}>
                          <Text style={styles.countTextActive}>{tab.count}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  ) : (
                    <View style={styles.tabBtnInactive}>
                      <Icon size={14} color={colors.textSecondary} />
                      <Text style={styles.tabBtnTextInactive}>{tab.label}</Text>
                      {tab.count > 0 && (
                        <View style={styles.countBadgeInactive}>
                          <Text style={styles.countTextInactive}>{tab.count}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Search Bar (Practice & University tabs) ── */}
        {(activeTab === 'practice' || activeTab === 'university') && (
          <View style={styles.searchRow}>
            <Search size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search quizzes..."
              placeholderTextColor={colors.textMuted}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Tab Content ── */}
        {loading ? (
          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            {[...Array(3)].map((_, i) => (
              <CardSkeleton key={i} style={{ height: 180 }} />
            ))}
          </View>
        ) : (
          <View style={{ marginTop: spacing.sm }}>
            {/* Practice Quizzes Tab */}
            {activeTab === 'practice' && (
              <View style={styles.cardsList}>
                {filterList(practiceQuizzes).length === 0 ? (
                  <View style={styles.emptyState}>
                    <Brain size={44} color={colors.textMuted} style={{ opacity: 0.3 }} />
                    <Text style={styles.emptyText}>
                      {search ? `No quizzes match "${search}"` : 'No practice quizzes available yet.'}
                    </Text>
                  </View>
                ) : (
                  filterList(practiceQuizzes).map((quiz) => (
                    <QuizCard
                      key={quiz.id || quiz._id}
                      quiz={quiz}
                      onStart={handleStartQuiz}
                    />
                  ))
                )}
              </View>
            )}

            {/* University Quizzes Tab */}
            {activeTab === 'university' && (
              <View style={styles.cardsList}>
                {filterList(universityQuizzes).length === 0 ? (
                  <View style={styles.emptyState}>
                    <Trophy size={44} color={colors.textMuted} style={{ opacity: 0.3 }} />
                    <Text style={styles.emptyText}>
                      {search ? `No university quizzes match "${search}"` : 'No university quizzes available yet.'}
                    </Text>
                  </View>
                ) : (
                  filterList(universityQuizzes).map((quiz) => (
                    <QuizCard
                      key={quiz.id || quiz._id}
                      quiz={quiz}
                      onStart={handleStartQuiz}
                    />
                  ))
                )}
              </View>
            )}

            {/* My Results Tab */}
            {activeTab === 'results' && (
              <View style={styles.cardsList}>
                {myAttempts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <BarChart2 size={44} color={colors.textMuted} style={{ opacity: 0.3 }} />
                    <Text style={styles.emptyText}>
                      No quiz attempts yet. Take your first quiz!
                    </Text>
                  </View>
                ) : (
                  myAttempts.map((attempt, idx) => (
                    <AttemptRow
                      key={attempt.id || attempt._id || idx}
                      attempt={attempt}
                    />
                  ))
                )}
              </View>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <View style={styles.cardsList}>
                {certificates.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Award size={44} color={colors.textMuted} style={{ opacity: 0.3 }} />
                    <Text style={styles.emptyText}>
                      No certificates earned yet. Pass a University Quiz with ≥80% to earn verified certification!
                    </Text>
                  </View>
                ) : (
                  certificates.map((cert, idx) => (
                    <CertificateCard
                      key={cert.certificate_id || cert.id || idx}
                      cert={cert}
                      onDownload={handleDownloadCert}
                    />
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  /* Hero Card */
  heroCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: spacing.md,
  },
  heroGradientBg: {
    padding: spacing.md,
    backgroundColor: colors.bgCard,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextCol: { flex: 1 },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  heroMetricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  heroMetricValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroMetricLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  /* Tab Bar */
  tabBarWrapper: {
    marginBottom: spacing.sm,
  },
  tabScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  tabBtnTouchable: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  tabBtnActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  tabBtnTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  countTextActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  tabBtnInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnTextInactive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  countBadgeInactive: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  countTextInactive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Search */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },

  /* Cards List */
  cardsList: {
    gap: spacing.md,
  },

  /* Quiz Card */
  quizCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  topRightBadgeWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  topRightBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 16,
  },
  topRightBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statusPill: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusPillPassed: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  statusPillIncomplete: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* Card Content Row */
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    marginBottom: spacing.sm,
  },
  quizIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  diffText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quizCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
  quizCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#818cf8',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  /* Best Score */
  bestScoreContainer: {
    marginBottom: spacing.md,
  },
  bestScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bestScoreLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bestScoreValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  bestScoreTrack: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bestScoreFill: {
    height: 5,
    borderRadius: 3,
  },

  /* Action Buttons */
  actionBtnTouchable: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  exhaustedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  exhaustedBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },

  /* Attempt Card */
  attemptCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
  },
  attemptInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attemptIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attemptInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  attemptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attemptMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  attemptMetaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  attemptMetaDot: {
    fontSize: 11,
    color: colors.textMuted,
  },
  attemptDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  attemptPassedPill: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  attemptPassedPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16a34a',
  },
  attemptScoreCol: {
    alignItems: 'flex-end',
  },
  attemptScoreBig: {
    fontSize: 16,
    fontWeight: '800',
  },
  attemptScoreSub: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Certificate Card */
  certCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  certIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  certDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  certScoreBox: {
    alignItems: 'flex-end',
  },
  certScore: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a',
  },
  certScoreLbl: {
    fontSize: 9,
    color: colors.textMuted,
  },
  certIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  certIdText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  downloadCertBtn: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 2,
  },
  downloadCertGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  downloadCertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default QuizHubScreen;
