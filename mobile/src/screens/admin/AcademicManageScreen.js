import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Layers, BookOpen, Users } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader, CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const SectionHeader = ({ title, icon: Icon, count, color }) => (
  <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
    <Icon size={16} color={color} />
    <Text style={[styles.sectionHeaderTitle, { color }]}>{title}</Text>
    <View style={[styles.countBadge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.countText, { color }]}>{count}</Text>
    </View>
  </View>
);

const ItemCard = ({ item, color }) => (
  <View style={[styles.itemCard, shadows.sm]}>
    <View style={[styles.itemDot, { backgroundColor: color }]} />
    <View style={styles.itemInfo}>
      <Text style={styles.itemName}>{item.name || item.subject_name || item.class_name || item.department_name}</Text>
      {item.code && <Text style={styles.itemMeta}>Code: {item.code}</Text>}
      {item.department_name && !item.code && <Text style={styles.itemMeta}>{item.department_name}</Text>}
      {item.student_count !== undefined && (
        <Text style={styles.itemMeta}>{item.student_count} students</Text>
      )}
    </View>
  </View>
);

const AcademicManageScreen = () => {
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [depRes, classRes, subjRes] = await Promise.all([
        api.get('/admin/departments').catch(() => ({ data: [] })),
        api.get('/admin/classes').catch(() => ({ data: [] })),
        api.get('/admin/subjects').catch(() => ({ data: [] })),
      ]);
      setDepartments(depRes.data || []);
      setClasses(classRes.data || []);
      setSubjects(subjRes.data || []);
    } catch (err) {
      console.error('Academic fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) return <FullPageLoader message="Loading academic data..." />;

  const sections = [
    {
      key: 'departments',
      title: 'Departments',
      icon: Building2,
      color: colors.primary,
      data: departments,
    },
    {
      key: 'classes',
      title: 'Classes',
      icon: Layers,
      color: colors.teacher,
      data: classes,
    },
    {
      key: 'subjects',
      title: 'Subjects',
      icon: BookOpen,
      color: colors.student,
      data: subjects,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Academic Structure" subtitle="Departments, Classes & Subjects" />
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => item.id?.toString() || i.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            title={section.title}
            icon={section.icon}
            count={section.data.length}
            color={section.color}
          />
        )}
        renderItem={({ item, section }) => (
          <ItemCard item={item} color={section.color} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No academic data found</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  list: { padding: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeaderTitle: {
    ...typography.base,
    ...typography.bold,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  itemInfo: { flex: 1 },
  itemName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  itemMeta: { ...typography.sm, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default AcademicManageScreen;
