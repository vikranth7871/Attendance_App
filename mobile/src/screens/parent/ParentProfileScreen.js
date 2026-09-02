import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Users, FileText, MessageSquare, Award } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ParentProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner */}
        <LinearGradient colors={colors.gradientParent} style={styles.banner}>
          <View style={styles.avatarCircle}>
            <Users size={38} color={colors.parent} />
          </View>
          <Text style={styles.name}>{user?.name || 'Parent'}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Parent / Guardian</Text>
          </View>
        </LinearGradient>

        {/* Account Info */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <Row label="Email" value={user?.email} />
          <Row label="Phone" value={user?.phone} />
          <Row label="Role" value="Parent" />
        </View>

        {/* Quick Links */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Quick Access</Text>
          <QuickLink icon={FileText} label="Leave Requests" color={colors.warning} onPress={() => navigation.navigate('ParentLeave')} />
          <QuickLink icon={Award} label="Exam Results" color={colors.teacher} onPress={() => navigation.navigate('ParentResults')} />
          <QuickLink icon={MessageSquare} label="Teacher Messages" color={colors.parent} onPress={() => navigation.navigate('Messages')} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
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
    <View style={[styles.quickIcon, { backgroundColor: color + '22' }]}>
      <Icon size={18} color={color} />
    </View>
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
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  pillText: { ...typography.sm, color: '#fff', fontWeight: '600' },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.sm, color: colors.textMuted, width: 100 },
  rowValue: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  quickIcon: { width: 36, height: 36, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.danger + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.danger + '33' },
  logoutText: { ...typography.base, ...typography.semibold, color: colors.danger },
});

export default ParentProfileScreen;
