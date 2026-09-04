import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays, Plus, Clock, Award, Check, X,
  FileSpreadsheet, Users
} from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const calculateGrade = (marks, maxMarks = 100) => {
  if (marks === '' || isNaN(marks)) return '';
  const num = parseFloat(marks);
  const max = parseFloat(maxMarks) || 100;
  const pct = (num / max) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

const TeacherExamsScreen = ({ navigation }) => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rosterGroups, setRosterGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Schedule Modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '', subject_id: '', exam_date: '', start_time: '', end_time: '', max_marks: '100', exam_type: 'midterm'
  });

  // Marks Entry Modal
  const [selectedExamForMarks, setSelectedExamForMarks] = useState(null);
  const [studentMarksData, setStudentMarksData] = useState([]);
  const [savingMarks, setSavingMarks] = useState(false);

  const fetchData = async () => {
    try {
      const [examRes, subjRes, rosterRes] = await Promise.all([
        api.get('/teacher/exams').catch(() => ({ data: [] })),
        api.get('/teacher/subjects').catch(() => ({ data: [] })),
        api.get('/teacher/roster').catch(() => ({ data: [] })),
      ]);
      setExams(examRes.data || []);
      setSubjects(subjRes.data || []);
      setRosterGroups(rosterRes.data || []);

      if (subjRes.data?.length > 0 && !form.subject_id) {
        setForm(f => ({ ...f, subject_id: subjRes.data[0].subject_id || subjRes.data[0].id }));
      }
    } catch (err) {
      console.error('Exams fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.exam_date.trim()) {
      Alert.alert('Missing Fields', 'Title and exam date (YYYY-MM-DD) are required.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/teacher/exams', form);
      setShowCreate(false);
      setForm({ title: '', subject_id: subjects[0]?.subject_id || subjects[0]?.id || '', exam_date: '', start_time: '', end_time: '', max_marks: '100', exam_type: 'midterm' });
      Alert.alert('✅ Created', 'Exam scheduled successfully.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create exam.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenMarksModal = (exam) => {
    setSelectedExamForMarks(exam);

    // Find students for this exam's subject from rosterGroups
    const examSubjId = exam.subject_id || exam.subjectId;
    let studentsFound = [];

    const matchedGroup = rosterGroups.find(g => {
      const gSubId = g.subject?.id || g.subject?._id;
      return String(gSubId) === String(examSubjId);
    });

    if (matchedGroup && matchedGroup.students?.length > 0) {
      studentsFound = matchedGroup.students;
    } else if (rosterGroups.length > 0 && rosterGroups[0].students?.length > 0) {
      // Fallback to first available roster group
      studentsFound = rosterGroups[0].students;
    }

    const marksInit = studentsFound.map(st => ({
      studentId: st.id,
      name: st.name,
      rollNumber: st.rollNumber || st.roll_number || '',
      marksObtained: '',
      grade: '',
      remarks: '',
    }));

    setStudentMarksData(marksInit);
  };

  const updateStudentMark = (index, value) => {
    setStudentMarksData(prev => {
      const copy = [...prev];
      const maxMarks = selectedExamForMarks?.max_marks || 100;
      copy[index] = {
        ...copy[index],
        marksObtained: value,
        grade: calculateGrade(value, maxMarks),
      };
      return copy;
    });
  };

  const updateStudentRemark = (index, value) => {
    setStudentMarksData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], remarks: value };
      return copy;
    });
  };

  const handleSubmitMarks = async () => {
    if (!selectedExamForMarks) return;

    const validEntries = studentMarksData.filter(
      s => s.marksObtained !== undefined && s.marksObtained !== ''
    );

    if (validEntries.length === 0) {
      Alert.alert('No Marks Entered', 'Please enter marks for at least one student.');
      return;
    }

    setSavingMarks(true);
    try {
      const payload = {
        examScheduleId: selectedExamForMarks.id,
        subjectId: selectedExamForMarks.subject_id || selectedExamForMarks.subjectId,
        marksData: validEntries.map(s => ({
          studentId: s.studentId,
          marksObtained: parseFloat(s.marksObtained),
          grade: s.grade,
          remarks: s.remarks,
        })),
      };

      const { data } = await api.post('/teacher/exams/marks-bulk', payload);

      Alert.alert('✅ Marks Published', data?.message || 'Exam marks published successfully.');
      setSelectedExamForMarks(null);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit exam marks.');
    } finally {
      setSavingMarks(false);
    }
  };

  if (loading) return <FullPageLoader message="Loading exams & schedules..." />;

  const examTypes = ['midterm', 'final', 'quiz', 'assignment', 'practical'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Exams & Evaluations"
        subtitle={`${exams.length} exams on file`}
        navigation={navigation}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Plus size={18} color={colors.teacher} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={exams}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={[styles.card, shadows.sm]}>
            <View style={styles.cardTop}>
              <CalendarDays size={18} color={colors.teacher} />
              <Text style={styles.examTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.typeBadge, { backgroundColor: colors.teacher + '22' }]}>
                <Text style={[styles.typeText, { color: colors.teacher }]}>{item.exam_type || 'exam'}</Text>
              </View>
            </View>

            <Text style={styles.subjectName}>{item.subject_name || item.subject?.name || 'Assigned Subject'}</Text>

            <View style={styles.detailRow}>
              <CalendarDays size={13} color={colors.textMuted} />
              <Text style={styles.detailText}>
                {item.exam_date ? new Date(item.exam_date).toLocaleDateString() : '—'}
              </Text>
              {item.start_time && (
                <>
                  <Clock size={13} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                  <Text style={styles.detailText}>{item.start_time} – {item.end_time || '?'}</Text>
                </>
              )}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.marks}>Max Marks: {item.max_marks || 100}</Text>
              <TouchableOpacity
                style={styles.enterMarksBtn}
                onPress={() => handleOpenMarksModal(item)}
              >
                <Award size={14} color="#fff" />
                <Text style={styles.enterMarksBtnText}>Enter Marks</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <CalendarDays size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No exams scheduled yet</Text>
          </View>
        }
      />

      {/* Schedule Exam Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <ScrollView style={styles.sheet} onStartShouldSetResponder={() => true} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Schedule Exam</Text>

            {[
              { label: 'Exam Title *', key: 'title', placeholder: 'Midterm Examination' },
              { label: 'Exam Date * (YYYY-MM-DD)', key: 'exam_date', placeholder: '2025-12-01' },
              { label: 'Start Time (HH:MM)', key: 'start_time', placeholder: '09:00' },
              { label: 'End Time (HH:MM)', key: 'end_time', placeholder: '11:00' },
              { label: 'Max Marks', key: 'max_marks', placeholder: '100', keyboardType: 'numeric' },
            ].map(field => (
              <View key={field.key}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[field.key]}
                  onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={field.keyboardType || 'default'}
                />
              </View>
            ))}

            <Text style={styles.label}>Exam Type</Text>
            <View style={styles.typeRow}>
              {examTypes.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.exam_type === t && styles.typeChipActive]}
                  onPress={() => setForm(f => ({ ...f, exam_type: t }))}
                >
                  <Text style={[styles.typeChipText, form.exam_type === t && { color: colors.teacher }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Subject</Text>
            <View style={styles.typeRow}>
              {subjects.map((s, i) => {
                const sid = s.subject_id || s.id;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.typeChip, form.subject_id === sid && styles.typeChipActive]}
                    onPress={() => setForm(f => ({ ...f, subject_id: sid }))}
                  >
                    <Text style={[styles.typeChipText, form.subject_id === sid && { color: colors.teacher }]}>
                      {s.subject_name || s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.createBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
              {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createBtnText}>Schedule Exam</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </TouchableOpacity>
      </Modal>

      {/* Enter Marks Modal */}
      <Modal
        visible={!!selectedExamForMarks}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedExamForMarks(null)}
      >
        <SafeAreaView style={styles.marksModalContainer}>
          <View style={styles.marksModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.marksModalTitle}>Enter Exam Marks</Text>
              <Text style={styles.marksModalSub}>
                {selectedExamForMarks?.title} (Max: {selectedExamForMarks?.max_marks || 100})
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedExamForMarks(null)}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {studentMarksData.length === 0 ? (
            <View style={styles.emptyMarks}>
              <Users size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No students found enrolled for this subject.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.marksList} keyboardShouldPersistTaps="handled">
              {studentMarksData.map((st, idx) => (
                <View key={st.studentId || idx} style={styles.markEntryRow}>
                  <View style={styles.markStudentInfo}>
                    <Text style={styles.markStudentName}>{st.name}</Text>
                    {st.rollNumber ? (
                      <Text style={styles.markRoll}>{st.rollNumber}</Text>
                    ) : null}
                  </View>

                  <View style={styles.markInputGroup}>
                    <TextInput
                      style={styles.markInput}
                      placeholder="Marks"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={st.marksObtained}
                      onChangeText={(val) => updateStudentMark(idx, val)}
                    />
                    <View style={[styles.gradeBadge, st.grade ? { backgroundColor: colors.teacher + '22' } : null]}>
                      <Text style={[styles.gradeText, st.grade ? { color: colors.teacher } : { color: colors.textMuted }]}>
                        {st.grade || '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {studentMarksData.length > 0 && (
            <View style={styles.marksModalBottom}>
              <TouchableOpacity
                style={[styles.publishMarksBtn, savingMarks && { opacity: 0.6 }]}
                onPress={handleSubmitMarks}
                disabled={savingMarks}
              >
                {savingMarks ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.publishMarksText}>Submit & Publish Marks</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  addBtn: { padding: spacing.sm, backgroundColor: colors.teacher + '22', borderRadius: radius.md },
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  examTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  typeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  subjectName: { ...typography.sm, color: colors.textMuted, marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  detailText: { ...typography.xs, color: colors.textSecondary },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: 2,
  },
  marks: { ...typography.xs, color: colors.textMuted },
  enterMarksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.teacher,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  enterMarksBtnText: { ...typography.xs, ...typography.bold, color: '#fff' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  // Modal Styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { ...typography.xl, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  label: { ...typography.sm, ...typography.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.textPrimary, ...typography.base, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  typeChip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { borderColor: colors.teacher, backgroundColor: colors.teacher + '22' },
  typeChipText: { ...typography.sm, color: colors.textMuted, textTransform: 'capitalize' },
  createBtn: { backgroundColor: colors.teacher, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: spacing.sm },
  createBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
  // Marks Modal
  marksModalContainer: { flex: 1, backgroundColor: colors.bgPrimary },
  marksModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  marksModalTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  marksModalSub: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  closeBtn: { padding: spacing.xs },
  emptyMarks: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  marksList: { padding: spacing.md, paddingBottom: 100 },
  markEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markStudentInfo: { flex: 1, paddingRight: spacing.sm },
  markStudentName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  markRoll: { ...typography.xs, color: colors.teacher, marginTop: 2 },
  markInputGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markInput: {
    width: 70,
    backgroundColor: colors.bgInput,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...typography.base,
    textAlign: 'center',
    paddingVertical: 6,
  },
  gradeBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gradeText: { ...typography.sm, ...typography.bold },
  marksModalBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  publishMarksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teacher,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  publishMarksText: { ...typography.base, ...typography.bold, color: '#fff' },
});

export default TeacherExamsScreen;
