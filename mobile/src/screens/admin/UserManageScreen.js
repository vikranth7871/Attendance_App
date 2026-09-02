import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, GraduationCap, UserCheck, Users, X, Mail, Phone, ChevronDown } from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ROLE_COLORS = {
  student: colors.student,
  teacher: colors.teacher,
  parent: colors.parent,
  admin: colors.admin,
};

const ROLE_ICONS = {
  student: GraduationCap,
  teacher: UserCheck,
  parent: Users,
};

const TABS = ['All', 'Students', 'Teachers', 'Parents'];

const UserCard = ({ user, onPress }) => {
  const roleColor = ROLE_COLORS[user.role] || colors.primary;
  const Icon = ROLE_ICONS[user.role] || Users;

  return (
    <TouchableOpacity style={[styles.userCard, shadows.sm]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.userAvatar, { backgroundColor: roleColor + '22' }]}>
        <Icon size={20} color={roleColor} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name || `${user.first_name} ${user.last_name}`}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.class_name && <Text style={styles.userMeta}>{user.class_name} • {user.department_name}</Text>}
      </View>
      <View style={[styles.roleBadge, { backgroundColor: roleColor + '22' }]}>
        <Text style={[styles.roleText, { color: roleColor }]}>{user.role}</Text>
      </View>
    </TouchableOpacity>
  );
};

const UserManageScreen = () => {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', phone: '', roll_number: '' });

  const fetchUsers = async () => {
    try {
      const [studRes, teachRes, parentRes] = await Promise.all([
        api.get('/admin/students').catch(() => ({ data: [] })),
        api.get('/admin/teachers').catch(() => ({ data: [] })),
        api.get('/admin/parents').catch(() => ({ data: [] })),
      ]);
      const all = [
        ...(studRes.data || []).map(u => ({ ...u, role: 'student' })),
        ...(teachRes.data || []).map(u => ({ ...u, role: 'teacher' })),
        ...(parentRes.data || []).map(u => ({ ...u, role: 'parent' })),
      ];
      setUsers(all);
      setFiltered(all);
    } catch (err) {
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    let list = users;
    if (activeTab !== 'All') {
      list = list.filter(u => u.role === activeTab.slice(0, -1).toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.name || `${u.first_name} ${u.last_name}`).toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [search, activeTab, users]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, []);

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      Alert.alert('Required Fields', 'Name and email are required.');
      return;
    }
    try {
      await api.put(`/admin/update-user/${editForm.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        roll_number: editForm.roll_number.trim(),
      });
      setShowEditModal(false);
      Alert.alert('Success', 'User profile updated successfully.');
      fetchUsers();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name || user.email}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/user/${user.id}`);
              setSelectedUser(null);
              Alert.alert('Success', 'User deleted successfully.');
              fetchUsers();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete user.');
            }
          }
        }
      ]
    );
  };

  const handleResetPassword = (user) => {
    Alert.prompt
      ? Alert.prompt(
          'Reset Password',
          `Enter a new password for ${user.name || user.email}:`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              onPress: async (newPass) => {
                if (!newPass || newPass.length < 6) {
                  Alert.alert('Weak Password', 'Password must be at least 6 characters.');
                  return;
                }
                try {
                  await api.put(`/admin/update-user/${user.id}`, { password: newPass });
                  Alert.alert('Success', 'Password reset successfully.');
                } catch (err) {
                  Alert.alert('Error', err.response?.data?.message || 'Failed to reset password.');
                }
              }
            }
          ],
          'secure-text'
        )
      : Alert.alert(
          'Reset Password',
          'Password will be reset to default (password123)',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm Reset',
              onPress: async () => {
                try {
                  await api.put(`/admin/update-user/${user.id}`, { password: 'password123' });
                  Alert.alert('Success', 'Password has been reset to "password123".');
                } catch (err) {
                  Alert.alert('Error', err.response?.data?.message || 'Failed to reset password.');
                }
              }
            }
          ]
        );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="User Management" subtitle={`${users.length} total users`} />

      {/* Search */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.textMuted}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => (
            <UserCard user={item} onPress={() => setSelectedUser(item)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Users size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}

      {/* User Detail Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide" onRequestClose={() => setSelectedUser(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedUser(null)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalAvatar, { backgroundColor: (ROLE_COLORS[selectedUser.role] || colors.primary) + '22' }]}>
                    {(() => { const Icon = ROLE_ICONS[selectedUser.role] || Users; return <Icon size={30} color={ROLE_COLORS[selectedUser.role] || colors.primary} />; })()}
                  </View>
                  <Text style={styles.modalName}>{selectedUser.name || `${selectedUser.first_name} ${selectedUser.last_name}`}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[selectedUser.role] || colors.primary) + '22' }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLORS[selectedUser.role] || colors.primary }]}>{selectedUser.role}</Text>
                  </View>
                </View>
                <View style={styles.modalDetails}>
                  <InfoRow icon={<Mail size={16} color={colors.textMuted} />} label="Email" value={selectedUser.email} />
                  {selectedUser.phone && <InfoRow icon={<Phone size={16} color={colors.textMuted} />} label="Phone" value={selectedUser.phone} />}
                  {selectedUser.class_name && <InfoRow label="Class" value={selectedUser.class_name} />}
                  {selectedUser.department_name && <InfoRow label="Department" value={selectedUser.department_name} />}
                  {selectedUser.roll_number && <InfoRow label="Roll Number" value={selectedUser.roll_number} />}
                </View>

                {/* Actions */}
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.editActionBtn]}
                    onPress={() => {
                      setEditForm({
                        id: selectedUser.id,
                        name: selectedUser.name || `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim(),
                        email: selectedUser.email,
                        phone: selectedUser.phone || '',
                        roll_number: selectedUser.roll_number || '',
                      });
                      setSelectedUser(null);
                      setShowEditModal(true);
                    }}
                  >
                    <Text style={styles.editActionBtnText}>Edit Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.resetActionBtn]}
                    onPress={() => handleResetPassword(selectedUser)}
                  >
                    <Text style={styles.resetActionBtnText}>Reset Password</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.deleteActionBtn]}
                    onPress={() => handleDeleteUser(selectedUser)}
                  >
                    <Text style={styles.deleteActionBtnText}>Delete User</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit User Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.editModalTitle}>Edit User</Text>

            <Text style={styles.formLabel}>Full Name</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.name}
              onChangeText={v => setEditForm(f => ({ ...f, name: v }))}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.email}
              onChangeText={v => setEditForm(f => ({ ...f, email: v }))}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
            />

            <Text style={styles.formLabel}>Phone (Optional)</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.phone}
              onChangeText={v => setEditForm(f => ({ ...f, phone: v }))}
              placeholder="Phone"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.formLabel}>Roll Number / ID</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.roll_number}
              onChangeText={v => setEditForm(f => ({ ...f, roll_number: v }))}
              placeholder="Roll Number"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.formCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formSaveBtn} onPress={handleSaveEdit}>
                <Text style={styles.formSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    {icon && <View style={styles.infoIcon}>{icon}</View>}
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.sm,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary + '55',
  },
  tabText: { ...typography.sm, color: colors.textMuted },
  tabTextActive: { color: colors.primary, ...typography.semibold },
  list: { padding: spacing.md, paddingTop: 0 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  userInfo: { flex: 1 },
  userName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  userEmail: { ...typography.sm, color: colors.textSecondary, marginTop: 2 },
  userMeta: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
  },
  modalHeader: { alignItems: 'center', marginBottom: spacing.lg },
  modalAvatar: {
    width: 70, height: 70, borderRadius: 35,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  modalName: { ...typography.xl, ...typography.bold, color: colors.textPrimary, marginBottom: 6 },
  modalDetails: { gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: { width: 24, alignItems: 'center' },
  infoLabel: { ...typography.sm, color: colors.textMuted, width: 100 },
  infoValue: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  // Modal Action Buttons
  modalActionButtons: { marginTop: spacing.lg, gap: spacing.xs },
  modalActionBtn: { paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', borderWidth: 1 },
  editActionBtn: { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' },
  editActionBtnText: { ...typography.sm, ...typography.semibold, color: colors.primary },
  resetActionBtn: { backgroundColor: colors.warning + '18', borderColor: colors.warning + '44' },
  resetActionBtnText: { ...typography.sm, ...typography.semibold, color: colors.warning },
  deleteActionBtn: { backgroundColor: colors.danger + '18', borderColor: colors.danger + '44' },
  deleteActionBtnText: { ...typography.sm, ...typography.semibold, color: colors.danger },
  // Edit Form
  editModalTitle: { ...typography.xl, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  formLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: spacing.xs },
  formInput: { backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.sm, paddingHorizontal: spacing.md, paddingVertical: 8, marginBottom: spacing.xs },
  formButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  formCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bgElevated, alignItems: 'center' },
  formCancelText: { ...typography.sm, ...typography.semibold, color: colors.textSecondary },
  formSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  formSaveText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default UserManageScreen;
