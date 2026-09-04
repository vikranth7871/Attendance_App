import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator
} from 'react-native';
import {
  BookOpen, User, Calendar, X, Clock, CheckCircle2, AlertCircle,
  Award, FileText, BarChart3, ClipboardList, TrendingUp
} from 'lucide-react-native';
import api from '../api/client';
import { colors, spacing, radius, typography, shadows } from '../styles/theme';

const getGradeColor = (grade) => {
  if (!grade) return colors.textMuted;
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return colors.success;
  if (g.startsWith('B')) return colors.primary;
  if (g.startsWith('C')) return colors.warning;
  return colors.danger;
};

const StudentSubjectDetailModal = ({ visible, subjectId, subjectName, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!visible || !subjectId) return;
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/student/subjects/${subjectId}/details`);
        setDetails(data);
      } catch (err) {
        console.error('Failed to fetch subject details:', err);
        setError('Failed to load subject details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [visible, subjectId]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'exams', label: 'Exams & Marks', icon: Award },
    { key: 'upcoming', label: 'Upcoming', icon: Clock },
    { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  ];

  const att = details?.attendance || { present: 0, absent: 0, leave: 0, total: 0, percentage: 0 };
  const results = details?.results || [];
  const upcoming = details?.upcomingExams || [];
  const assignments = details?.assignments || [];
  const subject = details?.subject || {};
  const attColor = att.percentage >= 75 ? colors.success : att.percentage >= 50 ? colors.warning : colors.danger;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, shadows.lg]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <BookOpen size={22} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.subjectTitle} numberOfLines={1}>
                {subjectName || subject.name || 'Subject Details'}
              </Text>
              <View style={styles.subHeaderRow}>
                {subject.teacher?.name ? (
                  <Text style={styles.subHeaderText}>
                    <User size={12} color={colors.textMuted} /> {subject.teacher.name}
                  </Text>
                ) : null}
                {subject.code ? (
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeBadgeText}>{subject.code}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tabs */}
          <View style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Icon size={14} color={isActive ? colors.student : colors.textMuted} />
                    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color={colors.student} />
              <Text style={styles.loadingText}>Loading subject insights...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorCenter}>
              <AlertCircle size={36} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
              {activeTab === 'overview' && (
                <View style={styles.tabPane}>
                  {/* Attendance Performance Card */}
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Attendance Performance</Text>
                    <View style={styles.attRow}>
                      <View style={styles.attRingBox}>
                        <Text style={[styles.attPctBig, { color: attColor }]}>{att.percentage}%</Text>
                        <Text style={styles.attPctSub}>Attendance</Text>
                      </View>
                      <View style={styles.attBreakdown}>
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Total Classes:</Text>
                          <Text style={styles.breakdownVal}>{att.total}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                          <Text style={[styles.breakdownLabel, { color: colors.success }]}>Present:</Text>
                          <Text style={[styles.breakdownVal, { color: colors.success }]}>{att.present}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                          <Text style={[styles.breakdownLabel, { color: colors.danger }]}>Absent:</Text>
                          <Text style={[styles.breakdownVal, { color: colors.danger }]}>{att.absent}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                          <Text style={[styles.breakdownLabel, { color: colors.warning }]}>Leave:</Text>
                          <Text style={[styles.breakdownVal, { color: colors.warning }]}>{att.leave}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Course Details Card */}
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Course Details</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Subject Code:</Text>
                      <Text style={styles.infoValue}>{subject.code || '—'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Department:</Text>
                      <Text style={styles.infoValue}>{subject.department?.name || 'General'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Instructor:</Text>
                      <Text style={styles.infoValue}>{subject.teacher?.name || 'Unassigned'}</Text>
                    </View>
                    {subject.teacher?.email ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Contact:</Text>
                        <Text style={styles.infoValue}>{subject.teacher.email}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}

              {activeTab === 'exams' && (
                <View style={styles.tabPane}>
                  {results.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Award size={36} color={colors.textMuted} />
                      <Text style={styles.emptyText}>No exam results published yet.</Text>
                    </View>
                  ) : (
                    results.map((res, idx) => (
                      <View key={res._id || idx} style={styles.examCard}>
                        <View style={styles.examHeader}>
                          <Text style={styles.examTitle}>{res.examTitle || res.examName || 'Assessment'}</Text>
                          {res.grade ? (
                            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(res.grade) + '22' }]}>
                              <Text style={[styles.gradeText, { color: getGradeColor(res.grade) }]}>{res.grade}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.examDetails}>
                          <Text style={styles.examScore}>
                            Marks: <Text style={{ color: colors.student, fontWeight: '700' }}>{res.marksObtained}</Text> / {res.maxMarks || 100}
                          </Text>
                          {res.percentage !== undefined ? (
                            <Text style={styles.examScore}>
                              Percentage: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{res.percentage}%</Text>
                            </Text>
                          ) : null}
                        </View>
                        {res.remarks ? (
                          <Text style={styles.examRemarks}>Remarks: {res.remarks}</Text>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeTab === 'upcoming' && (
                <View style={styles.tabPane}>
                  {upcoming.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Clock size={36} color={colors.textMuted} />
                      <Text style={styles.emptyText}>No upcoming exams or schedules.</Text>
                    </View>
                  ) : (
                    upcoming.map((up, idx) => (
                      <View key={up._id || idx} style={styles.upcomingCard}>
                        <View style={styles.upcomingHeader}>
                          <Calendar size={16} color={colors.primary} />
                          <Text style={styles.upcomingTitle}>{up.examTitle || up.title || 'Scheduled Assessment'}</Text>
                        </View>
                        <Text style={styles.upcomingDate}>
                          Date: {up.examDate ? new Date(up.examDate).toLocaleDateString() : 'TBA'}
                        </Text>
                        {up.startTime ? (
                          <Text style={styles.upcomingTime}>Time: {up.startTime} - {up.endTime || ''}</Text>
                        ) : null}
                        {up.roomNumber ? (
                          <Text style={styles.upcomingTime}>Room / Hall: {up.roomNumber}</Text>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeTab === 'assignments' && (
                <View style={styles.tabPane}>
                  {assignments.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <ClipboardList size={36} color={colors.textMuted} />
                      <Text style={styles.emptyText}>No assignments assigned yet.</Text>
                    </View>
                  ) : (
                    assignments.map((ass, idx) => (
                      <View key={ass._id || idx} style={styles.assignCard}>
                        <View style={styles.assignHeader}>
                          <Text style={styles.assignTitle}>{ass.title}</Text>
                          <View style={[styles.statusPill, { backgroundColor: ass.status === 'Submitted' ? colors.success + '22' : colors.warning + '22' }]}>
                            <Text style={[styles.statusText, { color: ass.status === 'Submitted' ? colors.success : colors.warning }]}>
                              {ass.status || 'Pending'}
                            </Text>
                          </View>
                        </View>
                        {ass.description ? (
                          <Text style={styles.assignDesc} numberOfLines={2}>{ass.description}</Text>
                        ) : null}
                        <View style={styles.assignFooter}>
                          <Text style={styles.assignDue}>Due: {ass.dueDate ? new Date(ass.dueDate).toLocaleDateString() : 'N/A'}</Text>
                          {ass.grade ? (
                            <Text style={styles.assignGrade}>Score: {ass.grade} / {ass.maxGrade || 100}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '82%',
    borderWidth: 1, borderColor: colors.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primary + '22',
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1 },
  subjectTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  subHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  subHeaderText: { ...typography.xs, color: colors.textMuted },
  codeBadge: {
    backgroundColor: colors.primary + '22',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.xs,
  },
  codeBadgeText: { ...typography.xs, color: colors.primary, fontWeight: '700' },
  closeBtn: { padding: spacing.xs },
  tabBar: { borderBottomWidth: 1, borderBottomColor: colors.border },
  tabScroll: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: spacing.xs },
  tabButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  tabButtonActive: {
    backgroundColor: colors.student + '22',
  },
  tabButtonText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  tabButtonTextActive: { color: colors.student, fontWeight: '700' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  loadingText: { ...typography.sm, color: colors.textMuted },
  errorCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  errorText: { ...typography.sm, color: colors.danger, textAlign: 'center' },
  bodyScroll: { flex: 1 },
  bodyContent: { padding: spacing.md },
  tabPane: { gap: spacing.md },
  card: {
    backgroundColor: colors.bgPrimary, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { ...typography.sm, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  attRingBox: {
    width: 90, height: 90, borderRadius: radius.full,
    borderWidth: 3, borderColor: colors.student + '44',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  attPctBig: { ...typography.xl, ...typography.bold },
  attPctSub: { ...typography.xs, color: colors.textMuted },
  attBreakdown: { flex: 1, gap: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { ...typography.xs, color: colors.textMuted },
  breakdownVal: { ...typography.xs, ...typography.bold, color: colors.textPrimary },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border + '33' },
  infoLabel: { ...typography.xs, color: colors.textMuted },
  infoValue: { ...typography.xs, ...typography.bold, color: colors.textPrimary },
  emptyCard: {
    backgroundColor: colors.bgPrimary, borderRadius: radius.md,
    padding: spacing.xl, alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  emptyText: { ...typography.sm, color: colors.textMuted },
  examCard: {
    backgroundColor: colors.bgPrimary, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    gap: 6,
  },
  examHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  examTitle: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  gradeText: { ...typography.xs, ...typography.bold },
  examDetails: { flexDirection: 'row', gap: spacing.md },
  examScore: { ...typography.xs, color: colors.textMuted },
  examRemarks: { ...typography.xs, color: colors.textMuted, fontStyle: 'italic' },
  upcomingCard: {
    backgroundColor: colors.bgPrimary, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    gap: 4,
  },
  upcomingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  upcomingTitle: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  upcomingDate: { ...typography.xs, color: colors.textMuted },
  upcomingTime: { ...typography.xs, color: colors.primary, fontWeight: '600' },
  assignCard: {
    backgroundColor: colors.bgPrimary, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    gap: 6,
  },
  assignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignTitle: { ...typography.sm, ...typography.bold, color: colors.textPrimary, flex: 1 },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  statusText: { ...typography.xs, fontWeight: '700' },
  assignDesc: { ...typography.xs, color: colors.textMuted },
  assignFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  assignDue: { ...typography.xs, color: colors.danger },
  assignGrade: { ...typography.xs, ...typography.bold, color: colors.student },
});

export default StudentSubjectDetailModal;
