import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle, XCircle, Trophy, Clock, BarChart2,
  Award, ChevronDown, ChevronUp, ArrowLeft, RotateCcw, Download
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText, generateCertificateText } from '../../utils/fileExporter';
import { useAuth } from '../../context/AuthContext';

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

const StatBox = ({ icon: Icon, label, value, color }) => (
  <View style={[styles.statBox, shadows.sm]}>
    <Icon size={18} color={color} />
    <Text style={[styles.statVal, { color }]}>{value}</Text>
    <Text style={styles.statLbl}>{label}</Text>
  </View>
);

/* ── Main Screen ── */
const QuizResultsScreen = ({ route, navigation }) => {
  const { user } = useAuth();
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

  const handleDownloadCert = async () => {
    if (!certificate) return;
    const certText = generateCertificateText({
      certId: certificate.certificate_id || certificate.certificateId,
      studentName: user?.name,
      quizTitle: quiz?.title || 'Quiz Assessment',
      percentage: percentage,
      date: certificate.issued_at || certificate.issuedAt || new Date(),
    });

    const success = await exportText(
      `Certificate_${certificate.certificate_id || 'Merit'}.txt`,
      certText,
      'text/plain'
    );
    if (success) {
      Alert.alert('🏆 Downloaded', 'Merit certificate saved and ready to share!');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBackBtn}
          onPress={() => navigation.navigate('QuizHub')}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
          <Text style={styles.topBackText}>Quiz Arena</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Result Banner */}
        <LinearGradient colors={resultGradient} style={styles.resultBanner}>
          <View style={styles.resultIcon}>
            {passed ? <Trophy size={44} color="#fff" /> : <BarChart2 size={44} color="#fff" />}
          </View>
          <Text style={styles.resultTitle}>{passed ? '🎉 Congratulations!' : 'Quiz Completed'}</Text>
          <Text style={styles.resultSubtitle}>{result.message || (passed ? 'You cleared the assessment!' : 'Keep practicing to improve your score.')}</Text>
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
              Passing requirement: {quiz?.passingScore || 80}% · Your score: {percentage}%
            </Text>
          </View>
        </View>

        {/* Certificate Card & 1-Click Download */}
        {certificate && (
          <LinearGradient colors={['#d97706', '#f59e0b']} style={[styles.certCard, shadows.md]}>
            <View style={styles.certTop}>
              <Award size={32} color="#fff" />
              <View style={styles.certInfo}>
                <Text style={styles.certTitle}>🏆 Merit Certificate Earned!</Text>
                <Text style={styles.certId}>ID: {certificate.certificate_id || certificate.certificateId}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.downloadCertBtn} onPress={handleDownloadCert}>
              <Download size={16} color="#d97706" />
              <Text style={styles.downloadCertText}>Download & Share Certificate</Text>
            </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  topBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  topBackText: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  content: { padding: spacing.md },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  errorText: { ...typography.base, color: colors.danger },
  goBackBtn: { backgroundColor: colors.student, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  goBackText: { ...typography.sm, ...typography.bold, color: '#fff' },
  resultBanner: {
    borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center',
    marginBottom: spacing.md, gap: 4,
  },
  resultIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  resultTitle: { ...typography.xl, ...typography.bold, color: '#fff' },
  resultSubtitle: { ...typography.xs, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 6 },
  scoreBadge: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 4, borderRadius: radius.full, marginBottom: 4 },
  scoreText: { ...typography.xxl, ...typography.bold, color: '#0f172a' },
  quizTitleText: { ...typography.xs, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  statBox: {
    flex: 1, backgroundColor: colors.bgCard, padding: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 2,
  },
  statVal: { ...typography.base, ...typography.bold },
  statLbl: { ...typography.xs, color: colors.textMuted },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, marginBottom: spacing.md,
  },
  statusIndicator: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statusInfo: { flex: 1 },
  statusTitle: { ...typography.base, ...typography.bold },
  statusDesc: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  certCard: {
    borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, gap: spacing.sm,
  },
  certTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  certInfo: { flex: 1 },
  certTitle: { ...typography.base, ...typography.bold, color: '#fff' },
  certId: { ...typography.xs, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', marginTop: 2 },
  downloadCertBtn: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 10,
    borderRadius: radius.md,
  },
  downloadCertText: { ...typography.sm, ...typography.bold, color: '#d97706' },
  reviewToggle: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingVertical: spacing.sm, marginBottom: spacing.sm,
  },
  reviewToggleText: { ...typography.sm, ...typography.bold, color: colors.student },
  reviewList: { gap: spacing.xs, marginBottom: spacing.md },
  reviewCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, marginRight: spacing.sm },
  skippedDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.textMuted },
  reviewQ: { ...typography.sm, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  reviewBody: { marginTop: spacing.sm, gap: 6, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border + '44' },
  reviewOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1,
  },
  reviewOptionLabel: { ...typography.xs, ...typography.bold, width: 16 },
  reviewOptionText: { ...typography.xs, flex: 1 },
  explanationBox: {
    backgroundColor: colors.bgPrimary, borderRadius: radius.sm,
    padding: spacing.sm, marginTop: 4, borderWidth: 1, borderColor: colors.border,
  },
  explanationTitle: { ...typography.xs, ...typography.bold, color: colors.warning, marginBottom: 2 },
  explanationText: { ...typography.xs, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  retryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.student,
  },
  retryText: { ...typography.sm, ...typography.bold, color: colors.student },
  homeBtn: { flex: 1 },
  homeBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: radius.md,
  },
  homeBtnText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default QuizResultsScreen;
