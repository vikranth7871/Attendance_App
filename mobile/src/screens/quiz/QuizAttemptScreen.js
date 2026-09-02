import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, ChevronLeft, ChevronRight, Check, Flag, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

/* ── Helpers ── */
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

/* ── Screen ── */
const QuizAttemptScreen = ({ route, navigation }) => {
  // Quiz may be passed as param from QuizHubScreen (preview) or we fetch by id
  const { quiz: initialQuiz } = route.params || {};

  const [quiz, setQuiz] = useState(initialQuiz || null);
  const [loading, setLoading] = useState(!initialQuiz);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionIndex]: optionIndex }
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Fetch full quiz with questions when navigating from elsewhere
  useEffect(() => {
    if (!initialQuiz?.questions?.length && initialQuiz?.id) {
      fetchQuiz(initialQuiz.id);
    }
  }, []);

  const fetchQuiz = async (id) => {
    try {
      const { data } = await api.get(`/quiz/${id}`);
      setQuiz(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load quiz.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Handle hardware back button
  useEffect(() => {
    const onBack = () => {
      if (started) {
        Alert.alert(
          'Exit Quiz?',
          'Your progress will be lost if you go back.',
          [
            { text: 'Stay', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: () => { clearTimer(); navigation.goBack(); } }
          ]
        );
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [started]);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startQuiz = () => {
    if (!quiz?.canAttempt && quiz?.canAttempt !== undefined) {
      Alert.alert('No Attempts Left', `You have used all ${quiz.maxAttempts} attempts.`);
      return;
    }
    const secs = (quiz.timeLimit || 30) * 60;
    setTimeLeft(secs);
    startTimeRef.current = Date.now();
    setStarted(true);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearTimer(), []);

  const selectOption = (questionIndex, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    setShowSubmitModal(false);
    clearTimer();
    setSubmitting(true);

    const timeTaken = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0;

    const formattedAnswers = (quiz.questions || []).map((_, idx) => ({
      questionIndex: idx,
      selectedOption: answers[idx] !== undefined ? answers[idx] : -1,
    }));

    try {
      const { data } = await api.post(`/quiz/${quiz.id}/attempt`, {
        answers: formattedAnswers,
        timeTaken,
      });
      navigation.replace('QuizResults', {
        result: data,
        quiz,
        timeTaken,
      });
    } catch (err) {
      Alert.alert('Submission Error', err.response?.data?.message || 'Could not submit quiz. Please try again.');
      setSubmitting(false);
    }
  }, [quiz, answers]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.student} />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  if (!quiz) return null;

  const questions = quiz.questions || [];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const currentQ = questions[currentIndex];
  const timerPct = quiz.timeLimit ? (timeLeft / (quiz.timeLimit * 60)) * 100 : 100;
  const timerColor = timerPct > 50 ? colors.success : timerPct > 20 ? colors.warning : colors.danger;

  /* ── Pre-start screen ── */
  if (!started) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={colors.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.startContent}>
          <LinearGradient colors={colors.gradientStudent} style={styles.quizBanner}>
            <Flag size={36} color="#fff" />
            <Text style={styles.quizBannerTitle}>{quiz.title}</Text>
            {quiz.subjectId?.subjectName && (
              <Text style={styles.quizBannerSub}>{quiz.subjectId.subjectName}</Text>
            )}
          </LinearGradient>

          {/* Info cards */}
          <View style={styles.infoGrid}>
            <InfoBox label="Questions" value={totalQ} icon="📝" />
            <InfoBox label="Time Limit" value={`${quiz.timeLimit || 30} min`} icon="⏱️" />
            <InfoBox label="Passing Score" value={`${quiz.passingScore || 80}%`} icon="🎯" />
            <InfoBox label="Max Attempts" value={quiz.maxAttempts || 3} icon="🔁" />
          </View>

          {quiz.studentAttempts > 0 && (
            <View style={styles.attemptsWarning}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={styles.attemptsWarningText}>
                You have used {quiz.studentAttempts} of {quiz.maxAttempts || 3} attempts.
              </Text>
            </View>
          )}

          {quiz.description ? (
            <View style={styles.descCard}>
              <Text style={styles.descTitle}>About this Quiz</Text>
              <Text style={styles.descText}>{quiz.description}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.startBtn, quiz.canAttempt === false && styles.startBtnDisabled]}
            onPress={startQuiz}
            disabled={quiz.canAttempt === false}
            activeOpacity={0.85}
          >
            <LinearGradient colors={colors.gradientStudent} style={styles.startBtnGradient}>
              <Text style={styles.startBtnText}>
                {quiz.canAttempt === false ? 'No Attempts Remaining' : 'Start Quiz'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── Active quiz screen ── */
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={styles.quizHeader}>
        <View style={styles.progressPill}>
          <Text style={styles.progressText}>{currentIndex + 1} / {totalQ}</Text>
        </View>
        <View style={[styles.timerPill, { borderColor: timerColor + '44' }]}>
          <Clock size={14} color={timerColor} />
          <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(timeLeft)}</Text>
        </View>
        <TouchableOpacity
          style={styles.submitHeaderBtn}
          onPress={() => setShowSubmitModal(true)}
        >
          <Text style={styles.submitHeaderBtnText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / totalQ) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.questionContent} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>Question {currentIndex + 1}</Text>
          <Text style={styles.questionText}>{currentQ?.questionText}</Text>
          {currentQ?.difficulty && (
            <View style={[styles.diffTag, {
              backgroundColor: (currentQ.difficulty === 'easy' ? colors.success : currentQ.difficulty === 'hard' ? colors.danger : colors.warning) + '22'
            }]}>
              <Text style={[styles.diffTagText, {
                color: currentQ.difficulty === 'easy' ? colors.success : currentQ.difficulty === 'hard' ? colors.danger : colors.warning
              }]}>{currentQ.difficulty}</Text>
            </View>
          )}
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {(currentQ?.options || []).map((opt, optIdx) => {
            const selected = answers[currentIndex] === optIdx;
            const optText = typeof opt === 'string' ? opt : opt?.text || '';
            return (
              <TouchableOpacity
                key={optIdx}
                style={[
                  styles.optionCard,
                  selected && styles.optionCardSelected,
                ]}
                onPress={() => selectOption(currentIndex, optIdx)}
                activeOpacity={0.75}
              >
                <View style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  <Text style={[styles.optionLabelText, selected && { color: '#fff' }]}>
                    {OPTION_LABELS[optIdx]}
                  </Text>
                </View>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={4}>
                  {optText}
                </Text>
                {selected && <Check size={16} color={colors.student} style={{ flexShrink: 0 }} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Question dots */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dotsRow}>
          {questions.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dot,
                idx === currentIndex && styles.dotCurrent,
                answers[idx] !== undefined && styles.dotAnswered,
              ]}
              onPress={() => setCurrentIndex(idx)}
            >
              <Text style={[styles.dotText, (idx === currentIndex || answers[idx] !== undefined) && { color: '#fff' }]}>
                {idx + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={20} color={currentIndex === 0 ? colors.textMuted : colors.textPrimary} />
          <Text style={[styles.navBtnText, currentIndex === 0 && { color: colors.textMuted }]}>Prev</Text>
        </TouchableOpacity>

        <Text style={styles.answeredText}>{answeredCount}/{totalQ} answered</Text>

        {currentIndex < totalQ - 1 ? (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentIndex(i => Math.min(totalQ - 1, i + 1))}
          >
            <Text style={styles.navBtnText}>Next</Text>
            <ChevronRight size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnSubmit]}
            onPress={() => setShowSubmitModal(true)}
          >
            <Flag size={16} color={colors.student} />
            <Text style={[styles.navBtnText, { color: colors.student }]}>Finish</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submit Confirmation Modal */}
      <Modal visible={showSubmitModal} transparent animationType="fade" onRequestClose={() => setShowSubmitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Flag size={32} color={colors.student} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
            <Text style={styles.modalTitle}>Submit Quiz?</Text>
            <Text style={styles.modalDesc}>
              You've answered {answeredCount} out of {totalQ} questions.
              {answeredCount < totalQ ? `\n${totalQ - answeredCount} question(s) unanswered.` : '\nAll questions answered!'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSubmitModal(false)}>
                <Text style={styles.modalCancelText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                onPress={() => handleSubmit(false)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const InfoBox = ({ label, value, icon }) => (
  <View style={styles.infoBox}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={styles.infoValue}>{value}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary, gap: spacing.md },
  loadingText: { ...typography.base, color: colors.textSecondary },

  // Pre-start
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  backText: { ...typography.sm, color: colors.textSecondary, marginLeft: 4 },
  startContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  quizBanner: { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  quizBannerTitle: { ...typography.xl, ...typography.bold, color: '#fff', textAlign: 'center' },
  quizBannerSub: { ...typography.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  infoBox: { flex: 1, minWidth: '45%', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 4 },
  infoIcon: { fontSize: 20 },
  infoValue: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  infoLabel: { ...typography.xs, color: colors.textMuted },
  attemptsWarning: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warning + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.warning + '33', marginBottom: spacing.md },
  attemptsWarningText: { ...typography.sm, color: colors.warning, flex: 1 },
  descCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  descTitle: { ...typography.sm, ...typography.bold, color: colors.textSecondary, marginBottom: spacing.xs },
  descText: { ...typography.sm, color: colors.textPrimary, lineHeight: 20 },
  startBtn: { borderRadius: radius.lg, overflow: 'hidden' },
  startBtnDisabled: { opacity: 0.5 },
  startBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  startBtnText: { ...typography.base, ...typography.bold, color: '#fff' },

  // Quiz header
  quizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  progressPill: { backgroundColor: colors.bgElevated, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  progressText: { ...typography.sm, ...typography.semibold, color: colors.textPrimary },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bgElevated, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  timerText: { ...typography.sm, ...typography.bold, fontVariant: ['tabular-nums'] },
  submitHeaderBtn: { backgroundColor: colors.student + '22', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.md },
  submitHeaderBtnText: { ...typography.sm, ...typography.semibold, color: colors.student },
  progressBar: { height: 3, backgroundColor: colors.bgElevated },
  progressFill: { height: '100%', backgroundColor: colors.student },

  // Question
  questionContent: { padding: spacing.md },
  questionCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  questionLabel: { ...typography.xs, color: colors.textMuted, marginBottom: spacing.xs },
  questionText: { ...typography.base, ...typography.semibold, color: colors.textPrimary, lineHeight: 24 },
  diffTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, marginTop: spacing.sm },
  diffTagText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  // Options
  optionsContainer: { gap: spacing.sm, marginBottom: spacing.md },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1.5, borderColor: colors.border,
  },
  optionCardSelected: { borderColor: colors.student, backgroundColor: colors.student + '12' },
  optionLabel: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgElevated, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  optionLabelSelected: { backgroundColor: colors.student },
  optionLabelText: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  optionText: { flex: 1, ...typography.sm, color: colors.textPrimary, lineHeight: 20 },
  optionTextSelected: { color: colors.student },

  // Question dots
  dotsRow: { marginBottom: spacing.sm },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  dotCurrent: { backgroundColor: colors.student, borderColor: colors.student },
  dotAnswered: { backgroundColor: colors.success, borderColor: colors.success },
  dotText: { ...typography.xs, ...typography.semibold, color: colors.textMuted },

  // Bottom nav
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.border },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bgElevated },
  navBtnDisabled: { opacity: 0.4 },
  navBtnSubmit: { backgroundColor: colors.student + '22' },
  navBtnText: { ...typography.sm, ...typography.semibold, color: colors.textPrimary },
  answeredText: { ...typography.xs, color: colors.textMuted },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: colors.border },
  modalTitle: { ...typography.xl, ...typography.bold, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  modalDesc: { ...typography.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bgElevated, alignItems: 'center' },
  modalCancelText: { ...typography.sm, ...typography.semibold, color: colors.textSecondary },
  modalSubmitBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.student, alignItems: 'center' },
  modalSubmitText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default QuizAttemptScreen;
