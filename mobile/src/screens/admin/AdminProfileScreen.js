import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, typography, shadows, getRoleGradient } from '../../styles/theme';

const AdminProfileScreen = () => {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Profile" showLogout={false} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar Banner */}
        <LinearGradient colors={colors.gradientAdmin} style={styles.banner}>
          <View style={styles.avatarCircle}>
            <Shield size={40} color={colors.primary} />
          </View>
          <Text style={styles.bannerName}>{user?.name || 'Administrator'}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>System Admin</Text>
          </View>
        </LinearGradient>

        {/* Info Cards */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <InfoRow label="Email" value={user?.email || '—'} />
          <InfoRow label="Role" value="Administrator" />
          <InfoRow label="Department" value={user?.department_name || 'System'} />
        </View>

        <TouchableOpacity style={[styles.logoutBtn, shadows.sm]} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  banner: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  bannerName: { ...typography.xl, ...typography.bold, color: '#fff', marginBottom: spacing.xs },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  rolePillText: { ...typography.sm, color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { ...typography.sm, color: colors.textMuted, width: 120 },
  infoValue: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger + '18',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger + '33',
  },
  logoutText: { ...typography.base, ...typography.semibold, color: colors.danger },
});

export default AdminProfileScreen;
