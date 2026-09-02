import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native';
import {
  Search, X, User, GraduationCap, Users, BookOpen, Building, ChevronRight
} from 'lucide-react-native';
import api from '../api/client';
import { colors, spacing, radius, typography, shadows } from '../styles/theme';

const GlobalSearchModal = ({ visible, onClose, navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const typeParam = activeFilter !== 'all' ? `&type=${activeFilter}` : '';
        const { data } = await api.get(`/search?q=${encodeURIComponent(query.trim())}${typeParam}`);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeFilter]);

  const handleSelect = (item, type) => {
    onClose();
    if (!navigation) return;
    if (type === 'student' || type === 'teacher') {
      navigation.navigate('Users', { highlightId: item.id });
    } else if (type === 'class' || type === 'department') {
      navigation.navigate('Academic');
    } else if (type === 'subject') {
      navigation.navigate('Subjects');
    }
  };

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'student', label: 'Students' },
    { key: 'teacher', label: 'Faculty' },
    { key: 'class', label: 'Classes' },
    { key: 'subject', label: 'Subjects' },
  ];

  const totalResults = results
    ? (results.students?.length || 0) +
      (results.teachers?.length || 0) +
      (results.classes?.length || 0) +
      (results.subjects?.length || 0) +
      (results.departments?.length || 0)
    : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
            <TextInput
              style={styles.input}
              placeholder="Search students, faculty, classes, subjects..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Results View */}
          <ScrollView contentContainerStyle={styles.resultContent} keyboardShouldPersistTaps="handled">
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.subtleText}>Searching...</Text>
              </View>
            ) : query.trim() && results ? (
              totalResults === 0 ? (
                <View style={styles.centerBox}>
                  <Text style={styles.emptyTitle}>No results found for "{query}"</Text>
                  <Text style={styles.subtleText}>Try searching by name, roll number, or department</Text>
                </View>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {/* Students */}
                  {results.students?.length > 0 && (
                    <ResultSection
                      title="Students"
                      icon={GraduationCap}
                      color={colors.student}
                      items={results.students}
                      renderTitle={s => s.name}
                      renderSub={s => `${s.rollNumber || '—'} · ${s.className || 'Class'} (${s.section || 'A'})`}
                      onPress={s => handleSelect(s, 'student')}
                    />
                  )}

                  {/* Teachers */}
                  {results.teachers?.length > 0 && (
                    <ResultSection
                      title="Faculty"
                      icon={Users}
                      color={colors.teacher}
                      items={results.teachers}
                      renderTitle={t => t.name}
                      renderSub={t => `${t.departmentName || 'Department'} · ${t.email}`}
                      onPress={t => handleSelect(t, 'teacher')}
                    />
                  )}

                  {/* Classes */}
                  {results.classes?.length > 0 && (
                    <ResultSection
                      title="Classes"
                      icon={Building}
                      color={colors.warning}
                      items={results.classes}
                      renderTitle={c => `${c.className} - Section ${c.section || 'A'}`}
                      renderSub={c => c.departmentName || 'General'}
                      onPress={c => handleSelect(c, 'class')}
                    />
                  )}

                  {/* Subjects */}
                  {results.subjects?.length > 0 && (
                    <ResultSection
                      title="Subjects"
                      icon={BookOpen}
                      color={colors.primary}
                      items={results.subjects}
                      renderTitle={sub => sub.subjectName || sub.name}
                      renderSub={sub => `${sub.subjectCode || sub.code || 'Code'} · ${sub.departmentName || ''}`}
                      onPress={sub => handleSelect(sub, 'subject')}
                    />
                  )}
                </View>
              )
            ) : (
              <View style={styles.centerBox}>
                <Search size={32} color={colors.textMuted} />
                <Text style={styles.subtleText}>Type to search across the entire institute</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const ResultSection = ({ title, icon: Icon, color, items, renderTitle, renderSub, onPress }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon size={16} color={color} />
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <Text style={styles.sectionCount}>({items.length})</Text>
    </View>
    {items.map((item, i) => (
      <TouchableOpacity
        key={i}
        style={styles.resultItem}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle}>{renderTitle(item)}</Text>
          <Text style={styles.resultSub}>{renderSub(item)}</Text>
        </View>
        <ChevronRight size={14} color={colors.textMuted} />
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', paddingTop: 50 },
  container: { flex: 1, backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  input: { flex: 1, color: colors.textPrimary, ...typography.base, paddingVertical: 6 },
  closeBtn: { marginLeft: spacing.sm, paddingHorizontal: spacing.sm },
  closeBtnText: { ...typography.sm, color: colors.primary, fontWeight: '600' },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bgElevated, marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  filterChipText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: colors.primary },
  resultContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.base, color: colors.textPrimary, fontWeight: '600' },
  subtleText: { ...typography.sm, color: colors.textMuted, textAlign: 'center' },
  section: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionTitle: { ...typography.sm, ...typography.bold, textTransform: 'uppercase' },
  sectionCount: { ...typography.xs, color: colors.textMuted },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border + '66' },
  resultInfo: { flex: 1 },
  resultTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  resultSub: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
});

export default GlobalSearchModal;
