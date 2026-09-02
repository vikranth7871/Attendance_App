import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Award, Gamepad2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const StudentProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={colors.gradientStudent} style={styles.banner}>
          <View style={styles.avatarCircle}>
            <Award size={38} color={colors.student} />
          </View>
          <Text style={styles.name}>{user?.name || 'Student'}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Student</Text>
          </View>
        </LinearGradient>

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>Academic Info</Text>
          <Row label="Email" value={user?.email} />
          <Row label="Roll Number" value={user?.roll_number} />
          <Row label="Class" value={user?.class_name} />
          <Row label="Department" value={user?.department_name} />
          <Row label="Section" value={user?.section} />
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('QuizHub')} activeOpacity={0.8}>
          <Gamepad2 size={20} color={colors.student} />
          <Text style={[styles.actionBtnText, { color: colors.student }]}>Quiz Arena</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('StudentResults')} activeOpacity={0.8}>
          <Award size={20} color={colors.teacher} />
          <Text style={[styles.actionBtnText, { color: colors.teacher }]}>My Results</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut size={20} color={colors.danger} />
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>Sign Out</Text>
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
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  pillText: { ...typography.sm, color: '#fff', fontWeight: '600' },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.sm, color: colors.textMuted, width: 120 },
  rowValue: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.danger + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.danger + '33' },
  actionBtnText: { ...typography.base, ...typography.semibold },
});

export default StudentProfileScreen;
