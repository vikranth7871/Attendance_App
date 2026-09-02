import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, GraduationCap, Mail, Phone, Hash } from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ClassRosterScreen = () => {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/teacher/class-roster');
      setStudents(data || []);
      setFiltered(data || []);
    } catch (err) {
      console.error('Roster fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(students); return; }
    const q = search.toLowerCase();
    setFiltered(students.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    ));
  }, [search, students]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchStudents(); }, []);

  const getAttendanceBadgeColor = (pct) => {
    if (pct >= 90) return colors.success;
    if (pct >= 75) return colors.warning;
    return colors.danger;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Class Roster" subtitle={`${students.length} students`} />

      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search students..."
          placeholderTextColor={colors.textMuted}
        />
        {!!search && <TouchableOpacity onPress={() => setSearch('')}><X size={16} color={colors.textMuted} /></TouchableOpacity>}
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => {
            const pct = item.attendance_percentage ?? item.attendance_pct;
            const badgeColor = pct !== undefined ? getAttendanceBadgeColor(pct) : colors.textMuted;
            return (
              <TouchableOpacity
                style={[styles.studentCard, shadows.sm]}
                onPress={() => setSelected(item)}
                activeOpacity={0.75}
              >
                <View style={[styles.avatar, { backgroundColor: colors.student + '22' }]}>
                  <GraduationCap size={20} color={colors.student} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{item.roll_number} {item.class_name ? `• ${item.class_name}` : ''}</Text>
                </View>
                {pct !== undefined && (
                  <View style={[styles.attendanceBadge, { backgroundColor: badgeColor + '22' }]}>
                    <Text style={[styles.attendanceText, { color: badgeColor }]}>{pct}%</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <GraduationCap size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          }
        />
      )}

      {/* Student Detail Modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalAvatar, { backgroundColor: colors.student + '22' }]}>
                    <GraduationCap size={30} color={colors.student} />
                  </View>
                  <Text style={styles.modalName}>{selected.name}</Text>
                  <Text style={styles.modalClass}>{selected.class_name} {selected.section ? `• ${selected.section}` : ''}</Text>
                </View>
                <View style={styles.detailRows}>
                  {selected.roll_number && <DetailRow icon={<Hash size={15} color={colors.textMuted} />} label="Roll No" value={selected.roll_number} />}
                  {selected.email && <DetailRow icon={<Mail size={15} color={colors.textMuted} />} label="Email" value={selected.email} />}
                  {selected.phone && <DetailRow icon={<Phone size={15} color={colors.textMuted} />} label="Phone" value={selected.phone} />}
                  {selected.attendance_percentage !== undefined && (
                    <DetailRow label="Attendance" value={`${selected.attendance_percentage}%`} />
                  )}
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    {icon && <View style={{ width: 22 }}>{icon}</View>}
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, margin: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: colors.textPrimary, ...typography.sm },
  list: { padding: spacing.md, paddingTop: 0 },
  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  info: { flex: 1 },
  name: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  meta: { ...typography.sm, color: colors.textMuted, marginTop: 2 },
  attendanceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  attendanceText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 50 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  modalHeader: { alignItems: 'center', marginBottom: spacing.lg },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  modalName: { ...typography.xl, ...typography.bold, color: colors.textPrimary },
  modalClass: { ...typography.sm, color: colors.textSecondary, marginTop: 4 },
  detailRows: { gap: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { ...typography.sm, color: colors.textMuted, width: 90 },
  detailValue: { ...typography.sm, color: colors.textPrimary, flex: 1 },
});

export default ClassRosterScreen;
