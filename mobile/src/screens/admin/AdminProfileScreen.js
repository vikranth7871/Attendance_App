import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LogOut,
  Shield,
  User,
  Lock,
  Building,
  CheckCircle,
  Save,
  Key,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import api from '../../api/client';

const AdminProfileScreen = () => {
  const { user, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [universityEmail, setUniversityEmail] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/admin/settings');
        if (Array.isArray(data)) {
          const setting = data.find((s) => s.key === 'universityEmail');
          if (setting) setUniversityEmail(setting.value || '');
        }
      } catch (err) {
        console.error('Error fetching admin settings:', err);
      }
    };
    fetchSettings();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!name.trim() || !email.trim()) { Alert.alert('Validation Error', 'Name and email cannot be blank.'); return; }
    setSavingProfile(true);
    try {
      await api.put('/admin/profile', { name: name.trim(), email: email.trim() });
      Alert.alert('Success', 'Admin profile updated successfully.');
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not update profile.');
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { Alert.alert('Validation Error', 'Please fill in all password fields.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Validation Error', 'New passwords do not match.'); return; }
    if (newPassword.length < 6) { Alert.alert('Validation Error', 'Password must be at least 6 characters.'); return; }
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      Alert.alert('Password Change Failed', err.response?.data?.message || 'Failed to update password.');
    } finally { setSavingPassword(false); }
  };

  const handleUpdateSettings = async () => {
    if (!universityEmail.trim()) { Alert.alert('Validation Error', 'Please enter a valid institution email.'); return; }
    setSavingSettings(true);
    try {
      await api.put('/admin/settings', { settings: [{ key: 'universityEmail', value: universityEmail.trim() }] });
      Alert.alert('Success', 'Institution settings updated successfully.');
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not update institution settings.');
    } finally { setSavingSettings(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Admin Profile & Settings" showLogout={false} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={colors.gradientAdmin} style={styles.banner}>
          <View style={styles.avatarCircle}><Shield size={40} color="#fff" /></View>
          <Text style={styles.bannerName}>{name || 'Administrator'}</Text>
          <View style={styles.rolePill}><Text style={styles.rolePillText}>System Administrator</Text></View>
        </LinearGradient>

        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}><User size={18} color={colors.primary} /><Text style={styles.cardTitle}>Account Details</Text></View>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Administrator Name" placeholderTextColor={colors.textMuted} /></View>
          <Text style={styles.label}>Official Email</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="admin@example.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" /></View>
          <TouchableOpacity style={[styles.saveBtn, savingProfile && styles.btnDisabled]} onPress={handleUpdateProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={styles.saveBtnText}>Save Account Details</Text></>}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}><Key size={18} color={colors.warning} /><Text style={styles.cardTitle}>Change Password</Text></View>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" placeholderTextColor={colors.textMuted} secureTextEntry /></View>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password (min 6 chars)" placeholderTextColor={colors.textMuted} secureTextEntry /></View>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor={colors.textMuted} secureTextEntry /></View>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.warning }, savingPassword && styles.btnDisabled]} onPress={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <><Lock size={16} color="#fff" /><Text style={styles.saveBtnText}>Update Password</Text></>}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}><Building size={18} color={colors.secondary} /><Text style={styles.cardTitle}>Institution Settings</Text></View>
          <Text style={styles.label}>University / Institution Contact Email</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={universityEmail} onChangeText={setUniversityEmail} placeholder="contact@university.edu" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" /></View>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.secondary }, savingSettings && styles.btnDisabled]} onPress={handleUpdateSettings} disabled={savingSettings}>
            {savingSettings ? <ActivityIndicator size="small" color="#fff" /> : <><CheckCircle size={16} color="#fff" /><Text style={styles.saveBtnText}>Save Institution Setting</Text></>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.logoutBtn, shadows.sm]} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out of System</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  banner: { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  bannerName: { ...typography.xl, ...typography.bold, color: '#fff', marginBottom: spacing.xs },
  rolePill: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  rolePillText: { ...typography.sm, color: '#fff', fontWeight: '700' },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  cardTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  label: { ...typography.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  inputBox: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  input: { ...typography.sm, color: colors.textPrimary, paddingVertical: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.md, marginTop: spacing.xs },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { ...typography.sm, ...typography.bold, color: '#fff' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.danger + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.danger + '33', marginTop: spacing.sm },
  logoutText: { ...typography.base, ...typography.semibold, color: colors.danger },
});

export default AdminProfileScreen;
