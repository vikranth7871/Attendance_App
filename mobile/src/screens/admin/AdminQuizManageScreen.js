import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Award,
  Sparkles,
  Plus,
  Search,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Brain,
  Trophy,
  Building,
  X,
  ChevronRight,
  FileText,
  Check,
  AlertCircle,
  HelpCircle,
  Medal,
  User,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import AIQuizGeneratorModal from '../../components/AIQuizGeneratorModal';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

/* ─── Feedback Banner ─── */
const Banner = ({ type, message, onDismiss }) => {
  if (!message) return null;
  const isErr = type === 'error';
  return (
    <View style={[bs.wrap, isErr ? bs.err : bs.ok]}>
      {isErr ? <AlertCircle size={15} color="#EF4444" /> : <CheckCircle size={15} color="#10B981" />}
      <Text style={[bs.txt, { color: isErr ? '#EF4444' : '#10B981' }]}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={14} color={isErr ? '#EF4444' : '#10B981'} />
      </TouchableOpacity>
    </View>
  );
};

const bs = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginHorizontal: spacing.md, marginTop: spacing.sm },
  err:  { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  ok:   { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  txt:  { flex: 1, fontSize: 13, fontWeight: '600' },
});

const AdminQuizManageScreen = ({ navigation }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [quizTypeTab, setQuizTypeTab] = useState('practice'); // 'practice' | 'university'
  const [banner, setBanner] = useState({ type: '', message: '' });

  // Modals
  const [showAIModal, setShowAIModal] = useState(false);
  const [returnToFormAfterAI, setReturnToFormAfterAI] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsQuiz, setResultsQuiz] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsSearch, setResultsSearch] = useState('');

  // Form State for Manual Create / Edit
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    type: 'practice',
    timeLimit: '30',
    passingScore: '80',
    difficulty: 'mixed',
    maxAttempts: '3',
    questions: [],
  });

  // Question Editor state inside Form Modal
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQIndex, setEditingQIndex] = useState(null);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qExplanation, setQExplanation] = useState('');

  // Delete confirmation modal state
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [deletingQuiz, setDeletingQuiz] = useState(false);

  const showFeedback = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4000);
  };

  const fetchQuizzes = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const { data } = await api.get('/quiz/admin/manage');
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch quizzes error:', err);
      showFeedback('error', 'Failed to load quizzes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/admin/subjects');
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Fetch subjects error:', err);
    }
  };

  useEffect(() => {
    fetchQuizzes();
    fetchSubjects();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQuizzes(true);
    fetchSubjects();
  }, []);

  // Deduplicated unique subjects list for the selector
  const uniqueSubjects = useMemo(() => {
    const seen = new Set();
    const list = [];
    subjects.forEach(s => {
      const name = (s.subject_name || s.name || s.subjectName || '').trim();
      const key = name.toLowerCase();
      if (name && !seen.has(key)) {
        seen.add(key);
        list.push(s);
      }
    });
    return list;
  }, [subjects]);

  // Current selected subject object
  const currentSelectedSubject = useMemo(() => {
    return uniqueSubjects.find(s => (s.id || s._id) === formData.subjectId) || uniqueSubjects[0];
  }, [uniqueSubjects, formData.subjectId]);

  // Filter quizzes by current Tab and Search
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      const isPractice = quiz.type === 'practice' || !quiz.type;
      const isUniversity = quiz.type === 'university' || quiz.type === 'official';
      const matchesTab = quizTypeTab === 'practice' ? isPractice : isUniversity;

      if (!matchesTab) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      const titleMatch = quiz.title && quiz.title.toLowerCase().includes(q);
      const subName = quiz.subjectId?.subjectName || quiz.subjectId?.subject_name || quiz.subjectName || '';
      const subjectMatch = subName.toLowerCase().includes(q);

      return titleMatch || subjectMatch;
    });
  }, [quizzes, quizTypeTab, search]);

  // Tab counts
  const tabCounts = useMemo(() => {
    let practice = 0;
    let university = 0;
    quizzes.forEach(q => {
      if (q.type === 'university' || q.type === 'official') university++;
      else practice++;
    });
    return { practice, university };
  }, [quizzes]);

  // Toggle Publish
  const handleTogglePublish = async (quiz) => {
    const qId = quiz.id || quiz._id;
    try {
      await api.put('/quiz/' + qId + '/publish');
      setQuizzes(prev => prev.map(item => {
        if ((item.id || item._id) === qId) {
          return { ...item, isPublished: !item.isPublished };
        }
        return item;
      }));
      showFeedback('success', quiz.isPublished ? 'Quiz unpublished to draft.' : 'Quiz published live!');
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to toggle publish status.');
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = (quiz) => {
    setQuizToDelete(quiz);
  };

  const confirmDeleteQuiz = async () => {
    if (!quizToDelete) return;
    const qId = quizToDelete.id || quizToDelete._id;
    setDeletingQuiz(true);
    try {
      await api.delete('/quiz/' + qId);
      setQuizzes(prev => prev.filter(item => (item.id || item._id) !== qId));
      showFeedback('success', 'Quiz deleted successfully.');
      setQuizToDelete(null);
    } catch (err) {
      console.error('Delete quiz error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to delete quiz.');
    } finally {
      setDeletingQuiz(false);
    }
  };

  // Open Results / Leaderboard Modal
  const handleOpenResults = async (quiz) => {
    setResultsQuiz(quiz);
    setResultsSearch('');
    setShowResultsModal(true);
    setResultsLoading(true);
    try {
      const qId = quiz.id || quiz._id;
      const { data } = await api.get('/quiz/' + qId + '/leaderboard');
      setLeaderboardData(data?.leaderboard || []);
    } catch (err) {
      console.error('Fetch leaderboard error:', err);
      setLeaderboardData([]);
    } finally {
      setResultsLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingQuiz(null);
    setFormData({
      title: '',
      description: '',
      subjectId: uniqueSubjects[0]?.id || uniqueSubjects[0]?._id || '',
      type: quizTypeTab,
      timeLimit: '30',
      passingScore: '80',
      difficulty: 'mixed',
      maxAttempts: '3',
      questions: [],
    });
    setShowQuestionEditor(false);
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      title: quiz.title || '',
      description: quiz.description || '',
      subjectId: quiz.subjectId?._id || quiz.subjectId?.id || quiz.subject_id || (uniqueSubjects[0]?.id || ''),
      type: quiz.type || quizTypeTab,
      timeLimit: String(quiz.timeLimit || quiz.time_limit || 30),
      passingScore: String(quiz.passingScore || quiz.passing_score || 80),
      difficulty: quiz.difficulty || 'mixed',
      maxAttempts: String(quiz.maxAttempts || quiz.max_attempts || 3),
      questions: Array.isArray(quiz.questions) ? quiz.questions : [],
    });
    setShowQuestionEditor(false);
    setShowFormModal(true);
  };

  // Open AI Generator from inside Create/Edit Form
  const handleOpenAIFromForm = () => {
    setReturnToFormAfterAI(true);
    setShowFormModal(false);
    setShowAIModal(true);
  };

  const handleCloseAIModal = () => {
    setShowAIModal(false);
    if (returnToFormAfterAI) {
      setShowFormModal(true);
      setReturnToFormAfterAI(false);
    }
  };

  // AI Generated callback -> Pre-populate Form Modal
  const handleAIGenerated = (result) => {
    const matchedSubject = uniqueSubjects.find(
      s => (s.subject_name || s.name || '').toLowerCase() === (result.subject || '').toLowerCase()
    );

    setFormData(prev => ({
      ...prev,
      title: prev.title || result.title || (result.subject ? result.subject + ' Quiz' : 'New Quiz'),
      description: prev.description || ('Generated with AI on ' + new Date().toLocaleDateString()),
      subjectId: prev.subjectId || matchedSubject?.id || uniqueSubjects[0]?.id || '',
      type: quizTypeTab,
      timeLimit: prev.timeLimit || '30',
      passingScore: prev.passingScore || '80',
      difficulty: result.difficulty || prev.difficulty || 'mixed',
      maxAttempts: prev.maxAttempts || '3',
      questions: [...prev.questions, ...(result.questions || [])],
    }));

    setShowAIModal(false);
    setShowFormModal(true);
    setReturnToFormAfterAI(false);
    showFeedback('success', 'Added ' + (result.questions?.length || 0) + ' AI questions to quiz!');
  };

  // Question Management inside Form Modal
  const handleOpenAddQuestion = () => {
    setEditingQIndex(null);
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrectIdx(0);
    setQExplanation('');
    setShowQuestionEditor(true);
  };

  const handleOpenEditQuestion = (index) => {
    const q = formData.questions[index];
    setEditingQIndex(index);
    setQText(q.questionText || '');
    setQOptions((q.options || []).map(o => typeof o === 'string' ? o : o.text || ''));
    const correct = (q.options || []).findIndex(o => typeof o === 'object' && o.isCorrect);
    setQCorrectIdx(correct >= 0 ? correct : 0);
    setQExplanation(q.explanation || '');
    setShowQuestionEditor(true);
  };

  const handleSaveQuestion = () => {
    if (!qText.trim()) {
      Alert.alert('Question Required', 'Please provide question text.');
      return;
    }
    if (qOptions.some(opt => !opt.trim())) {
      Alert.alert('Incomplete Options', 'All 4 multiple-choice options must be filled.');
      return;
    }

    const formattedOptions = qOptions.map((opt, i) => ({
      text: opt.trim(),
      isCorrect: i === qCorrectIdx,
    }));

    const newQ = {
      questionText: qText.trim(),
      options: formattedOptions,
      explanation: qExplanation.trim(),
      difficulty: formData.difficulty || 'mixed',
    };

    setFormData(prev => {
      const nextQ = [...prev.questions];
      if (editingQIndex !== null) {
        nextQ[editingQIndex] = newQ;
      } else {
        nextQ.push(newQ);
      }
      return { ...prev, questions: nextQ };
    });

    setShowQuestionEditor(false);
  };

  const handleDeleteQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  // Save Quiz (Create or Update)
  const handleSaveQuiz = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Title Required', 'Please enter a quiz title.');
      return;
    }
    if (formData.questions.length === 0) {
      Alert.alert('No Questions', 'Please add at least 1 question (manually or via AI) to the quiz.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        subjectId: formData.subjectId || undefined,
        type: formData.type,
        timeLimit: parseInt(formData.timeLimit, 10) || 30,
        passingScore: parseInt(formData.passingScore, 10) || 80,
        difficulty: formData.difficulty,
        maxAttempts: parseInt(formData.maxAttempts, 10) || 3,
        questions: formData.questions,
        isPublished: editingQuiz ? editingQuiz.isPublished : true,
      };

      if (editingQuiz) {
        const qId = editingQuiz.id || editingQuiz._id;
        await api.put('/quiz/' + qId, payload);
        showFeedback('success', 'Quiz updated successfully!');
      } else {
        await api.post('/quiz/create', payload);
        showFeedback('success', 'Quiz created and published!');
      }

      setShowFormModal(false);
      fetchQuizzes(true);
    } catch (err) {
      console.error('Save quiz error:', err);
      Alert.alert('Save Failed', err.response?.data?.message || 'Could not save quiz.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ─── Screen Header (Clean & Un-cramped) ─── */}
      <Header
        title="Subject Wise Quizzes"
        subtitle="Manage & generate quizzes for your institution"
        showBack
        navigation={navigation}
      />

      <Banner
        type={banner.type}
        message={banner.message}
        onDismiss={() => setBanner({ type: '', message: '' })}
      />

      {/* ─── Top Segmented Tab Switcher (Parity with Web) ─── */}
      <View style={styles.tabContainer}>
        <View style={styles.tabPillsWrap}>
          {/* Practice Quizzes Tab */}
          <TouchableOpacity
            style={[
              styles.tabPill,
              quizTypeTab === 'practice' && styles.tabPillActivePractice,
            ]}
            onPress={() => setQuizTypeTab('practice')}
            activeOpacity={0.8}
          >
            <Brain
              size={15}
              color={quizTypeTab === 'practice' ? '#fff' : colors.textMuted}
            />
            <Text
              style={[
                styles.tabPillText,
                quizTypeTab === 'practice' && styles.tabPillTextActive,
              ]}
            >
              Practice Quizzes ({tabCounts.practice})
            </Text>
          </TouchableOpacity>

          {/* University Quizzes Tab */}
          <TouchableOpacity
            style={[
              styles.tabPill,
              quizTypeTab === 'university' && styles.tabPillActiveUniversity,
            ]}
            onPress={() => setQuizTypeTab('university')}
            activeOpacity={0.8}
          >
            <Trophy
              size={15}
              color={quizTypeTab === 'university' ? '#fff' : colors.textMuted}
            />
            <Text
              style={[
                styles.tabPillText,
                quizTypeTab === 'university' && styles.tabPillTextActive,
              ]}
            >
              University Quizzes ({tabCounts.university})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Search Bar ─── */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search quizzes by title or subject..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={15} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Quiz Card List ─── */}
      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(3)].map((_, i) => (
            <CardSkeleton key={i} style={{ marginBottom: spacing.sm, height: 160 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredQuizzes}
          keyExtractor={(item, i) => (item.id || item._id || i).toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BookOpen size={44} color={colors.textMuted} style={{ opacity: 0.4, marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>
                No {quizTypeTab === 'practice' ? 'Practice' : 'University'} Quizzes Found
              </Text>
              <Text style={styles.emptySub}>
                Tap the "+" button below to create your first quiz.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isUniv = item.type === 'university' || item.type === 'official';
            const subjectName =
              item.subjectId?.subjectName ||
              item.subjectId?.subject_name ||
              item.subjectName ||
              'General';

            return (
              <View style={[styles.quizCard, shadows.sm]}>
                {/* Top-Right Quiz Type Badge (Matching Web Screenshot) */}
                <View
                  style={[
                    styles.typeCornerBadge,
                    isUniv ? styles.typeCornerUniv : styles.typeCornerPractice,
                  ]}
                >
                  {isUniv ? (
                    <Building size={10} color="#fff" />
                  ) : (
                    <Brain size={10} color="#fff" />
                  )}
                  <Text style={styles.typeCornerText}>
                    {isUniv ? 'UNIVERSITY' : 'PRACTICE'}
                  </Text>
                </View>

                {/* Card Header: Title & Subject & Status */}
                <View style={styles.cardHeaderArea}>
                  <Text style={styles.quizTitle} numberOfLines={1}>
                    {item.title}
                  </Text>

                  <View style={styles.subjectAndStatusRow}>
                    {/* Subject Pill */}
                    <View style={styles.subjectPill}>
                      <Text style={styles.subjectPillText} numberOfLines={1}>
                        {subjectName}
                      </Text>
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        item.isPublished ? styles.statusPillPub : styles.statusPillDraft,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: item.isPublished ? colors.success : colors.warning },
                        ]}
                      >
                        {item.isPublished ? 'Published' : 'Draft'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Card Meta Stats */}
                <View style={styles.metaInfoRow}>
                  <Text style={styles.metaInfoText}>
                    {item.questionCount || item.questions?.length || 0} Questions
                  </Text>
                  <Text style={styles.metaBullet}>•</Text>
                  <Text style={styles.metaInfoText}>
                    {item.totalAttempts ?? item.total_attempts ?? 0} Attempts
                  </Text>
                  <Text style={styles.metaBullet}>•</Text>
                  <Text style={styles.metaInfoText}>
                    {item.difficulty ? item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1) : 'Mixed'}
                  </Text>
                </View>

                {/* Card Actions Footer (Results, Unpublish, Edit, Delete) */}
                <View style={styles.cardActionsFooter}>
                  {/* Results Button */}
                  <TouchableOpacity
                    style={styles.footerResultsBtn}
                    onPress={() => handleOpenResults(item)}
                    activeOpacity={0.7}
                  >
                    <Award size={13} color={colors.primary} />
                    <Text style={styles.footerResultsBtnText}>Results</Text>
                  </TouchableOpacity>

                  {/* Publish / Unpublish Button */}
                  <TouchableOpacity
                    style={[
                      styles.footerToggleBtn,
                      item.isPublished ? styles.footerUnpublishBtn : styles.footerPublishBtn,
                    ]}
                    onPress={() => handleTogglePublish(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.footerToggleBtnText,
                        { color: item.isPublished ? colors.textSecondary : colors.success },
                      ]}
                    >
                      {item.isPublished ? 'Unpublish' : 'Publish'}
                    </Text>
                  </TouchableOpacity>

                  {/* Edit Button */}
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => handleOpenEditModal(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Edit3 size={15} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={[styles.iconActionBtn, styles.deleteActionBtn]}
                    onPress={() => handleDeleteQuiz(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Trash2 size={15} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ─── Floating Action Button (FAB) for Manual Create ─── */}
      <TouchableOpacity
        style={[styles.fab, shadows.lg]}
        onPress={handleOpenCreateModal}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* ─── AI Quiz Generator Modal ─── */}
      <AIQuizGeneratorModal
        visible={showAIModal}
        onClose={handleCloseAIModal}
        onGenerated={handleAIGenerated}
        defaultSubject={currentSelectedSubject?.subject_name || currentSelectedSubject?.name || ''}
      />

      {/* ─── Results & Leaderboard Modal ─── */}
      <Modal
        visible={showResultsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResultsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.resultsModalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Award size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    Quiz Leaderboard & Results
                  </Text>
                  <Text style={styles.modalSubTitle} numberOfLines={1}>
                    {resultsQuiz?.title} (Passing: {resultsQuiz?.passingScore || 80}%)
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowResultsModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Results Search */}
            <View style={styles.resultsSearchRow}>
              <Search size={14} color={colors.textMuted} />
              <TextInput
                style={styles.resultsSearchInput}
                placeholder="Search student by name or roll..."
                placeholderTextColor={colors.textMuted}
                value={resultsSearch}
                onChangeText={setResultsSearch}
              />
            </View>

            {resultsLoading ? (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
                  Loading attempts leaderboard...
                </Text>
              </View>
            ) : leaderboardData.length === 0 ? (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <Trophy size={36} color={colors.textMuted} style={{ opacity: 0.3, marginBottom: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>
                  No Attempts Yet
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>
                  Students have not submitted any attempts for this quiz.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 16 }}>
                {leaderboardData
                  .filter(entry => {
                    const q = resultsSearch.toLowerCase();
                    return !q ||
                      (entry.name && entry.name.toLowerCase().includes(q)) ||
                      (entry.rollNumber && entry.rollNumber.toLowerCase().includes(q));
                  })
                  .map((entry, idx) => {
                    const passing = (resultsQuiz?.passingScore || 80);
                    const isPassed = (entry.percentage || 0) >= passing;
                    return (
                      <View key={entry.id || idx} style={styles.leaderboardRow}>
                        {/* Rank Badge */}
                        <View style={[styles.rankBadge, idx === 0 && styles.rank1, idx === 1 && styles.rank2, idx === 2 && styles.rank3]}>
                          <Text style={[styles.rankText, idx < 3 && { color: '#fff', fontWeight: '800' }]}>
                            #{idx + 1}
                          </Text>
                        </View>

                        {/* Student Details */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.leaderboardStudentName} numberOfLines={1}>
                            {entry.name || 'Student'}
                          </Text>
                          <Text style={styles.leaderboardSub} numberOfLines={1}>
                            {entry.rollNumber || 'N/A'} • {entry.department || 'Academics'}
                          </Text>
                        </View>

                        {/* Score & Status */}
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.leaderboardScore, { color: isPassed ? colors.success : colors.danger }]}>
                            {entry.percentage || 0}%
                          </Text>
                          <Text style={styles.leaderboardMeta}>
                            {entry.score || 0}/{entry.totalQuestions || 0} Qs
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowResultsModal(false)}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Manual Create & Edit Quiz Modal Card ─── */}
      <Modal
        visible={showFormModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFormModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.formModalCard, shadows.lg]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Edit3 size={18} color={colors.primary} />
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 470 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* ─── AI Generation Banner INSIDE This Card ─── */}
              <TouchableOpacity
                style={styles.aiCardBanner}
                onPress={handleOpenAIFromForm}
                activeOpacity={0.85}
              >
                <View style={styles.aiBannerIconWrap}>
                  <Sparkles size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiBannerTitle}>Generate with AI</Text>
                  <Text style={styles.aiBannerSub}>
                    Auto-generate multiple-choice questions from syllabus
                  </Text>
                </View>
                <ChevronRight size={16} color="#c084fc" />
              </TouchableOpacity>

              {/* Title Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quiz Title *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Python Fundamentals Quiz"
                  placeholderTextColor={colors.textMuted}
                  value={formData.title}
                  onChangeText={(v) => setFormData(p => ({ ...p, title: v }))}
                />
              </View>

              {/* Subject Selector (Deduplicated) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {uniqueSubjects.map(s => {
                    const sId = s.id || s._id;
                    const sName = s.subject_name || s.name || s.subjectName || 'Subject';
                    const isSel = formData.subjectId === sId;
                    return (
                      <TouchableOpacity
                        key={sId}
                        style={[styles.chipSelect, isSel && styles.chipSelectActive]}
                        onPress={() => setFormData(p => ({ ...p, subjectId: sId }))}
                      >
                        <Text style={[styles.chipSelectText, isSel && styles.chipSelectTextActive]}>
                          {sName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Type Pill Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quiz Type</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.typeOptionBtn,
                      formData.type === 'practice' && styles.typeOptionBtnActive,
                    ]}
                    onPress={() => setFormData(p => ({ ...p, type: 'practice' }))}
                  >
                    <Brain size={14} color={formData.type === 'practice' ? '#fff' : colors.textMuted} />
                    <Text style={[styles.typeOptionText, formData.type === 'practice' && { color: '#fff' }]}>
                      Practice
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeOptionBtn,
                      formData.type === 'university' && styles.typeOptionBtnActiveUniv,
                    ]}
                    onPress={() => setFormData(p => ({ ...p, type: 'university' }))}
                  >
                    <Building size={14} color={formData.type === 'university' ? '#fff' : colors.textMuted} />
                    <Text style={[styles.typeOptionText, formData.type === 'university' && { color: '#fff' }]}>
                      University
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Timing & Passing Score Row */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Time Limit (Mins)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={formData.timeLimit}
                    onChangeText={(v) => setFormData(p => ({ ...p, timeLimit: v }))}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Passing Score (%)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={formData.passingScore}
                    onChangeText={(v) => setFormData(p => ({ ...p, passingScore: v }))}
                  />
                </View>
              </View>

              {/* Questions Section Header */}
              <View style={styles.qSectionHeader}>
                <Text style={styles.qSectionTitle}>
                  Questions ({formData.questions.length})
                </Text>
                {/* Add Question Button */}
                <TouchableOpacity
                  style={styles.addQBtn}
                  onPress={handleOpenAddQuestion}
                  activeOpacity={0.8}
                >
                  <Plus size={13} color="#fff" />
                  <Text style={styles.addQBtnText}>Add Question</Text>
                </TouchableOpacity>
              </View>

              {/* Question Item Cards */}
              {formData.questions.map((q, idx) => (
                <View key={idx} style={styles.questionItemCard}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.questionItemTitle} numberOfLines={2}>
                      Q{idx + 1}. {q.questionText}
                    </Text>
                    <Text style={styles.questionItemSub}>
                      4 Choices • Correct: Option {String.fromCharCode(65 + ((q.options || []).findIndex(o => typeof o === 'object' && o.isCorrect) >= 0 ? (q.options || []).findIndex(o => typeof o === 'object' && o.isCorrect) : 0))}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.qActionBtn}
                      onPress={() => handleOpenEditQuestion(idx)}
                    >
                      <Edit3 size={13} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.qActionBtn, { borderColor: colors.danger + '40' }]}
                      onPress={() => handleDeleteQuestion(idx)}
                    >
                      <Trash2 size={13} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowFormModal(false)}
                disabled={formSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, formSubmitting && { opacity: 0.7 }]}
                onPress={handleSaveQuiz}
                disabled={formSubmitting}
              >
                {formSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>
                    {editingQuiz ? 'Update Quiz' : 'Publish Quiz'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Question Editor Modal (Nested inside Form) ─── */}
      <Modal
        visible={showQuestionEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuestionEditor(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.qEditorCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingQIndex !== null ? ('Edit Question #' + (editingQIndex + 1)) : 'New Question'}
              </Text>
              <TouchableOpacity onPress={() => setShowQuestionEditor(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Question Text *</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 60 }]}
                  multiline
                  placeholder="Enter the question..."
                  placeholderTextColor={colors.textMuted}
                  value={qText}
                  onChangeText={setQText}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 4 }]}>
                Multiple Choice Options (Select radio for correct answer)
              </Text>
              {['A', 'B', 'C', 'D'].map((label, optIdx) => {
                const isCorrect = qCorrectIdx === optIdx;
                return (
                  <View key={label} style={styles.optionInputRow}>
                    <TouchableOpacity
                      style={[styles.optionRadioBtn, isCorrect && styles.optionRadioBtnActive]}
                      onPress={() => setQCorrectIdx(optIdx)}
                    >
                      <Text style={[styles.optionRadioText, isCorrect && { color: '#fff' }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[
                        styles.modalInput,
                        { flex: 1 },
                        isCorrect && { borderColor: colors.success + '80', backgroundColor: colors.success + '10' }
                      ]}
                      placeholder={'Option ' + label}
                      placeholderTextColor={colors.textMuted}
                      value={qOptions[optIdx]}
                      onChangeText={(txt) => {
                        const next = [...qOptions];
                        next[optIdx] = txt;
                        setQOptions(next);
                      }}
                    />
                  </View>
                );
              })}

              <View style={[styles.inputGroup, { marginTop: 8 }]}>
                <Text style={styles.inputLabel}>Explanation (Optional)</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 48 }]}
                  multiline
                  placeholder="Explain why this choice is correct..."
                  placeholderTextColor={colors.textMuted}
                  value={qExplanation}
                  onChangeText={setQExplanation}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowQuestionEditor(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveQuestion}
              >
                <Text style={styles.modalSaveBtnText}>Save Question</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Delete Confirmation Modal ─── */}
      <Modal
        visible={!!quizToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => !deletingQuiz && setQuizToDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.deleteModalCard, shadows.lg]}>
            <View style={styles.deleteIconWrap}>
              <Trash2 size={26} color={colors.danger} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Quiz?</Text>
            <Text style={styles.deleteModalMsg}>
              Are you sure you want to delete{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                "{quizToDelete?.title || 'this quiz'}"
              </Text>
              ? All questions, student attempts, and scores will be permanently erased.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={() => setQuizToDelete(null)}
                disabled={deletingQuiz}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deletingQuiz && { opacity: 0.7 }]}
                onPress={confirmDeleteQuiz}
                disabled={deletingQuiz}
                activeOpacity={0.8}
              >
                {deletingQuiz ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Trash2 size={15} color="#fff" />
                    <Text style={styles.deleteConfirmBtnText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  /* Tab Switcher */
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  tabPillsWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  tabPillActivePractice: {
    backgroundColor: colors.primary,
  },
  tabPillActiveUniversity: {
    backgroundColor: '#7c3aed',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabPillTextActive: {
    color: '#fff',
  },

  /* Search */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },

  /* List */
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
    gap: spacing.sm,
  },

  /* Quiz Card */
  quizCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  typeCornerBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 10,
  },
  typeCornerPractice: {
    backgroundColor: '#0284c7',
  },
  typeCornerUniv: {
    backgroundColor: '#7c3aed',
  },
  typeCornerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  cardHeaderArea: {
    paddingTop: 4,
    marginBottom: 8,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    paddingRight: 80, // Avoid overlapping corner badge
  },
  subjectAndStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subjectPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a78bfa',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusPillPub: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusPillDraft: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metaInfoText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  metaBullet: {
    fontSize: 12,
    color: colors.textMuted,
  },

  cardActionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border + '60',
    paddingTop: 10,
  },
  footerResultsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  footerResultsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  footerToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  footerUnpublishBtn: {
    borderColor: colors.border,
    backgroundColor: colors.bgPrimary,
  },
  footerPublishBtn: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  footerToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
  },
  deleteActionBtn: {
    borderColor: colors.danger + '35',
    backgroundColor: colors.danger + '10',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  /* Floating Action Button */
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Modals Common */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  resultsModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formModalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qEditorCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  /* AI Banner Inside Modal Card */
  aiCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    borderRadius: radius.md,
    padding: 10,
    marginBottom: spacing.sm,
  },
  aiBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c084fc',
  },
  aiBannerSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* Results Modal */
  resultsSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    gap: 6,
  },
  resultsSearchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rank1: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  rank2: { backgroundColor: '#94a3b8', borderColor: '#94a3b8' },
  rank3: { backgroundColor: '#b45309', borderColor: '#b45309' },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  leaderboardStudentName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  leaderboardSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  leaderboardScore: {
    fontSize: 14,
    fontWeight: '800',
  },
  leaderboardMeta: {
    fontSize: 10,
    color: colors.textMuted,
  },
  closeModalBtn: {
    backgroundColor: colors.bgPrimary,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  /* Form Inputs */
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipSelect: {
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelectActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  chipSelectText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipSelectTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  typeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bgPrimary,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeOptionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeOptionBtnActiveUniv: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  /* Questions Builder */
  qSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  qSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  addQBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  addQBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  questionItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
    gap: 8,
  },
  questionItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  questionItemSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  qActionBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },

  /* Question Editor */
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  optionRadioBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
  },
  optionRadioBtnActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  optionRadioText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },

  /* Footer Actions */
  modalFooterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  /* Delete Confirmation Modal */
  deleteModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  deleteModalMsg: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
  },
  deleteCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

export default AdminQuizManageScreen;
