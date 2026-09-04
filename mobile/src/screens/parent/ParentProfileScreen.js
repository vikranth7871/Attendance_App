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
  Users,
  FileText,
  MessageSquare,
  Award,
  Lock,
  Key,
  Save,
  User,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ParentProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergency_contact || user?.emergencyContact || '');
  const [address, setAddress] = useState(user?.address || '');
  const [relationship, setRelationship] = useState(user?.relationship || 'Parent');
  const [savingContact, setSavingContact] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.phone) setPhone(user.phone);
    if (user?.emergency_contact || user?.emergencyContact) {
      setEmergencyContact(user.emergency_contact || user.emergencyContact);
    }
    if (user?.address) setAddress(user.address);
    if (user?.relationship) setRelationship(user.relationship);
  }, [user]);

  const handleUpdateContact = async () => {
    if (!name.trim()) { Alert.alert('Validation Error', 'Please enter your name.'); return; }
    setSavingContact(true);
    try {
      await api.put('/parent/profile', { name: name.trim(), phone: phone.trim(), emergencyContact: emergencyContact.trim(), address: address.trim(), relationship: relationship.trim() });
      Alert.alert('Success', 'Guardian contact details updated successfully.');
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not update contact details.');
    } finally { setSavingContact(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { Alert.alert('Validation Error', 'Please fill in all password fields.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Validation Error', 'New passwords do not match.'); return; }
    if (newPassword.length < 6) { Alert.alert('Validation Error', 'Password must be at least 6 characters.'); return; }
    setSavingPassword(true);
    try {
      await api.put('/parent/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      Alert.alert('Password Change Failed', err.response?.data?.message || 'Failed to update password.');
    } finally { setSavingPassword(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Guardian Profile" showLogout={false} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={colors.gradientParent} style={styles.banner}>
          <View style={styles.avatarCircle}><Users size={38} color="#fff" /></View>
          <Text style={styles.name}>{name || 'Guardian'}</Text>
          <View style={styles.pill}><Text style={styles.pillText}>{relationship || 'Parent / Guardian'}</Text></View>
        </LinearGradient>

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <Row label="Email" value={user?.email} />
          <Row label="Phone" value={user?.phone} />
          <Row label="Role" value="Parent" />
        </View>

        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}><User size={18} color={colors.parent} /><Text style={styles.cardTitle}>Guardian Information</Text></View>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Guardian Full Name" placeholderTextColor={colors.textMuted} /></View>
          <Text style={styles.fieldLabel}>Primary Contact Phone</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" /></View>
          <Text style={styles.fieldLabel}>Emergency Phone</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={emergencyContact} onChangeText={setEmergencyContact} placeholder="+1 (555) 999-9999" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" /></View>
          <Text style={styles.fieldLabel}>Residential Address</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Home Street, City, State" placeholderTextColor={colors.textMuted} /></View>
          <Text style={styles.fieldLabel}>Relationship to Student</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={relationship} onChangeText={setRelationship} placeholder="e.g. Father, Mother, Guardian" placeholderTextColor={colors.textMuted} /></View>
          <TouchableOpacity style={[styles.saveBtn, savingContact && styles.btnDisabled]} onPress={handleUpdateContact} disabled={savingContact}>
            {savingContact ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={styles.saveBtnText}>Save Guardian Details</Text></>}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardHeader}><Key size={18} color={colors.warning} /><Text style={styles.cardTitle}>Change Password</Text></View>
          <Text style={styles.fieldLabel}>Current Password</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" placeholderTextColor={colors.textMuted} secureTextEntry /></View>
          <Text style={styles.fieldLabel}>New Password</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password (min 6 chars)" placeholderTextColor={colors.textMuted} secureTextEntry /></View>
          <Text style={styles.fieldLabel}>Confirm New Password</Text>
          <View style={styles.inputBox}><TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor={colors.textMuted} secureTextEntry /></View>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.warning }, savingPassword && styles.btnDisabled]} onPress={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <><Lock size={16} color="#fff" /><Text style={styles.saveBtnText}>Update Password</Text></>}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Quick Access</Text>
          <QuickLink icon={FileText} label="Leave Requests" color={colors.warning} onPress={() => navigation.navigate('ParentLeave')} />
          <QuickLink icon={Award} label="Exam Results" color={colors.teacher} onPress={() => navigation.navigate('ParentResults')} />
          <QuickLink icon={MessageSquare} label="Teacher Messages" color={colors.parent} onPress={() => navigation.navigate('Messages')} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out of Parent Portal</Text>
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

const QuickLink = ({ icon: Icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.quickLink} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.quickIcon, { backgroundColor: color + '22' }]}><Icon size={18} color={color} /></View>
    <Text style={styles.quickLabel}>{label}</Text>
    <Text style={{ color: colors.textMuted }}>›</Text>
  </TouchableOpacity>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  cardTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.sm, color: colors.textMuted, width: 100 },
  rowValue: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  fieldLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  inputBox: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  input: { ...typography.sm, color: colors.textPrimary, paddingVertical: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.parent, paddingVertical: 12, borderRadius: radius.md, marginTop: spacing.xs },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { ...typography.sm, ...typography.bold, color: '#fff' },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '55' },
  quickIcon: { width: 36, height: 36, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.danger + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.danger + '33', marginTop: spacing.xs },
  logoutText: { ...typography.base, ...typography.semibold, color: colors.danger },
});

export default ParentProfileScreen;
