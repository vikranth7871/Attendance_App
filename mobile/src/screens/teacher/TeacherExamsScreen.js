import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, Plus, Clock } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const TeacherExamsScreen = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', subject_id: '', exam_date: '', start_time: '', end_time: '', max_marks: '', exam_type: 'midterm' });

  const fetchData = async () => {
    try {
      const [examRes, subjRes] = await Promise.all([
        api.get('/teacher/exams').catch(() => ({ data: [] })),
        api.get('/teacher/subjects').catch(() => ({ data: [] })),
      ]);
      setExams(examRes.data || []);
      setSubjects(subjRes.data || []);
      if (subjRes.data?.length > 0) setForm(f => ({ ...f, subject_id: subjRes.data[0].subject_id || subjRes.data[0].id }));
    } catch (err) { console.error('Exams fetch error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.exam_date.trim()) {
      Alert.alert('Missing Fields', 'Title and exam date are required.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/teacher/exams', form);
      setShowCreate(false);
      Alert.alert('✅ Created', 'Exam scheduled successfully.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create exam.');
    } finally { setCreating(false); }
  };

  if (loading) return <FullPageLoader message="Loading exams..." />;

  const examTypes = ['midterm', 'final', 'quiz', 'assignment', 'practical'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Exams"
        subtitle={`${exams.length} scheduled`}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Plus size={18} color={colors.teacher} />
          </TouchableOpacity>
        }
        showLogout={false}
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
            <Text style={styles.subjectName}>{item.subject_name || '—'}</Text>
            <View style={styles.detailRow}>
              <CalendarDays size={13} color={colors.textMuted} />
              <Text style={styles.detailText}>{item.exam_date ? new Date(item.exam_date).toLocaleDateString() : '—'}</Text>
              {item.start_time && (
                <>
                  <Clock size={13} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                  <Text style={styles.detailText}>{item.start_time} – {item.end_time || '?'}</Text>
                </>
              )}
            </View>
            {item.max_marks && <Text style={styles.marks}>Max Marks: {item.max_marks}</Text>}
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

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <ScrollView style={styles.sheet} onStartShouldSetResponder={() => true} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Schedule Exam</Text>

            {[
              { label: 'Exam Title *', key: 'title', placeholder: 'Midterm Exam 2025' },
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
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { ...typography.xs, color: colors.textSecondary },
  marks: { ...typography.xs, color: colors.primary, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
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
});

export default TeacherExamsScreen;
