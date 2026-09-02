import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle, XCircle, Trophy, Clock, BarChart2,
  Award, ChevronDown, ChevronUp, ArrowLeft, RotateCcw
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

/* ── Question Review Card ── */
const ReviewCard = ({ answer, index }) => {
  const [expanded, setExpanded] = useState(false);
  const isCorrect = answer.isCorrect;
  const statusColor = isCorrect ? colors.success : answer.selectedOption === -1 ? colors.textMuted : colors.danger;

  return (
    <TouchableOpacity
      style={[styles.reviewCard, shadows.sm, { borderLeftColor: statusColor, borderLeftWidth: 3 }]}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.85}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.reviewTop}>
          {isCorrect
            ? <CheckCircle size={18} color={colors.success} />
            : answer.selectedOption === -1
            ? <View style={styles.skippedDot} />
            : <XCircle size={18} color={colors.danger} />}
          <Text style={styles.reviewQ} numberOfLines={expanded ? undefined : 2}>
            Q{index + 1}. {answer.questionText}
          </Text>
        </View>
        {expanded ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
      </View>

      {expanded && (
        <View style={styles.reviewBody}>
          {(answer.options || []).map((opt, i) => {
            const isSelected = answer.selectedOption === i;
            const isCorrectOpt = answer.correctOption === i;
            let bg = 'transparent';
            let border = colors.border;
            let textColor = colors.textSecondary;
            if (isCorrectOpt) { bg = colors.success + '18'; border = colors.success + '55'; textColor = colors.success; }
            else if (isSelected && !isCorrectOpt) { bg = colors.danger + '18'; border = colors.danger + '55'; textColor = colors.danger; }

            return (
              <View key={i} style={[styles.reviewOption, { backgroundColor: bg, borderColor: border }]}>
                <Text style={[styles.reviewOptionLabel, { color: textColor }]}>{OPTION_LABELS[i]}</Text>
                <Text style={[styles.reviewOptionText, { color: textColor }]}>{opt}</Text>
                {isSelected && !isCorrectOpt && <XCircle size={13} color={colors.danger} />}
                {isCorrectOpt && <CheckCircle size={13} color={colors.success} />}
              </View>
            );
          })}
          {answer.explanation ? (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationTitle}>💡 Explanation</Text>
              <Text style={styles.explanationText}>{answer.explanation}</Text>
            </View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

/* ── Main Screen ── */
const QuizResultsScreen = ({ route, navigation }) => {
  const { result, quiz, timeTaken } = route.params || {};
  const [showReview, setShowReview] = useState(false);

  if (!result) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Result data not available.</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.navigate('QuizHub')}>
            <Text style={styles.goBackText}>Back to Quizzes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { score, totalQuestions, percentage, passed, gradedAnswers, certificate } = result;

  const mins = Math.floor((timeTaken || 0) / 60);
  const secs = (timeTaken || 0) % 60;
  const timeStr = `${mins}m ${secs}s`;

  const correctCount = gradedAnswers?.filter(a => a.isCorrect).length ?? score;
  const wrongCount = gradedAnswers?.filter(a => !a.isCorrect && a.selectedOption !== -1).length ?? 0;
  const skippedCount = gradedAnswers?.filter(a => a.selectedOption === -1).length ?? 0;

  const resultColor = passed ? colors.success : colors.danger;
  const resultGradient = passed ? colors.gradientTeacher : ['#b91c1c', '#ef4444'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Result Banner */}
        <LinearGradient colors={resultGradient} style={styles.resultBanner}>
          <View style={styles.resultIcon}>
            {passed ? <Trophy size={44} color="#fff" /> : <BarChart2 size={44} color="#fff" />}
          </View>
          <Text style={styles.resultTitle}>{passed ? '🎉 Congratulations!' : 'Quiz Completed'}</Text>
          <Text style={styles.resultSubtitle}>{result.message}</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{percentage}%</Text>
          </View>
          {quiz?.title && <Text style={styles.quizTitleText}>{quiz.title}</Text>}
        </LinearGradient>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatBox icon={CheckCircle} label="Correct" value={correctCount} color={colors.success} />
          <StatBox icon={XCircle} label="Wrong" value={wrongCount} color={colors.danger} />
          <StatBox icon={Award} label="Skipped" value={skippedCount} color={colors.textMuted} />
          <StatBox icon={Clock} label="Time" value={timeStr} color={colors.student} />
        </View>

        {/* Pass/Fail status */}
        <View style={[styles.statusCard, { borderColor: resultColor + '44' }, shadows.sm]}>
          <View style={[styles.statusIndicator, { backgroundColor: resultColor + '22' }]}>
            {passed ? <CheckCircle size={20} color={resultColor} /> : <XCircle size={20} color={resultColor} />}
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: resultColor }]}>
              {passed ? 'Passed!' : 'Not Passed'}
            </Text>
            <Text style={styles.statusDesc}>
              Passing score: {quiz?.passingScore || 80}% · Your score: {percentage}%
            </Text>
          </View>
        </View>

        {/* Certificate */}
        {certificate && (
          <LinearGradient colors={['#d97706', '#f59e0b']} style={[styles.certCard, shadows.md]}>
            <Award size={28} color="#fff" />
            <View style={styles.certInfo}>
              <Text style={styles.certTitle}>🏆 Merit Certificate Earned!</Text>
              <Text style={styles.certId}>ID: {certificate.certificate_id}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Review toggle */}
        <TouchableOpacity
          style={styles.reviewToggle}
          onPress={() => setShowReview(v => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.reviewToggleText}>
            {showReview ? 'Hide Review' : 'Review Answers'}
          </Text>
          {showReview ? <ChevronUp size={18} color={colors.student} /> : <ChevronDown size={18} color={colors.student} />}
        </TouchableOpacity>

        {/* Answers review */}
        {showReview && (
          <View style={styles.reviewList}>
            {(gradedAnswers || []).map((a, i) => (
              <ReviewCard key={i} answer={a} index={i} />
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.replace('QuizAttempt', { quiz })}
            activeOpacity={0.8}
          >
            <RotateCcw size={16} color={colors.student} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('QuizHub')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={colors.gradientStudent} style={styles.homeBtnGradient}>
              <ArrowLeft size={16} color="#fff" />
              <Text style={styles.homeBtnText}>All Quizzes</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const StatBox = ({ icon: Icon, label, value, color }) => (
  <View style={[styles.statBox, shadows.sm]}>
    <Icon size={18} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Error
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  errorText: { ...typography.base, color: colors.textMuted },
  goBackBtn: { backgroundColor: colors.bgCard, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  goBackText: { ...typography.sm, color: colors.textSecondary },

  // Banner
  resultBanner: { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  resultIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  resultTitle: { ...typography.xl, ...typography.bold, color: '#fff', textAlign: 'center' },
  resultSubtitle: { ...typography.sm, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  scoreBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.full, marginTop: spacing.xs },
  scoreText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  quizTitleText: { ...typography.sm, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  // Stats
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  statValue: { ...typography.base, ...typography.bold },
  statLabel: { ...typography.xs, color: colors.textMuted },

  // Status card
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1 },
  statusIndicator: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  statusInfo: { flex: 1 },
  statusTitle: { ...typography.base, ...typography.bold },
  statusDesc: { ...typography.sm, color: colors.textMuted, marginTop: 2 },

  // Certificate
  certCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  certInfo: { flex: 1 },
  certTitle: { ...typography.base, ...typography.bold, color: '#fff' },
  certId: { ...typography.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Review toggle
  reviewToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.student + '44' },
  reviewToggleText: { ...typography.base, ...typography.semibold, color: colors.student },

  // Review list
  reviewList: { gap: spacing.sm, marginBottom: spacing.md },
  reviewCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flex: 1 },
  reviewQ: { ...typography.sm, color: colors.textPrimary, flex: 1, lineHeight: 20 },
  skippedDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.textMuted, flexShrink: 0 },
  reviewBody: { marginTop: spacing.sm, gap: spacing.xs },
  reviewOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1 },
  reviewOptionLabel: { fontSize: 12, fontWeight: '700', width: 20 },
  reviewOptionText: { flex: 1, ...typography.sm },
  explanationBox: { backgroundColor: colors.bgElevated, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.xs },
  explanationTitle: { ...typography.xs, ...typography.semibold, color: colors.textSecondary, marginBottom: 4 },
  explanationText: { ...typography.sm, color: colors.textPrimary, lineHeight: 18 },

  // Actions
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  retryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.student + '44' },
  retryText: { ...typography.sm, ...typography.semibold, color: colors.student },
  homeBtn: { flex: 1, borderRadius: radius.md, overflow: 'hidden' },
  homeBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: 14 },
  homeBtnText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default QuizResultsScreen;
