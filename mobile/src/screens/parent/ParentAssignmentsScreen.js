import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Calendar, CheckCircle, Clock, AlertCircle, User } from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_COLORS = {
  graded: colors.success,
  submitted: colors.primary,
  pending: colors.warning,
  overdue: colors.danger,
};

const ParentAssignmentsScreen = ({ navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      const kids = Array.isArray(data) ? data : [];
      setChildren(kids);
      if (kids.length > 0 && !selectedChild) {
        setSelectedChild(kids[0]);
      }
    } catch (err) {
      console.error('Fetch children error:', err);
    }
  };

  const fetchAssignments = async (childId) => {
    if (!childId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/parent/student-assignments?studentId=${childId}`);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch parent assignments error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchChildren(); }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchAssignments(selectedChild.id);
    }
  }, [selectedChild]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedChild) fetchAssignments(selectedChild.id);
    else fetchChildren();
  }, [selectedChild]);

  const FILTERS = ['All', 'Pending', 'Submitted', 'Graded'];

  const filtered = assignments.filter(a => {
    if (activeFilter === 'All') return true;
    return (a.status || 'pending').toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Child Assignments"
        subtitle={selectedChild ? `Tracking ${selectedChild.name}` : 'Homework & coursework'}
        navigation={navigation}
      />

      {/* Children Selector */}
      {children.length > 1 && (
        <View style={styles.childrenBar}>
          <Text style={styles.childrenBarLabel}>Child:</Text>
          {children.map(child => (
            <TouchableOpacity
              key={child.id}
              style={[styles.childChip, selectedChild?.id === child.id && styles.childChipActive]}
              onPress={() => setSelectedChild(child)}
            >
              <User size={13} color={selectedChild?.id === child.id ? '#fff' : colors.textSecondary} />
              <Text style={[styles.childChipText, selectedChild?.id === child.id && styles.childChipTextActive]}>
                {child.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, activeFilter === f && styles.tabActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.tabText, activeFilter === f && styles.tabTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => {
            const statusKey = (item.status || 'pending').toLowerCase();
            const statusColor = STATUS_COLORS[statusKey] || colors.warning;
            const dueDate = item.due_date ? new Date(item.due_date) : null;
            const isOverdue = dueDate && dueDate < new Date() && statusKey !== 'submitted' && statusKey !== 'graded';

            return (
              <View style={[styles.card, shadows.sm, isOverdue && styles.overdueCard]}>
                <View style={styles.cardHeader}>
                  <BookOpen size={18} color={isOverdue ? colors.danger : colors.parent} />
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (isOverdue ? colors.danger : statusColor) + '22' }]}>
                    <Text style={[styles.statusText, { color: isOverdue ? colors.danger : statusColor }]}>
                      {isOverdue ? 'Overdue' : (item.status || 'Pending')}
                    </Text>
                  </View>
                </View>

                {item.description && (
                  <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                )}

                <View style={styles.footer}>
                  <Text style={styles.subject}>{item.subject_name || 'Academic Subject'}</Text>
                  {dueDate && (
                    <View style={styles.dueRow}>
                      <Calendar size={12} color={isOverdue ? colors.danger : colors.textMuted} />
                      <Text style={[styles.dueDate, isOverdue && { color: colors.danger }]}>
                        Due: {dueDate.toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Grade & Feedback */}
                {item.grade && (
                  <View style={styles.gradeBox}>
                    <CheckCircle size={14} color={colors.success} />
                    <Text style={styles.gradeText}>Grade: {item.grade}</Text>
                  </View>
                )}
                {item.teacher_comments && (
                  <Text style={styles.feedbackText}>
                    Teacher Remarks: "{item.teacher_comments}"
                  </Text>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <BookOpen size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Assignments</Text>
              <Text style={styles.emptySub}>No {activeFilter === 'All' ? '' : activeFilter.toLowerCase()} assignments found for this student.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  childrenBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  childrenBarLabel: { ...typography.xs, color: colors.textMuted, marginRight: 2 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  childChipActive: { backgroundColor: colors.parent, borderColor: colors.parent },
  childChipText: { ...typography.xs, color: colors.textSecondary },
  childChipTextActive: { color: '#fff', fontWeight: '700' },
  filterRow: { flexDirection: 'row', padding: spacing.md, paddingBottom: 0, gap: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.parent + '22', borderColor: colors.parent + '55' },
  tabText: { ...typography.sm, color: colors.textMuted },
  tabTextActive: { color: colors.parent, ...typography.semibold },
  list: { padding: spacing.md },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  overdueCard: { borderColor: colors.danger + '44' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  cardTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  desc: { ...typography.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  subject: { ...typography.xs, color: colors.textMuted },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueDate: { ...typography.xs, color: colors.textMuted },
  gradeBox: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success + '15', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, marginTop: spacing.sm, alignSelf: 'flex-start' },
  gradeText: { ...typography.xs, ...typography.bold, color: colors.success },
  feedbackText: { ...typography.xs, color: colors.textSecondary, fontStyle: 'italic', marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.base, ...typography.semibold, color: colors.textSecondary },
  emptySub: { ...typography.sm, color: colors.textMuted, textAlign: 'center' },
});

export default ParentAssignmentsScreen;
