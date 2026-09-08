import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen, CheckCircle, Clock, MessageSquare,
  FileText, Calendar, Filter, ChevronRight, AlertCircle
} from 'lucide-react-native';
import Header from '../../components/Header';
import ChildSwitcher from '../../components/ChildSwitcher';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ParentAssignmentsScreen = ({ route, navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(route?.params?.studentId || null);
  const [assignmentsData, setAssignmentsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'graded'

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      const kids = Array.isArray(data) ? data : [];
      setChildren(kids);
      if (!selectedChildId && kids.length > 0) {
        setSelectedChildId(String(route?.params?.studentId || kids[0].id || kids[0].studentId));
      }
    } catch (err) {
      console.error('Fetch children error in assignments:', err);
    }
  };

  const fetchAssignments = async (childId = selectedChildId) => {
    setLoading(true);
    try {
      const url = childId
        ? `/parent/student-assignments?studentId=${childId}`
        : '/parent/student-assignments';
      const { data } = await api.get(url);
      setAssignmentsData(data);
    } catch (err) {
      console.error('Failed to fetch student assignments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchAssignments(selectedChildId);
    } else {
      fetchAssignments();
    }
  }, [selectedChildId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
    fetchAssignments(selectedChildId);
  }, [selectedChildId]);

  if (loading && !refreshing) return <FullPageLoader message="Loading homework & assignments..." />;

  const assignments = assignmentsData?.assignments || [];
  const student = assignmentsData?.student || {};

  const isCompleted = (item) => {
    const s = (item.status || '').toLowerCase();
    return s === 'completed' || s === 'submitted' || s === 'graded' || Boolean(item.submission_date);
  };

  const isGradedItem = (item) => {
    const s = (item.status || '').toLowerCase();
    return s === 'graded' || Boolean(item.grade);
  };

  const filtered = assignments.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !isCompleted(a);
    if (filter === 'completed') return isCompleted(a);
    if (filter === 'graded') return isGradedItem(a);
    return true;
  });

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'graded', label: 'Graded' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Homework & Assignments"
        subtitle={student.name ? `Assignments & feedback for ${student.name}` : 'Track subject assignments'}
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
      >
        {/* Unified Child Switcher Component */}
        {children.length > 0 && (
          <ChildSwitcher
            childrenList={children}
            selectedChildId={selectedChildId}
            onSelectChild={(id) => setSelectedChildId(id)}
          />
        )}

        {/* Filter Tabs matching Web */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Assignments List */}
        {filtered.length === 0 ? (
          <View style={[styles.emptyCard, shadows.sm]}>
            <BookOpen size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Assignments Found</Text>
            <Text style={styles.emptySubtitle}>
              There are no assignments matching the "{filter}" filter for {student.name || 'this student'}.
            </Text>
          </View>
        ) : (
          filtered.map((item, idx) => {
            const done = isCompleted(item);
            const graded = isGradedItem(item);
            const statusLabel = graded ? 'Graded' : done ? 'Completed' : 'Pending';
            const statusColor = graded ? colors.primaryLight : done ? colors.success : colors.warning;

            const formattedDue = item.due_date
              ? new Date(item.due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Next Week';

            return (
              <View key={item.id || idx} style={[styles.assignmentCard, shadows.sm]}>
                {/* Top Meta Bar */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.subjectTeacher}>
                      {(item.subject_name || 'Subject').toUpperCase()} • {item.teacher_name || 'Subject Teacher'}
                    </Text>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: done
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)'
                      }
                    ]}
                  >
                    {done ? (
                      <CheckCircle size={13} color={colors.success} />
                    ) : (
                      <Clock size={13} color={colors.warning} />
                    )}
                    <Text style={[styles.statusPillText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {item.description ? (
                  <Text style={styles.cardDescription}>{item.description}</Text>
                ) : null}

                {/* Teacher Feedback Box if present */}
                {item.teacher_comments ? (
                  <View style={styles.feedbackBox}>
                    <MessageSquare size={14} color={colors.primaryLight} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.feedbackText}>
                        Teacher Feedback: "{item.teacher_comments}"
                      </Text>
                      {item.grade ? (
                        <View style={styles.gradeBadge}>
                          <Text style={styles.gradeBadgeText}>Grade: {item.grade}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* Footer Strip */}
                <View style={styles.cardFooter}>
                  <View style={styles.dueDateRow}>
                    <Calendar size={13} color={colors.danger} />
                    <Text style={styles.dueDateText}>Due: {formattedDue}</Text>
                  </View>

                  {item.attachment_url ? (
                    <TouchableOpacity
                      style={styles.attachmentLink}
                      onPress={() => Alert.alert('Attachment', `File resource: ${item.attachment_url}`)}
                    >
                      <FileText size={13} color={colors.primaryLight} />
                      <Text style={styles.attachmentLinkText}>Attachment Resource</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.bgCard,
    padding: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  assignmentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subjectTeacher: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  feedbackBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.primaryLight,
    lineHeight: 16,
  },
  gradeBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  attachmentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  attachmentLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});

export default ParentAssignmentsScreen;
