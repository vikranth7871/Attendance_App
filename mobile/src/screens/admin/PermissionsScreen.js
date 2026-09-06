import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  Check,
  Lock,
  Users,
  Key,
  User,
  Search,
  Building,
  Save,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react-native';
import Header from '../../components/Header';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ALL_PERMISSIONS = [
  { id: 'markAttendance', label: 'Mark Attendance', desc: 'Can mark daily student attendance records', category: 'General' },
  { id: 'manualAttendance', label: 'Manual Attendance', desc: 'Can override and record manual attendance', category: 'General' },
  { id: 'viewAttendance', label: 'View Attendance', desc: 'Can view class-wide attendance sheets', category: 'General' },
  { id: 'editAttendance', label: 'Edit Attendance', desc: 'Can modify already finalized attendance', category: 'Security' },
  { id: 'deleteAttendance', label: 'Delete Attendance', desc: 'Can delete recorded attendance sessions', category: 'Security' },
  { id: 'exportAttendance', label: 'Export Data', desc: 'Can export CSV and PDF attendance reports', category: 'General' },
  { id: 'bypassTimeRestraint', label: 'Bypass Time Limits', desc: 'Can mark attendance outside timetable schedule', category: 'Security' },
  { id: 'applyLeave', label: 'Apply Leave', desc: 'Can submit leave requests to administrators', category: 'General' },
  { id: 'viewReports', label: 'View Reports', desc: 'Can view administrative charts and summaries', category: 'General' },
  { id: 'manageStudents', label: 'Manage Students', desc: 'Can edit student info and class rosters', category: 'Management' },
  { id: 'manageSystem', label: 'Manage System', desc: 'Full institutional administrative access', category: 'Management' },
];

const PermissionsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('individual');
  const [departments, setDepartments] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [individualPerms, setIndividualPerms] = useState([]);
  const [savingIndividual, setSavingIndividual] = useState(false);

  const [bulkDept, setBulkDept] = useState('');
  const [bulkRole, setBulkRole] = useState('teacher');
  const [bulkPerms, setBulkPerms] = useState(['markAttendance', 'manualAttendance', 'viewAttendance', 'applyLeave']);
  const [savingBulk, setSavingBulk] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/admin/departments');
      const list = Array.isArray(data) ? data : [];
      setDepartments(list);
      if (list.length > 0 && !bulkDept) {
        setBulkDept(list[0].id?.toString() || list[0]._id?.toString() || '');
      }
    } catch (err) {
      console.error('Fetch departments error:', err);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const [teachRes, studRes] = await Promise.all([
        api.get('/admin/teachers').catch(() => ({ data: [] })),
        api.get('/admin/students').catch(() => ({ data: [] })),
      ]);

      const all = [
        ...(Array.isArray(teachRes.data) ? teachRes.data : []).map(u => ({ ...u, role: 'teacher' })),
        ...(Array.isArray(studRes.data) ? studRes.data : []).map(u => ({ ...u, role: 'student' })),
      ];

      const q = searchQuery.toLowerCase().trim();
      const matches = all.filter(u =>
        (u.name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );

      setSearchResults(matches);
      if (matches.length === 0) {
        Alert.alert('No Results', 'No users found matching your search query.');
      }
    } catch (err) {
      Alert.alert('Search Error', 'Failed to search users.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    const existing = Array.isArray(user.permissions) ? user.permissions : [];
    setIndividualPerms(existing);
    setSearchResults([]);
  };

  const toggleIndividualPerm = (permId) => {
    setIndividualPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const toggleBulkPerm = (permId) => {
    setBulkPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSaveIndividual = async () => {
    if (!selectedUser) return;
    setSavingIndividual(true);
    try {
      await api.put(`/admin/user/${selectedUser.id || selectedUser._id}/permissions`, {
        permissions: individualPerms,
      });
      Alert.alert('Success', `Permissions updated for ${selectedUser.name || selectedUser.email}.`);
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not update user permissions.');
    } finally {
      setSavingIndividual(false);
    }
  };

  const handleSaveBulk = async () => {
    if (!bulkDept) {
      Alert.alert('Validation Error', 'Please select a department.');
      return;
    }
    setSavingBulk(true);
    try {
      const { data } = await api.post('/admin/assign-permissions', {
        departmentId: bulkDept,
        department: bulkDept,
        role: bulkRole,
        permissions: bulkPerms,
      });
      Alert.alert('Bulk Update Success', data.message || 'Permissions updated successfully.');
    } catch (err) {
      Alert.alert('Bulk Update Failed', err.response?.data?.message || 'Could not assign permissions.');
    } finally {
      setSavingBulk(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Role Access & Permissions"
        subtitle="Institutional RBAC & Privilege Control"
        navigation={navigation}
      />

      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeBtn, activeTab === 'individual' && styles.modeBtnActive]}
          onPress={() => setActiveTab('individual')}
        >
          <User size={15} color={activeTab === 'individual' ? '#fff' : colors.textMuted} />
          <Text style={[styles.modeBtnText, activeTab === 'individual' && styles.modeBtnTextActive]}>
            Individual User
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, activeTab === 'bulk' && styles.modeBtnActive]}
          onPress={() => setActiveTab('bulk')}
        >
          <Building size={15} color={activeTab === 'bulk' ? '#fff' : colors.textMuted} />
          <Text style={[styles.modeBtnText, activeTab === 'bulk' && styles.modeBtnTextActive]}>
            Department Bulk
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'individual' ? (
          <>
            <View style={[styles.card, shadows.sm]}>
              <Text style={styles.cardHeaderTitle}>Select User to Manage</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search staff or student by name or email..."
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={handleSearchUsers}
                />
                <TouchableOpacity
                  style={styles.searchActionBtn}
                  onPress={handleSearchUsers}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Search size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {searchResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  <Text style={styles.resultsHeading}>Search Results ({searchResults.length}):</Text>
                  {searchResults.map(user => (
                    <TouchableOpacity
                      key={user.id || user._id}
                      style={styles.resultItem}
                      onPress={() => handleSelectUser(user)}
                    >
                      <View>
                        <Text style={styles.resultName}>{user.name || `${user.first_name} ${user.last_name}`}</Text>
                        <Text style={styles.resultEmail}>{user.email} • {user.role}</Text>
                      </View>
                      <Check size={16} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {selectedUser && (
              <View style={[styles.selectedUserBanner, shadows.sm]}>
                <View style={styles.selectedUserTop}>
                  <View style={styles.avatarMini}>
                    <User size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
                    <Text style={styles.selectedUserSub}>{selectedUser.email} • {selectedUser.role.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedUser(null)}>
                    <X size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.quickToggleRow}>
                  <TouchableOpacity
                    onPress={() => setIndividualPerms(ALL_PERMISSIONS.map(p => p.id))}
                  >
                    <Text style={styles.quickToggleText}>Grant All</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.border }}>|</Text>
                  <TouchableOpacity
                    onPress={() => setIndividualPerms([])}
                  >
                    <Text style={[styles.quickToggleText, { color: colors.danger }]}>Revoke All</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedUser ? (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.sectionHeading}>Assigned Capabilities</Text>
                {ALL_PERMISSIONS.map((perm) => {
                  const enabled = individualPerms.includes(perm.id);
                  const isSecurity = perm.category === 'Security';
                  return (
                    <View key={perm.id} style={[styles.permCard, shadows.sm]}>
                      <View style={styles.permInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Lock size={14} color={enabled ? colors.success : colors.textMuted} />
                          <Text style={styles.permLabel}>{perm.label}</Text>
                          {isSecurity && (
                            <View style={styles.securityBadge}>
                              <Text style={styles.securityBadgeText}>SECURITY</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.permDesc}>{perm.desc}</Text>
                      </View>
                      <Switch
                        value={enabled}
                        onValueChange={() => toggleIndividualPerm(perm.id)}
                        trackColor={{ false: colors.bgElevated, true: colors.success + '66' }}
                        thumbColor={enabled ? colors.success : colors.textMuted}
                      />
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={styles.saveMainBtn}
                  onPress={handleSaveIndividual}
                  disabled={savingIndividual}
                >
                  {savingIndividual ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Save size={18} color="#fff" />
                      <Text style={styles.saveMainBtnText}>Save User Permissions</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.guideCard}>
                <Shield size={36} color={colors.primary} />
                <Text style={styles.guideTitle}>Search a User to Manage Permissions</Text>
                <Text style={styles.guideDesc}>
                  Select any faculty member, student, or coordinator above to inspect their granted capabilities and update their RBAC roles.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View>
            <View style={[styles.card, shadows.sm]}>
              <Text style={styles.cardHeaderTitle}>Department & Role Scope</Text>

              <Text style={styles.inputSubLabel}>Target Department</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {departments.map((d) => {
                    const idStr = d.id?.toString() || d._id?.toString();
                    const selected = bulkDept === idStr;
                    return (
                      <TouchableOpacity
                        key={idStr}
                        style={[styles.deptChip, selected && styles.deptChipActive]}
                        onPress={() => setBulkDept(idStr)}
                      >
                        <Text style={[styles.deptChipText, selected && styles.deptChipTextActive]}>
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={styles.inputSubLabel}>Target Role</Text>
              <View style={styles.rolePickerRow}>
                {['teacher', 'student', 'parent'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rolePickerBtn, bulkRole === r && styles.rolePickerBtnActive]}
                    onPress={() => setBulkRole(r)}
                  >
                    <Text style={[styles.rolePickerBtnText, bulkRole === r && styles.rolePickerBtnTextActive]}>
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginTop: spacing.sm }}>
              <View style={styles.sectionHeaderBetween}>
                <Text style={styles.sectionHeading}>Grant Permissions in Bulk</Text>
                <TouchableOpacity onPress={() => setBulkPerms(ALL_PERMISSIONS.map(p => p.id))}>
                  <Text style={styles.quickToggleText}>Select All</Text>
                </TouchableOpacity>
              </View>

              {ALL_PERMISSIONS.map((perm) => {
                const enabled = bulkPerms.includes(perm.id);
                const isSecurity = perm.category === 'Security';
                return (
                  <View key={perm.id} style={[styles.permCard, shadows.sm]}>
                    <View style={styles.permInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Lock size={14} color={enabled ? colors.primary : colors.textMuted} />
                        <Text style={styles.permLabel}>{perm.label}</Text>
                        {isSecurity && (
                          <View style={styles.securityBadge}>
                            <Text style={styles.securityBadgeText}>SECURITY</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.permDesc}>{perm.desc}</Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={() => toggleBulkPerm(perm.id)}
                      trackColor={{ false: colors.bgElevated, true: colors.primary + '66' }}
                      thumbColor={enabled ? colors.primary : colors.textMuted}
                    />
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.saveMainBtn}
                onPress={handleSaveBulk}
                disabled={savingBulk}
              >
                {savingBulk ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Users size={18} color="#fff" />
                    <Text style={styles.saveMainBtnText}>Apply to All {bulkRole.toUpperCase()}s in Department</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: radius.lg,
    padding: 3,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    ...typography.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  content: {
    padding: spacing.md,
    paddingTop: 0,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderTitle: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    color: colors.textPrimary,
    ...typography.sm,
  },
  searchActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
  },
  resultsContainer: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  resultsHeading: {
    ...typography.xs,
    color: colors.textMuted,
    marginBottom: 6,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  resultName: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  resultEmail: {
    ...typography.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  selectedUserBanner: {
    backgroundColor: colors.primary + '18',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '35',
    marginBottom: spacing.sm,
  },
  selectedUserTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedUserName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  selectedUserSub: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  quickToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.primary + '25',
  },
  quickToggleText: {
    ...typography.xs,
    color: colors.primary,
    fontWeight: '700',
  },
  sectionHeading: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  permCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  permLabel: {
    ...typography.sm,
    ...typography.semibold,
    color: colors.textPrimary,
  },
  permDesc: {
    ...typography.xs,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  securityBadge: {
    backgroundColor: colors.danger + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  securityBadgeText: {
    fontSize: 9,
    color: colors.danger,
    fontWeight: '700',
  },
  saveMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  saveMainBtnText: {
    ...typography.sm,
    ...typography.bold,
    color: '#fff',
  },
  guideCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  guideTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  guideDesc: {
    ...typography.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputSubLabel: {
    ...typography.xs,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  deptChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  deptChipText: {
    ...typography.xs,
    color: colors.textMuted,
  },
  deptChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rolePickerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rolePickerBtnActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  rolePickerBtnText: {
    ...typography.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  rolePickerBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default PermissionsScreen;
