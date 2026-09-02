import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Check, Lock, Users, Key, ChevronRight } from 'lucide-react-native';
import Header from '../../components/Header';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ROLES_PERMISSIONS = {
  admin: [
    { title: 'User Management', desc: 'Create, update, and manage all students, faculty, and parents', enabled: true },
    { title: 'Academic Setup', desc: 'Manage departments, classes, subjects, and timetables', enabled: true },
    { title: 'Faculty Leaves & Attendance', desc: 'Review faculty leaves and log attendance', enabled: true },
    { title: 'Quiz Arena Administration', desc: 'Generate, publish, and delete quizzes across institute', enabled: true },
    { title: 'System Audits & Security', desc: 'Access activity logs and permission controls', enabled: true },
  ],
  teacher: [
    { title: 'Attendance Marking', desc: 'Mark student attendance for allocated subjects/classes', enabled: true },
    { title: 'Class Roster & Records', desc: 'View student directory and contact details', enabled: true },
    { title: 'Assignments & Grading', desc: 'Create assignments and grade student submissions', enabled: true },
    { title: 'Exam Schedules & Marks', desc: 'Schedule exams and enter student marks', enabled: true },
    { title: 'Parent Communication', desc: 'Message parents of students in allocated classes', enabled: true },
    { title: 'AI Quiz Creation', desc: 'Create and generate subject quizzes with Gemini AI', enabled: true },
    { title: 'Faculty Leave Application', desc: 'Apply for leaves and track approval status', enabled: true },
  ],
  student: [
    { title: 'Attendance Dashboard', desc: 'Track overall percentage, streaks, and subject records', enabled: true },
    { title: 'Weekly Timetable', desc: 'View weekly subject schedules and room numbers', enabled: true },
    { title: 'Assignment Submissions', desc: 'Upload documents and submit coursework', enabled: true },
    { title: 'Quiz Arena & Certificates', desc: 'Take quizzes, view ranks, and earn merit certificates', enabled: true },
    { title: 'Leave Application', desc: 'Apply for leaves with date ranges and reasons', enabled: true },
    { title: 'Exam Results', desc: 'Check published exam results and letter grades', enabled: true },
  ],
  parent: [
    { title: 'Children Attendance Gauges', desc: 'Monitor daily attendance and monthly trends', enabled: true },
    { title: 'Fee Status & Receipts', desc: 'View total fee, pending balance, and payment history', enabled: true },
    { title: 'Teacher Direct Messaging', desc: 'Direct message channel with class teachers', enabled: true },
    { title: 'Child Leave Requests', desc: 'Review and approve/reject child leave applications', enabled: true },
    { title: 'Academic Performance', desc: 'View exam results, grades, and upcoming exams', enabled: true },
  ],
};

const PermissionsScreen = ({ navigation }) => {
  const [activeRole, setActiveRole] = useState('teacher');
  const [permissions, setPermissions] = useState(ROLES_PERMISSIONS);

  const togglePerm = (role, idx) => {
    setPermissions(prev => {
      const list = [...prev[role]];
      list[idx] = { ...list[idx], enabled: !list[idx].enabled };
      return { ...prev, [role]: list };
    });
  };

  const ROLES = [
    { key: 'teacher', label: 'Faculty / Teacher', color: colors.teacher },
    { key: 'student', label: 'Student', color: colors.student },
    { key: 'parent', label: 'Parent / Guardian', color: colors.parent },
    { key: 'admin', label: 'Administrator', color: colors.primary },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Role Access & Permissions"
        subtitle="Institutional RBAC management"
        navigation={navigation}
      />

      {/* Role Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleTab, activeRole === r.key && { borderColor: r.color, backgroundColor: r.color + '22' }]}
              onPress={() => setActiveRole(r.key)}
            >
              <View style={[styles.roleDot, { backgroundColor: r.color }]} />
              <Text style={[styles.roleTabText, activeRole === r.key && { color: r.color, fontWeight: '700' }]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Shield size={20} color={colors.primary} />
          <Text style={styles.bannerText}>
            Configuring role access capabilities for {ROLES.find(r => r.key === activeRole)?.label}.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Capabilities & Modules</Text>

        {permissions[activeRole].map((perm, idx) => (
          <View key={idx} style={[styles.card, shadows.sm]}>
            <View style={styles.cardInfo}>
              <View style={styles.cardTitleRow}>
                <Lock size={15} color={perm.enabled ? colors.success : colors.textMuted} />
                <Text style={styles.cardTitle}>{perm.title}</Text>
              </View>
              <Text style={styles.cardDesc}>{perm.desc}</Text>
            </View>
            <Switch
              value={perm.enabled}
              onValueChange={() => togglePerm(activeRole, idx)}
              trackColor={{ false: colors.bgElevated, true: colors.success + '66' }}
              thumbColor={perm.enabled ? colors.success : colors.textMuted}
            />
          </View>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  tabsRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  roleTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bgCard, marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  roleTabText: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  content: { padding: spacing.md },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary + '18', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary + '33', marginBottom: spacing.md },
  bannerText: { ...typography.xs, color: colors.textSecondary, flex: 1 },
  sectionTitle: { ...typography.sm, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  cardInfo: { flex: 1, paddingRight: spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardTitle: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  cardDesc: { ...typography.xs, color: colors.textMuted, lineHeight: 18 },
});

export default PermissionsScreen;
