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
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut,
  BookOpen,
  CalendarDays,
  Key,
  Lock,
  Layers,
  Award,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const TeacherProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data } = await api.get('/teacher/subjects');
        const unique = [];
        const seen = new Set();
        (Array.isArray(data) ? data : []).forEach((item) => {
          const sid = item.subjectId?.id || item.subjectId?._id;
          const cid = item.classId?.id || item.classId?._id;
          const key = `${sid}-${cid}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push({
              id: key,
              name: item.subjectId?.name || item.subjectId?.subjectName || 'Course',
              className: item.classId?.name || item.classId?.className || 'Class',
              roomNumber: item.roomNumber,
              slot: `${item.dayOfWeek} (${item.timeSlot})`,
            });
          }
        });
        setSubjects(unique);
      } catch (err) {
        console.error('Failed to load teacher subjects:', err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

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

  const isCoordinator = Boolean(user?.classCoordinatorFor || user?.coordinatorClassName || user?.class_coordinator_for);
  const coordinatorClass = user?.coordinatorClassName || 'Active Section';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Faculty Profile" showLogout={false} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={colors.gradientTeacher} style={styles.banner}>
          <View style={styles.avatarCircle}><BookOpen size={38} color="#fff" /></View>
          <Text style={styles.name}>{user?.name || 'Educator'}</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}><Text style={styles.pillText}>Educator</Text></View>
            {isCoordinator && (
              <View style={styles.coordPill}>
                <Award size={12} color="#fff" />
                <Text style={styles.coordPillText}>Coordinator • {coordinatorClass}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <Row label="Official Email" value={user?.email} />
          <Row label="Employee ID" value={user?.employee_id || user?.id} />
          <Row label="Department" value={user?.department_name || user?.departmentName || 'Academics'} />
          <Row label="Role" value="Faculty Member" />
          {isCoordinator && <Row label="Class Coordinator" value={coordinatorClass} />}
        </View>

        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeaderRow}>
            <Layers size={16} color={colors.teacher} />
            <Text style={styles.cardTitle}>Assigned Courses ({subjects.length})</Text>
          </View>
          {loadingSubjects ? (
            <ActivityIndicator size="small" color={colors.teacher} style={{ marginVertical: spacing.md }} />
          ) : subjects.length === 0 ? (
            <Text style={styles.emptySubjectsText}>No allocated courses found for this academic term.</Text>
          ) : (
            subjects.map((s) => (
              <View key={s.id} style={styles.subjRow}>
                <View style={styles.subjLeft}>
                  <Text style={styles.subjName}>{s.name}</Text>
                  <Text style={styles.subjMeta}>{s.slot}</Text>
                </View>
                <View style={styles.classBadge}>
                  <Text style={styles.classBadgeText}>{s.className}</Text>
                  {s.roomNumber ? <Text style={styles.roomText}>Rm {s.roomNumber}</Text> : null}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeaderRow}><Key size={16} color={colors.warning} /><Text style={styles.cardTitle}>Change Password</Text></View>
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

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('TeacherApplyLeave')} activeOpacity={0.8}>
          <CalendarDays size={20} color={colors.warning} />
          <Text style={[styles.actionBtnText, { color: colors.warning }]}>Apply for Faculty Leave</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={colors.danger} />
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>Sign Out of System</Text>
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
  name: { ...typography.xl, ...typography.bold, color: '#fff', marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  pill: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  pillText: { ...typography.xs, color: '#fff', fontWeight: '700' },
  coordPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.secondary, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  coordPillText: { ...typography.xs, color: '#fff', fontWeight: '700' },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  cardTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.sm, color: colors.textMuted, width: 120 },
  rowValue: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  emptySubjectsText: { ...typography.sm, color: colors.textMuted, fontStyle: 'italic', paddingVertical: spacing.sm },
  subjRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '55' },
  subjLeft: { flex: 1 },
  subjName: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  subjMeta: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  classBadge: { alignItems: 'flex-end' },
  classBadgeText: { ...typography.xs, ...typography.bold, color: colors.teacher, backgroundColor: colors.teacher + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs },
  roomText: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  fieldLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  inputBox: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  input: { ...typography.sm, color: colors.textPrimary, paddingVertical: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.warning, paddingVertical: 12, borderRadius: radius.md, marginTop: spacing.xs },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { ...typography.sm, ...typography.bold, color: '#fff' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.warning + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.warning + '33', marginBottom: spacing.sm },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.danger + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.danger + '33' },
  actionBtnText: { ...typography.base, ...typography.semibold },
});

export default TeacherProfileScreen;
