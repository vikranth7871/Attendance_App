import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, Clock, ChevronDown } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_MAP = {
  present: { label: 'P', color: colors.success },
  absent: { label: 'A', color: colors.danger },
  late: { label: 'L', color: colors.warning },
};

const ManualAttendanceScreen = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/teacher/subjects');
      setSubjects(data || []);
      if (data?.length > 0) setSelectedSubject(data[0]);
    } catch (err) {
      console.error('Subjects fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForSubject = async (subject) => {
    if (!subject) return;
    try {
      const { data } = await api.get(`/teacher/attendance/students?subject_id=${subject.subject_id || subject.id}`);
      setStudents(data || []);
      // Default all to present
      const init = {};
      (data || []).forEach(s => { init[s.id] = 'present'; });
      setAttendance(init);
    } catch (err) {
      console.error('Students fetch error:', err);
    }
  };

  useEffect(() => { fetchSubjects(); }, []);
  useEffect(() => { if (selectedSubject) { setSubmitted(false); fetchStudentsForSubject(selectedSubject); } }, [selectedSubject]);

  const toggleStatus = (studentId) => {
    if (submitted) return;
    setAttendance(prev => {
      const current = prev[studentId] || 'present';
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const handleSubmit = async () => {
    if (submitted) {
      Alert.alert('Already Submitted', 'Attendance for this slot has already been submitted.');
      return;
    }
    if (!selectedSubject) {
      Alert.alert('No Subject', 'Please select a subject first.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = students.map(s => ({
        student_id: s.id,
        status: attendance[s.id] || 'present',
      }));
      await api.post('/teacher/attendance/mark', {
        subject_id: selectedSubject.subject_id || selectedSubject.id,
        date: new Date().toISOString().split('T')[0],
        records: payload,
      });
      setSubmitted(true);
      Alert.alert('✅ Submitted', 'Attendance has been marked successfully.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullPageLoader message="Loading attendance data..." />;

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;
  const lateCount = Object.values(attendance).filter(v => v === 'late').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Mark Attendance" />

      {/* Subject Picker */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.picker} onPress={() => setShowSubjectPicker(!showSubjectPicker)}>
          <Text style={styles.pickerText} numberOfLines={1}>
            {selectedSubject ? (selectedSubject.subject_name || selectedSubject.name) : 'Select Subject'}
          </Text>
          <ChevronDown size={16} color={colors.textMuted} />
        </TouchableOpacity>
        {showSubjectPicker && (
          <View style={styles.dropdown}>
            {subjects.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.dropdownItem}
                onPress={() => { setSelectedSubject(s); setShowSubjectPicker(false); }}
              >
                <Text style={[styles.dropdownText, selectedSubject?.id === s.id && { color: colors.teacher }]}>
                  {s.subject_name || s.name} {s.class_name ? `- ${s.class_name}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}><View style={[styles.dot, { backgroundColor: colors.success }]} /><Text style={styles.summaryCount}>{presentCount} P</Text></View>
        <View style={styles.summaryItem}><View style={[styles.dot, { backgroundColor: colors.danger }]} /><Text style={styles.summaryCount}>{absentCount} A</Text></View>
        <View style={styles.summaryItem}><View style={[styles.dot, { backgroundColor: colors.warning }]} /><Text style={styles.summaryCount}>{lateCount} L</Text></View>
        <Text style={styles.summaryTotal}>{students.length} total</Text>
      </View>

      {submitted && (
        <View style={styles.submittedBanner}>
          <Check size={16} color={colors.success} />
          <Text style={styles.submittedText}>Attendance submitted for today</Text>
        </View>
      )}

      <FlatList
        data={students}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => {
          const status = attendance[item.id] || 'present';
          const statusCfg = STATUS_MAP[status];
          return (
            <TouchableOpacity
              style={[styles.studentRow, shadows.sm, submitted && styles.studentRowDisabled]}
              onPress={() => toggleStatus(item.id)}
              activeOpacity={submitted ? 1 : 0.7}
            >
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentMeta}>{item.roll_number}</Text>
              </View>
              <View style={[styles.statusBtn, { backgroundColor: statusCfg.color + '22', borderColor: statusCfg.color }]}>
                <Text style={[styles.statusBtnText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No students found for this subject</Text>
          </View>
        }
      />

      {!submitted && students.length > 0 && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Attendance</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  controls: { margin: spacing.md, marginBottom: 0, zIndex: 100 },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md,
  },
  pickerText: { ...typography.base, color: colors.textPrimary, flex: 1 },
  dropdown: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownText: { ...typography.sm, color: colors.textSecondary },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, paddingBottom: 0,
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  summaryCount: { ...typography.sm, ...typography.semibold, color: colors.textSecondary },
  summaryTotal: { ...typography.sm, color: colors.textMuted, marginLeft: 'auto' },
  submittedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.success + '18', margin: spacing.md,
    padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.success + '33',
  },
  submittedText: { ...typography.sm, color: colors.success },
  list: { padding: spacing.md },
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  studentRowDisabled: { opacity: 0.7 },
  studentInfo: { flex: 1 },
  studentName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  studentMeta: { ...typography.xs, color: colors.textMuted },
  statusBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  statusBtnText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { ...typography.base, color: colors.textMuted },
  submitContainer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.teacher, borderRadius: radius.md,
    padding: 14, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
});

export default ManualAttendanceScreen;
