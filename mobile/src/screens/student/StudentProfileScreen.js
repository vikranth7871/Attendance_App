import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut,
  Award,
  Gamepad2,
  Lock,
  Key,
  BookOpen,
  GraduationCap,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const StudentProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Student Profile" showLogout={false} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={colors.gradientStudent} style={styles.banner}>
          <View style={styles.avatarCircle}><Award size={38} color="#fff" /></View>
          <Text style={styles.name}>{user?.name || 'Student'}</Text>
          <View style={styles.pill}><Text style={styles.pillText}>Undergraduate Student</Text></View>
        </LinearGradient>

        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeaderRow}><GraduationCap size={18} color={colors.student} /><Text style={styles.cardTitle}>Academic Records</Text></View>
          <Row label="Official Email" value={user?.email} />
          <Row label="Roll Number" value={user?.roll_number || user?.rollNumber} />
          <Row label="Enrolled Class" value={user?.class_name || user?.className} />
          <Row label="Department" value={user?.department_name || user?.departmentName || 'Computer Science'} />
          <Row label="Class Section" value={user?.section || 'Sec A'} />
        </View>

        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeaderRow}><Key size={18} color={colors.warning} /><Text style={styles.cardTitle}>Change Password</Text></View>
          <Text style={styles.fieldLabel}>Current Password</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" placeholderTextColor={colors.textMuted} secureTextEntry /></View>
          <Text style={styles.fieldLabel}>New Password</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password (min 6 chars)" placeholderTextColor={colors.textMuted} secureTextEntry /></View>
          <Text style={styles.fieldLabel}>Confirm New Password</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor={colors.textMuted} secureTextEntry /></View>
          <TouchableOpacity style={[styles.saveBtn, savingPassword && styles.btnDisabled]} onPress={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <><Lock size={16} color="#fff" /><Text style={styles.saveBtnText}>Update Password</Text></>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('StudentSubjects')} activeOpacity={0.8}>
          <BookOpen size={20} color={colors.secondary} />
          <Text style={[styles.actionBtnText, { color: colors.secondary }]}>My Enrolled Courses</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('QuizHub')} activeOpacity={0.8}>
          <Gamepad2 size={20} color={colors.student} />
          <Text style={[styles.actionBtnText, { color: colors.student }]}>Quiz Arena</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('StudentResults')} activeOpacity={0.8}>
          <Award size={20} color={colors.teacher} />
          <Text style={[styles.actionBtnText, { color: colors.teacher }]}>Exams & Transcript</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={colors.danger} />
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>Sign Out of Student Hub</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  banner: { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  name: { ...typography.xl, ...typography.bold, color: '#fff', marginBottom: spacing.xs },
  pill: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  pillText: { ...typography.xs, color: '#fff', fontWeight: '700' },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  cardTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.sm, color: colors.textMuted, width: 120 },
  rowValue: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  fieldLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  inputBox: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  input: { ...typography.sm, color: colors.textPrimary, paddingVertical: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.warning, paddingVertical: 12, borderRadius: radius.md, marginTop: spacing.xs },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { ...typography.sm, ...typography.bold, color: '#fff' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.danger + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.danger + '33', marginTop: spacing.xs },
  actionBtnText: { ...typography.base, ...typography.semibold },
});

export default StudentProfileScreen;
