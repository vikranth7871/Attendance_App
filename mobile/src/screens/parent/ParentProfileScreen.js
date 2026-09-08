import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, Lock, Mail, Phone, MapPin, ShieldCheck,
  Save, LogOut, Users, GraduationCap, Hash, AlertCircle
} from 'lucide-react-native';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ParentProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const [children, setChildren] = useState([]);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergency_contact || user?.emergencyContact || '');
  const [address, setAddress] = useState(user?.address || '');
  const [relationship, setRelationship] = useState(user?.relationship || 'Parent / Guardian');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      setChildren(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch linked children error:', err);
    }
  };

  useEffect(() => {
    fetchChildren();
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmergencyContact(user.emergency_contact || user.emergencyContact || '');
      setAddress(user.address || '');
      setRelationship(user.relationship || 'Parent / Guardian');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }
    setSavingProfile(true);
    try {
      await api.put('/parent/profile', {
        name: name.trim(),
        phone: phone.trim(),
        emergencyContact: emergencyContact.trim(),
        address: address.trim(),
        relationship: relationship.trim(),
      });
      Alert.alert('✅ Success', 'Guardian profile details updated successfully.');
    } catch (err) {
      console.error('Profile update error:', err);
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/parent/change-password', { currentPassword, newPassword });
      Alert.alert('✅ Success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      Alert.alert('Failed', err.response?.data?.message || 'Failed to update security password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out from Parent Portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Profile & Security Settings"
        subtitle="Manage contact details and account security"
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Guardian Profile Hero Card */}
        <View style={[styles.heroCard, shadows.md]}>
          <LinearGradient
            colors={colors.gradientPrimary || ['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarText}>{(name || 'G').charAt(0).toUpperCase()}</Text>
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{name || 'Guardian'}</Text>
            <Text style={styles.heroEmail}>{user?.email || 'parent@school.edu'}</Text>
            <View style={styles.relationPill}>
              <ShieldCheck size={12} color={colors.primaryLight} />
              <Text style={styles.relationPillText}>{relationship || 'Parent / Guardian'}</Text>
            </View>
          </View>
        </View>

        {/* Linked Wards Section */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}>
            <Users size={18} color={colors.primaryLight} />
            <Text style={styles.cardTitle}>Linked Students ({children.length})</Text>
          </View>

          {children.length === 0 ? (
            <Text style={styles.noChildrenText}>No linked students associated with this guardian account.</Text>
          ) : (
            children.map((child, idx) => (
              <View key={child.id || idx} style={styles.childItem}>
                <LinearGradient
                  colors={colors.gradientPrimary || ['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.childAvatar}
                >
                  <Text style={styles.childAvatarText}>{(child.name || 'S').charAt(0).toUpperCase()}</Text>
                </LinearGradient>

                <View style={{ flex: 1 }}>
                  <Text style={styles.childItemName}>{child.name}</Text>
                  <Text style={styles.childItemMeta}>
                    {child.classInfo?.className || child.classInfo?.name || 'Class Student'} • Sec {child.section || 'A'}
                  </Text>
                  <Text style={styles.childItemRoll}>Roll No: {child.rollNumber || child.roll_number || 'STU001'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Guardian Contact Details Form */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}>
            <User size={18} color={colors.primaryLight} />
            <Text style={styles.cardTitle}>Guardian Profile Information</Text>
          </View>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={styles.fieldLabel}>Email Address (Account ID)</Text>
          <View style={[styles.inputBox, styles.inputDisabled]}>
            <TextInput
              style={[styles.input, { color: colors.textMuted }]}
              value={user?.email || ''}
              editable={false}
            />
          </View>

          <Text style={styles.fieldLabel}>Phone Number</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.fieldLabel}>Emergency Contact</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              placeholder="Emergency Contact Number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.fieldLabel}>Residential Address</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Residential Street Address"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={styles.fieldLabel}>Relationship to Ward</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={relationship}
              onChangeText={setRelationship}
              placeholder="Father / Mother / Guardian"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, savingProfile && { opacity: 0.6 }]}
            onPress={handleUpdateProfile}
            disabled={savingProfile}
            activeOpacity={0.8}
          >
            {savingProfile ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save Profile Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Change Security Password Form */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}>
            <Lock size={18} color={colors.primaryLight} />
            <Text style={styles.cardTitle}>Change Security Password</Text>
          </View>

          <Text style={styles.fieldLabel}>Current Password</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <Text style={styles.fieldLabel}>New Password</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <Text style={styles.fieldLabel}>Confirm New Password</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, savingPassword && { opacity: 0.6 }]}
            onPress={handleChangePassword}
            disabled={savingPassword}
            activeOpacity={0.8}
          >
            {savingPassword ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Lock size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Log Out CTA */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.logoutBtnText}>Log Out from Parent Portal</Text>
        </TouchableOpacity>

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
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroName: {
    ...typography.lg,
    ...typography.bold,
    color: colors.textPrimary,
  },
  heroEmail: {
    ...typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  relationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: radius.full,
  },
  relationPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  childItemName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  childItemMeta: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  childItemRoll: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  noChildrenText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  input: {
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: radius.md,
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.danger,
  },
});

export default ParentProfileScreen;
