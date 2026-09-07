import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search, X, GraduationCap, Mail, Hash, Edit3, Flame,
  BarChart2, Save, ArrowUpDown, Users, BookOpen,
  CheckCircle, XCircle, Clock,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

// ─── Sort Options ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'default',  label: 'Default Order' },
  { value: 'att_desc', label: 'Attendance: High → Low' },
  { value: 'att_asc',  label: 'Attendance: Low → High' },
  { value: 'name_asc', label: 'Name A → Z' },
  { value: 'roll_asc', label: 'Roll Number' },
];

// ─── Attendance Badge ──────────────────────────────────────────────────────────
const AttBadge = ({ pct }) => {
  const isGood = pct >= 75;
  return (
    <View style={[styles.attBadge, { backgroundColor: isGood ? colors.success + '22' : colors.danger + '22' }]}>
      <BarChart2 size={12} color={isGood ? colors.success : colors.danger} />
      <Text style={[styles.attBadgeText, { color: isGood ? colors.success : colors.danger }]}>
        {pct}%
      </Text>
    </View>
  );
};

// ─── Subject-Wise Progress Bar ─────────────────────────────────────────────────
const SubjectBar = ({ sub }) => {
  const pct = parseFloat(sub.percentage || 0);
  const isGood = pct >= 75;
  return (
    <View style={styles.subBarWrapper}>
      <View style={styles.subBarHeader}>
        <Text style={styles.subBarName} numberOfLines={1}>{sub.subjectName}</Text>
        <Text style={[styles.subBarPct, { color: isGood ? colors.success : colors.danger }]}>{sub.percentage}%</Text>
      </View>
      <View style={styles.subBarTrack}>
        <View style={[styles.subBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: isGood ? colors.success : colors.danger }]} />
      </View>
      <Text style={styles.subBarMeta}>{sub.present} present / {sub.total} classes</Text>
    </View>
  );
};

// ─── Student Profile Bottom Sheet ──────────────────────────────────────────────
const ProfileModal = ({ student, isCoordinator, onClose, onSaved }) => {
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [isEditing, setEditing] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ name: '', rollNumber: '', email: '' });

  useEffect(() => {
    if (!student) return;
    setEditing(false);
    setProfile(null);
    setForm({ name: student.name || '', rollNumber: student.rollNumber || '', email: student.email || '' });
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/teacher/student/${student._id || student.id}/profile`);
        setProfile(data);
      } catch (e) {
        console.error('Profile fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [student]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('Required', 'Name and Email are required.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/teacher/student/${student._id || student.id}/update`, {
        name: form.name.trim(),
        rollNumber: form.rollNumber.trim(),
        email: form.email.trim().toLowerCase(),
      });
      Alert.alert('Updated', 'Student profile updated successfully.');
      setEditing(false);
      if (onSaved) onSaved();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not update student.');
    } finally {
      setSaving(false);
    }
  };

  if (!student) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalAvatar}>
                <GraduationCap size={32} color={colors.primary} />
              </View>
              <Text style={styles.modalName}>{student.name}</Text>
              <Text style={styles.modalSub}>
                {profile?.student?.className || student.class_name || student.className || ''}
                {student.rollNumber ? `  ·  Roll ${student.rollNumber}` : ''}
              </Text>
            </View>

            {loading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.subBarMeta, { marginTop: 8 }]}>Loading profile…</Text>
              </View>
            ) : (
              <>
                {/* KPI Row */}
                <View style={styles.kpiRow}>
                  <View style={styles.kpiCard}>
                    <Text style={[styles.kpiVal, {
                      color: (profile?.stats?.attendancePercentage ?? student.attendancePercentage ?? 0) >= 75
                        ? colors.success : colors.danger,
                    }]}>
                      {profile?.stats?.attendancePercentage ?? student.attendancePercentage ?? '—'}%
                    </Text>
                    <Text style={styles.kpiLbl}>Attendance</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiVal}>
                      {profile?.stats?.presentCount ?? student.presentSessions ?? '—'} / {profile?.stats?.totalClasses ?? student.totalSessions ?? '—'}
                    </Text>
                    <Text style={styles.kpiLbl}>Lectures</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Flame size={14} color={colors.warning} />
                      <Text style={[styles.kpiVal, { color: colors.warning }]}>
                        {profile?.student?.streakCount ?? 0}
                      </Text>
                    </View>
                    <Text style={styles.kpiLbl}>Streak</Text>
                  </View>
                </View>

                {/* Contact Details */}
                {student.email ? (
                  <View style={styles.infoRow}>
                    <Mail size={14} color={colors.textMuted} />
                    <Text style={styles.infoText}>{student.email}</Text>
                  </View>
                ) : null}
                {student.rollNumber ? (
                  <View style={styles.infoRow}>
                    <Hash size={14} color={colors.textMuted} />
                    <Text style={styles.infoText}>{student.rollNumber}</Text>
                  </View>
                ) : null}

                {/* Subject-wise bars */}
                {profile?.stats?.subjectWise?.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <BarChart2 size={15} color={colors.primary} />
                      <Text style={styles.sectionTitle}>Subject-wise Performance</Text>
                    </View>
                    {profile.stats.subjectWise.map(sub => (
                      <SubjectBar key={sub.subjectName} sub={sub} />
                    ))}
                  </View>
                )}

                {/* Coordinator Edit */}
                {isCoordinator && (
                  isEditing ? (
                    <View style={styles.editBox}>
                      <Text style={styles.editBoxTitle}>Edit Student Profile</Text>

                      <Text style={styles.fieldLabel}>Full Name *</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={form.name}
                        onChangeText={v => setForm(f => ({ ...f, name: v }))}
                        placeholder="Student Name"
                        placeholderTextColor={colors.textMuted}
                      />

                      <Text style={styles.fieldLabel}>Roll Number</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={form.rollNumber}
                        onChangeText={v => setForm(f => ({ ...f, rollNumber: v }))}
                        placeholder="e.g. CS2026001"
                        placeholderTextColor={colors.textMuted}
                      />

                      <Text style={styles.fieldLabel}>Email Address *</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={form.email}
                        onChangeText={v => setForm(f => ({ ...f, email: v }))}
                        placeholder="student@example.com"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />

                      <View style={styles.editActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} disabled={saving}>
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                          {saving
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <><Save size={14} color="#fff" /><Text style={styles.saveBtnText}>Save</Text></>
                          }
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.editOpenBtn} onPress={() => setEditing(true)}>
                      <Edit3 size={15} color={colors.primary} />
                      <Text style={styles.editOpenText}>Edit Student Profile</Text>
                    </TouchableOpacity>
                  )
                )}
              </>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Sort Picker Bottom Sheet ──────────────────────────────────────────────────
const SortModal = ({ visible, current, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 32 }]}>
        <View style={styles.handle} />
        <Text style={[styles.sectionTitle, { marginBottom: spacing.sm }]}>Sort Students By</Text>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.sortOption, current === opt.value && styles.sortOptionActive]}
            onPress={() => { onSelect(opt.value); onClose(); }}
          >
            <Text style={[styles.sortOptionText, current === opt.value && { color: colors.primary, fontWeight: '800' }]}>
              {opt.label}
            </Text>
            {current === opt.value && <CheckCircle size={16} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </Modal>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────
const ClassRosterScreen = () => {
  const [rosterData, setRosterData] = useState({ subjectRoster: [], coordinatedRoster: null });
  const [activeTab, setActiveTab] = useState('subject');
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('default');
  const [showSort, setShowSort] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchRoster = async () => {
    try {
      const { data } = await api.get('/teacher/roster');
      setRosterData(data);
      // Always seed selectedSession so Subject Roster tab works
      if (data.subjectRoster?.length > 0 && !selectedSession) {
        setSelectedSession(data.subjectRoster[0]);
      }
      // Default to coordinator tab if available
      if (data.coordinatedRoster) {
        setActiveTab('coordinated');
      } else if (data.subjectRoster?.length > 0) {
        setActiveTab('subject');
      }
    } catch (err) {
      console.error('Roster fetch error:', err);
      Alert.alert('Error', 'Could not load class roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRoster(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchRoster(); }, []);

  const currentStudents = useMemo(() =>
    activeTab === 'coordinated'
      ? rosterData.coordinatedRoster?.students || []
      : selectedSession?.students || [],
  [activeTab, rosterData, selectedSession]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return currentStudents;
    const q = search.toLowerCase();
    return currentStudents.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }, [search, currentStudents]);

  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents];
    if (sortOption === 'att_desc') list.sort((a, b) => (b.attendancePercentage || 0) - (a.attendancePercentage || 0));
    else if (sortOption === 'att_asc') list.sort((a, b) => (a.attendancePercentage || 0) - (b.attendancePercentage || 0));
    else if (sortOption === 'name_asc') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sortOption === 'roll_asc') list.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
    return list;
  }, [filteredStudents, sortOption]);

  const isCoordinator = activeTab === 'coordinated';
  const hasCoordinated = !!rosterData.coordinatedRoster;

  const listTitle = activeTab === 'coordinated'
    ? `${rosterData.coordinatedRoster?.class?.className || 'Coordinated Class'} — All Students`
    : `${selectedSession?.class?.className || ''} · ${selectedSession?.subject?.subjectName || ''}`;

  const renderStudentCard = ({ item, index }) => {
    const pct = item.attendancePercentage ?? 0;
    const todayStatus = item.attendanceStatus;
    return (
      <TouchableOpacity
        style={[styles.studentCard, shadows.sm]}
        onPress={() => setSelectedStudent(item)}
        activeOpacity={0.75}
      >
        <Text style={styles.indexNum}>{index + 1}</Text>
        <View style={styles.avatar}>
          <GraduationCap size={18} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {item.rollNumber ? <Text style={styles.cardMeta}>{item.rollNumber}</Text> : null}
            {item.email ? <Text style={styles.cardMeta} numberOfLines={1}>{item.email}</Text> : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <AttBadge pct={pct} />
          {activeTab === 'subject' && todayStatus ? (
            <View style={[styles.statusPill,
              { backgroundColor: todayStatus === 'present' ? colors.success + '20' : colors.danger + '20' }
            ]}>
              {todayStatus === 'present'
                ? <CheckCircle size={10} color={colors.success} />
                : <XCircle size={10} color={colors.danger} />
              }
              <Text style={[styles.statusPillText,
                { color: todayStatus === 'present' ? colors.success : colors.danger }
              ]}>
                {todayStatus.toUpperCase()}
              </Text>
            </View>
          ) : activeTab === 'subject' ? (
            <View style={[styles.statusPill, { backgroundColor: colors.bgElevated }]}>
              <Clock size={10} color={colors.textMuted} />
              <Text style={[styles.statusPillText, { color: colors.textMuted }]}>UNMARKED</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Class Roster" subtitle="Campus Directory" />

      {/* Tab Toggle */}
      {hasCoordinated && (
        <View style={styles.tabRow}>
          {[
            { id: 'coordinated', label: 'Class Coordinator' },
            { id: 'subject',     label: 'Subject Roster' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Subject Picker Pills */}
      {activeTab === 'subject' && rosterData.subjectRoster.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroll}
          contentContainerStyle={styles.pillRow}
        >
          {rosterData.subjectRoster.map(session => {
            const isSel = selectedSession?.allocationId === session.allocationId;
            return (
              <TouchableOpacity
                key={session.allocationId}
                style={[styles.pill, isSel && styles.pillActive]}
                onPress={() => setSelectedSession(session)}
                activeOpacity={0.8}
              >
                <BookOpen size={12} color={isSel ? '#fff' : colors.textMuted} />
                <Text style={[styles.pillText, isSel && styles.pillTextActive]} numberOfLines={1}>
                  {session.class?.className} · {session.subject?.subjectName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Search + Sort */}
      <View style={styles.controlRow}>
        <View style={styles.searchBox}>
          <Search size={14} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, roll, email…"
            placeholderTextColor={colors.textMuted}
            cursorColor={colors.primary}
            selectionColor={colors.primary + '40'}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(true)}>
          <ArrowUpDown size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* List Meta */}
      {!loading && (
        <View style={styles.listMeta}>
          <Text style={styles.listTitle} numberOfLines={1}>{listTitle}</Text>
          <Text style={styles.listCount}>{sortedStudents.length} students</Text>
        </View>
      )}

      {/* FlatList */}
      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={sortedStudents}
          keyExtractor={(item, i) => item._id?.toString() || i.toString()}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Users size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search term.' : 'No students enrolled in this section.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modals */}
      {selectedStudent && (
        <ProfileModal
          student={selectedStudent}
          isCoordinator={isCoordinator}
          onClose={() => setSelectedStudent(null)}
          onSaved={() => { setSelectedStudent(null); fetchRoster(); }}
        />
      )}
      <SortModal
        visible={showSort}
        current={sortOption}
        onSelect={setSortOption}
        onClose={() => setShowSort(false)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: radius.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.sm, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff', fontWeight: '800' },

  pillScroll: {
    flexGrow: 0,
    marginBottom: spacing.xs,
  },
  pillRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 32,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted, maxWidth: 160 },
  pillTextActive: { color: '#fff', fontWeight: '800' },

  controlRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 9, gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.sm,
    padding: 0,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  sortBtn: {
    backgroundColor: colors.bgElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: 10,
  },

  listMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingBottom: spacing.xs,
  },
  listTitle: { ...typography.sm, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  listCount: { ...typography.xs, color: colors.textMuted, marginLeft: 8 },

  list: { padding: spacing.md, paddingTop: 4, paddingBottom: 40 },

  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.primary, gap: 10,
  },
  indexNum: { ...typography.xs, color: colors.textMuted, width: 20, textAlign: 'center', fontWeight: '700' },
  avatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardName: { ...typography.sm, fontWeight: '800', color: colors.textPrimary },
  cardMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  attBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  attBadgeText: { fontSize: 12, fontWeight: '800' },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  statusPillText: { fontSize: 9, fontWeight: '800' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12, paddingBottom: 40 },
  emptyTitle: { ...typography.base, fontWeight: '700', color: colors.textSecondary },
  emptySubtitle: { ...typography.sm, color: colors.textMuted, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },

  modalHeader: { alignItems: 'center', marginBottom: spacing.md },
  modalAvatar: { width: 68, height: 68, borderRadius: 18, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  modalName: { ...typography.xl, fontWeight: '800', color: colors.textPrimary },
  modalSub: { ...typography.sm, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  kpiCard: { flex: 1, backgroundColor: colors.bgElevated, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  kpiVal: { ...typography.base, fontWeight: '800', color: colors.textPrimary },
  kpiLbl: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoText: { ...typography.sm, color: colors.textPrimary, flex: 1 },

  section: { marginTop: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  sectionTitle: { ...typography.sm, fontWeight: '800', color: colors.textPrimary },

  subBarWrapper: { marginBottom: spacing.sm },
  subBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  subBarName: { ...typography.sm, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  subBarPct: { fontSize: 13, fontWeight: '800' },
  subBarTrack: { height: 8, backgroundColor: colors.bgInput, borderRadius: 4, overflow: 'hidden' },
  subBarFill: { height: '100%', borderRadius: 4 },
  subBarMeta: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  editOpenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '44',
    borderRadius: radius.md, paddingVertical: 12, marginTop: spacing.md,
  },
  editOpenText: { ...typography.sm, fontWeight: '700', color: colors.primary },

  editBox: { backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  editBoxTitle: { ...typography.sm, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginTop: 8, marginBottom: 4 },
  fieldInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...typography.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelBtnText: { ...typography.xs, color: colors.textSecondary },
  saveBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: radius.sm },
  saveBtnText: { ...typography.xs, fontWeight: '800', color: '#fff' },

  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: spacing.sm, borderRadius: radius.md, marginBottom: 2 },
  sortOptionActive: { backgroundColor: colors.primary + '14' },
  sortOptionText: { ...typography.sm, color: colors.textPrimary, fontWeight: '600' },
});

export default ClassRosterScreen;

