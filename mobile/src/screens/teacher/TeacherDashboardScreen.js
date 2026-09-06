import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users, BookOpen, ClipboardList, TrendingUp, Calendar, ChevronRight,
  MessageSquare, Award, FileSpreadsheet, Download, Clock, Share2,
  CheckCircle2, Shield, ShieldCheck, ShieldAlert, Check, X, MapPin,
  Sparkles, PlayCircle, ExternalLink, GraduationCap, Building2
} from 'lucide-react-native';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { exportText } from '../../utils/fileExporter';
import ReportModal from '../../components/ReportModal';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SYSTEM_PERMISSIONS = [
  { id: 'viewAttendance', label: 'View Reports & Roster', desc: 'Read access to class attendance records' },
  { id: 'markAttendance', label: 'Standard Marking', desc: 'Mark present/absent during lecture hours' },
  { id: 'manualAttendance', label: 'Manual Attendance Override', desc: 'Override individual student attendance states' },
  { id: 'editAttendance', label: 'Edit Existing Records', desc: 'Modify previously saved session records' },
  { id: 'deleteAttendance', label: 'Delete Records', desc: 'Remove historical logs when necessary' },
  { id: 'exportAttendance', label: 'Export Documents', desc: 'Generate attendance reports in CSV & TXT' },
  { id: 'bypassTimeRestraint', label: 'Anytime Attendance Override', desc: 'Mark attendance outside standard class hours', special: true },
];

const parseTimeMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) {
    const [h, m] = timeStr.split(':');
    return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
  }
  const [t, modifier] = parts;
  const [h, m] = t.split(':');
  let hh = parseInt(h, 10) || 0;
  let mm = parseInt(m, 10) || 0;
  if (modifier === 'PM' && hh !== 12) hh += 12;
  if (modifier === 'AM' && hh === 12) hh = 0;
  return hh * 60 + mm;
};

const TeacherDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [coordinatorLeaves, setCoordinatorLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState(DAYS.includes(todayName) ? todayName : 'Monday');

  const isCoordinator = Boolean(user?.classCoordinatorFor);

  const fetchData = async () => {
    try {
      const calls = [
        api.get('/teacher/report').catch(() => ({ data: null })),
        api.get('/teacher/subjects').catch(() => ({ data: [] })),
      ];

      if (isCoordinator) {
        calls.push(api.get('/leave/coordinator/all').catch(() => ({ data: [] })));
      }

      const [reportRes, subjRes, leavesRes] = await Promise.all(calls);
      setReport(reportRes.data);
      setSubjects(Array.isArray(subjRes.data) ? subjRes.data : []);

      if (leavesRes && leavesRes.data) {
        setCoordinatorLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : leavesRes.data.leaves || []);
      }
    } catch (err) {
      console.error('Teacher dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isCoordinator]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [isCoordinator]);

  // Determine current live slot right now
  const liveSlot = useMemo(() => {
    const now = new Date();
    const curDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const curMins = now.getHours() * 60 + now.getMinutes();

    return subjects.find((s) => {
      const slotDay = s.dayOfWeek || s.day_of_week;
      if (!slotDay || slotDay.toLowerCase() !== curDay.toLowerCase()) return false;

      let startM = 0;
      let endM = 0;
      if (s.startTime && s.endTime) {
        startM = parseTimeMinutes(s.startTime);
        endM = parseTimeMinutes(s.endTime);
      } else if (s.timeSlot) {
        const [st, et] = s.timeSlot.split(' - ');
        startM = parseTimeMinutes(st);
        endM = parseTimeMinutes(et);
      }
      return curMins >= startM && curMins <= endM;
    });
  }, [subjects]);

  // Next upcoming slot today
  const nextSlot = useMemo(() => {
    if (liveSlot) return null;
    const now = new Date();
    const curDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const curMins = now.getHours() * 60 + now.getMinutes();

    const todaySlots = subjects.filter((s) => {
      const slotDay = s.dayOfWeek || s.day_of_week;
      return slotDay && slotDay.toLowerCase() === curDay.toLowerCase();
    });

    todaySlots.sort((a, b) => parseTimeMinutes(a.startTime || a.timeSlot) - parseTimeMinutes(b.startTime || b.timeSlot));

    return todaySlots.find((s) => {
      const startM = parseTimeMinutes(s.startTime || s.timeSlot);
      return startM > curMins;
    });
  }, [subjects, liveSlot]);

  // Pending leaves count for coordinator
  const pendingLeavesCount = useMemo(() => {
    return coordinatorLeaves.filter((l) => l.status?.toLowerCase() === 'pending').length;
  }, [coordinatorLeaves]);

  // Unique subjects taught
  const uniqueSubjects = useMemo(() => {
    const map = new Map();
    subjects.forEach((s) => {
      const id = s.subjectId?._id || s.subjectId?.id || s.subject_id || s._id;
      const name = s.subjectId?.name || s.subjectId?.subjectName || s.subject_name || s.name;
      const clsName = s.classId?.name || s.classId?.className || s.class_name || 'Class';
      const dept = s.subjectId?.departmentId?.name || s.department_name;
      if (name && !map.has(name + clsName)) {
        map.set(name + clsName, { id, name, clsName, dept });
      }
    });
    return Array.from(map.values());
  }, [subjects]);

  // Day slots for the selected day tab
  const daySlots = useMemo(() => {
    return subjects
      .filter((s) => (s.dayOfWeek || s.day_of_week)?.toLowerCase() === selectedDay.toLowerCase())
      .sort((a, b) => parseTimeMinutes(a.startTime || a.timeSlot) - parseTimeMinutes(b.startTime || b.timeSlot));
  }, [subjects, selectedDay]);

  const handleExportTimetable = async () => {
    let text = `==========================================================\n`;
    text += `          FACULTY WEEKLY TEACHING SCHEDULE (iAttend)       \n`;
    text += `==========================================================\n`;
    text += `Faculty Name : ${user?.name || 'Educator'}\n`;
    text += `Generated On : ${new Date().toLocaleDateString()}\n\n`;

    DAYS.forEach((day) => {
      const slots = subjects.filter((s) => (s.dayOfWeek || s.day_of_week)?.toLowerCase() === day.toLowerCase());
      text += `[${day.toUpperCase()}] (${slots.length} Lectures)\n`;
      if (slots.length === 0) {
        text += `  No lectures scheduled\n\n`;
      } else {
        slots.forEach((s, idx) => {
          const subName = s.subjectId?.name || s.subjectId?.subjectName || s.subject_name || s.name || 'Subject';
          const clsName = s.classId?.name || s.classId?.className || s.class_name || 'Class';
          const time = s.timeSlot || `${s.startTime || ''} - ${s.endTime || ''}`;
          const room = s.roomNumber || s.room_number ? ` (Room ${s.roomNumber || s.room_number})` : '';
          text += `  ${idx + 1}. [${time}] ${subName} - ${clsName}${room}\n`;
        });
        text += `\n`;
      }
    });

    const filename = `teacher_timetable_${user?.name?.replace(/\s+/g, '_') || 'faculty'}.txt`;
    const ok = await exportText(filename, text);
    if (ok) Alert.alert('✅ Timetable Exported', `Saved to ${filename}`);
  };

  if (loading) return <FullPageLoader message="Loading educator dashboard..." />;

  const quickActions = [
    { label: 'Weekly Timetable', icon: Calendar, screen: 'TeacherTimetable', color: colors.teacher },
    { label: 'Mark Attendance', icon: ClipboardList, screen: 'Attendance', color: colors.teacher },
    ...(isCoordinator
      ? [{ label: 'Class Leaves', icon: ShieldCheck, screen: 'TeacherCoordinatorLeaves', color: '#ef4444', badge: pendingLeavesCount ? `${pendingLeavesCount} New` : null }]
      : []),
    { label: 'Class Roster', icon: Users, screen: 'Roster', color: colors.primary },
    { label: 'Assignments', icon: BookOpen, screen: 'Assignments', color: colors.student },
    { label: 'Parent Messages', icon: MessageSquare, screen: 'TeacherMessages', color: colors.parent },
    { label: 'AI Quiz Manager', icon: Award, screen: 'TeacherQuizManage', color: colors.student },
    { label: 'Exam Marks', icon: FileSpreadsheet, screen: 'TeacherExams', color: colors.warning },
    { label: 'Apply Leave', icon: Calendar, screen: 'TeacherApplyLeave', color: colors.danger },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={`Hi, ${user?.name?.split(' ')[0] || 'Teacher'} 👋`}
        subtitle="Educator Workspace"
        navigation={navigation}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
      >
        {/* ============================================================ */}
        {/* 1. EDUCATOR PROFILE & SYSTEM STATUS BANNER                    */}
        {/* ============================================================ */}
        <View style={[styles.profileBanner, shadows.sm]}>
          <View style={styles.profileBannerTop}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {(user?.name || 'T')[0].toUpperCase()}
              </Text>
            </View>

            <View style={styles.profileInfoCol}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{user?.name || 'Faculty Member'}</Text>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>EDUCATOR</Text>
                </View>
              </View>

              <Text style={styles.profileEmail}>{user?.email}</Text>

              {user?.departmentId && (
                <View style={styles.deptRow}>
                  <Building2 size={11} color={colors.textMuted} />
                  <Text style={styles.deptText}>
                    {user?.departmentId?.departmentName || user?.departmentId?.name || 'Department'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Coordinator & Security Status Bar */}
          <View style={styles.profileBannerBottom}>
            {isCoordinator ? (
              <View style={styles.coordBadge}>
                <GraduationCap size={13} color="#10b981" />
                <Text style={styles.coordBadgeText}>
                  Coordinator: {user?.coordinatorClassName || 'CS101-A'}
                </Text>
              </View>
            ) : (
              <View style={styles.facultyBadge}>
                <BookOpen size={12} color={colors.teacher} />
                <Text style={styles.facultyBadgeText}>Teaching Faculty</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.systemStatusBtn}
              onPress={() => setShowPermissionsModal(true)}
              activeOpacity={0.7}
            >
              <Shield size={12} color={colors.primary} />
              <Text style={styles.systemStatusText}>System Status</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2. LIVE NOW / NEXT LECTURE HERO BANNER                        */}
        {/* ============================================================ */}
        {liveSlot ? (
          <View style={[styles.liveHeroCard, shadows.md]}>
            <View style={styles.liveHeroHeader}>
              <View style={styles.liveNowTag}>
                <PlayCircle size={12} color="#fff" />
                <Text style={styles.liveNowTagText}>LIVE LECTURE IN PROGRESS</Text>
              </View>
              <Text style={styles.liveSlotTime}>
                {liveSlot.timeSlot || `${liveSlot.startTime || ''} - ${liveSlot.endTime || ''}`}
              </Text>
            </View>

            <Text style={styles.liveSubjectTitle}>
              {liveSlot.subjectId?.name || liveSlot.subjectId?.subjectName || liveSlot.subject_name || liveSlot.name}
            </Text>

            <View style={styles.liveMetaRow}>
              <View style={styles.liveMetaPill}>
                <Users size={12} color={colors.textSecondary} />
                <Text style={styles.liveMetaText}>
                  {liveSlot.classId?.name || liveSlot.classId?.className || liveSlot.class_name || 'Class Section'}
                </Text>
              </View>
              <View style={styles.liveMetaPill}>
                <MapPin size={12} color={colors.textSecondary} />
                <Text style={styles.liveMetaText}>
                  {liveSlot.roomNumber || liveSlot.room_number ? `Room ${liveSlot.roomNumber || liveSlot.room_number}` : 'Main Hall'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.liveMarkBtn}
              onPress={() => navigation.navigate('Attendance')}
              activeOpacity={0.85}
            >
              <ClipboardList size={16} color="#fff" />
              <Text style={styles.liveMarkBtnText}>Mark Attendance Now</Text>
              <ChevronRight size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : nextSlot ? (
          <View style={[styles.nextSlotCard, shadows.sm]}>
            <View style={styles.nextSlotHeader}>
              <View style={styles.nextSlotTag}>
                <Clock size={11} color={colors.teacher} />
                <Text style={styles.nextSlotTagText}>NEXT UP TODAY</Text>
              </View>
              <Text style={styles.nextSlotTime}>
                {nextSlot.timeSlot || `${nextSlot.startTime || ''} - ${nextSlot.endTime || ''}`}
              </Text>
            </View>

            <View style={styles.nextSlotContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextSlotSubject}>
                  {nextSlot.subjectId?.name || nextSlot.subjectId?.subjectName || nextSlot.subject_name || nextSlot.name}
                </Text>
                <Text style={styles.nextSlotMeta}>
                  {nextSlot.classId?.name || nextSlot.classId?.className || nextSlot.class_name} • {nextSlot.roomNumber ? `Room ${nextSlot.roomNumber}` : 'Room TBA'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.nextSlotActionBtn}
                onPress={() => navigation.navigate('Roster')}
                activeOpacity={0.8}
              >
                <Text style={styles.nextSlotActionText}>Roster</Text>
                <ChevronRight size={12} color={colors.teacher} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ============================================================ */}
        {/* 3. CLASS COORDINATOR PENDING LEAVES ALERT                     */}
        {/* ============================================================ */}
        {isCoordinator && pendingLeavesCount > 0 && (
          <TouchableOpacity
            style={[styles.coordinatorAlertCard, shadows.sm]}
            onPress={() => navigation.navigate('TeacherCoordinatorLeaves')}
            activeOpacity={0.85}
          >
            <View style={styles.coordinatorAlertIconBox}>
              <ShieldAlert size={20} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.coordinatorAlertTitleRow}>
                <Text style={styles.coordinatorAlertTitle}>
                  {pendingLeavesCount} Student {pendingLeavesCount === 1 ? 'Leave' : 'Leaves'} Pending Review
                </Text>
                <View style={styles.newTag}>
                  <Text style={styles.newTagText}>ACTION REQ</Text>
                </View>
              </View>
              <Text style={styles.coordinatorAlertSub}>
                Applications awaiting your approval as Class Coordinator.
              </Text>
            </View>
            <ChevronRight size={16} color="#ef4444" />
          </TouchableOpacity>
        )}

        {/* ============================================================ */}
        {/* 4. OVERVIEW STATS GRID                                        */}
        {/* ============================================================ */}
        <Text style={styles.sectionTitle}>Academic Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={Users}
            label="My Students"
            value={report?.totalStudents ?? '38'}
            color={colors.teacher}
            gradient={[colors.teacher + 'CC', colors.teacher + '22']}
            style={styles.statCard}
          />
          <StatCard
            icon={BookOpen}
            label="My Subjects"
            value={uniqueSubjects.length || subjects.length || 6}
            color={colors.primary}
            gradient={[colors.primary + 'CC', colors.primary + '22']}
            style={styles.statCard}
          />
          <StatCard
            icon={ClipboardList}
            label="Attendance Rate"
            value={report?.attendanceRate ? `${report.attendanceRate}%` : '92%'}
            color={colors.success}
            gradient={[colors.success + 'CC', colors.success + '22']}
            style={styles.statCard}
          />
          <StatCard
            icon={TrendingUp}
            label="Weekly Lectures"
            value={subjects.length || 23}
            color={colors.warning}
            gradient={[colors.warning + 'CC', colors.warning + '22']}
            style={styles.statCard}
          />
        </View>

        {/* ============================================================ */}
        {/* 5. PRIMARY ACTION BUTTONS (TIMETABLE, REPORT, COORD LEAVES)   */}
        {/* ============================================================ */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.teacher + '15', borderColor: colors.teacher + '44' }]}
            onPress={() => navigation.navigate('TeacherTimetable')}
            activeOpacity={0.8}
          >
            <Calendar size={15} color={colors.teacher} />
            <Text style={[styles.primaryActionText, { color: colors.teacher }]}>Weekly Timetable</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '44' }]}
            onPress={() => setShowReportModal(true)}
            activeOpacity={0.8}
          >
            <Download size={15} color={colors.primary} />
            <Text style={[styles.primaryActionText, { color: colors.primary }]}>Attendance Report</Text>
          </TouchableOpacity>

          {isCoordinator && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#ef444415', borderColor: '#ef444444' }]}
              onPress={() => navigation.navigate('TeacherCoordinatorLeaves')}
              activeOpacity={0.8}
            >
              <ShieldCheck size={15} color="#ef4444" />
              <Text style={[styles.primaryActionText, { color: '#ef4444' }]}>Class Leaves</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ============================================================ */}
        {/* 6. WEEKLY SCHEDULE SECTION                                    */}
        {/* ============================================================ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Daily Teaching Schedule</Text>
          <TouchableOpacity
            style={styles.viewFullTimetableBtn}
            onPress={() => navigation.navigate('TeacherTimetable')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewFullTimetableText}>View Full Timetable</Text>
            <ChevronRight size={13} color={colors.teacher} />
          </TouchableOpacity>
        </View>

        {/* Day Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsScroll}>
          {DAYS.map((day) => {
            const isSelected = selectedDay === day;
            const isToday = day.toLowerCase() === todayName.toLowerCase();
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayTab,
                  isSelected && styles.dayTabActive,
                  isToday && !isSelected && { borderColor: colors.teacher + '77' }
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                  {day.slice(0, 3)}
                </Text>
                {isToday ? (
                  <View style={[styles.todayDot, isSelected && { backgroundColor: '#fff' }]} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Scheduled Slots */}
        {daySlots.length === 0 ? (
          <View style={styles.emptySlotsCard}>
            <Calendar size={28} color={colors.textMuted} />
            <Text style={styles.emptySlotsText}>No lectures scheduled on {selectedDay}</Text>
          </View>
        ) : (
          daySlots.map((slot, i) => {
            const isCurrent = liveSlot?._id === slot._id;
            const subName = slot.subjectId?.name || slot.subjectId?.subjectName || slot.subject_name || slot.name || 'Lecture';
            const clsName = slot.classId?.name || slot.classId?.className || slot.class_name || 'Class Section';
            const timeStr = slot.timeSlot || slot.time_slot || `${slot.startTime || ''} - ${slot.endTime || ''}`;
            const roomStr = slot.roomNumber || slot.room_number ? `Room ${slot.roomNumber || slot.room_number}` : 'Main Hall';

            return (
              <View
                key={slot._id || i}
                style={[
                  styles.slotCard,
                  shadows.sm,
                  isCurrent && { borderColor: colors.success, borderWidth: 1.5, backgroundColor: colors.success + '0A' }
                ]}
              >
                <View style={styles.slotTimeCol}>
                  <Clock size={13} color={isCurrent ? colors.success : colors.textMuted} />
                  <Text style={[styles.slotTimeText, isCurrent && { color: colors.success, fontWeight: '700' }]}>
                    {timeStr}
                  </Text>
                  {isCurrent && (
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                    </View>
                  )}
                </View>

                <View style={styles.slotDetailsCol}>
                  <Text style={styles.slotSubject}>{subName}</Text>
                  <Text style={styles.slotMeta}>{clsName} • {roomStr}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.slotActionBtn, isCurrent ? { backgroundColor: colors.success } : { backgroundColor: colors.teacher + '22' }]}
                  onPress={() => navigation.navigate('Attendance')}
                  activeOpacity={0.8}
                >
                  <ClipboardList size={13} color={isCurrent ? '#fff' : colors.teacher} />
                  <Text style={[styles.slotActionText, isCurrent ? { color: '#fff' } : { color: colors.teacher }]}>
                    Mark
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ============================================================ */}
        {/* 7. QUICK ACTIONS                                              */}
        {/* ============================================================ */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.quickCard, shadows.sm]}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '20' }]}>
                <action.icon size={22} color={action.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </View>
              {action.badge && (
                <View style={styles.actionBadgePill}>
                  <Text style={styles.actionBadgePillText}>{action.badge}</Text>
                </View>
              )}
              <ChevronRight size={14} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ============================================================ */}
        {/* 8. MY TEACHING COURSES                                        */}
        {/* ============================================================ */}
        {uniqueSubjects.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>My Teaching Subjects</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Roster')}>
                <Text style={styles.viewFullTimetableText}>View All Rosters</Text>
              </TouchableOpacity>
            </View>

            {uniqueSubjects.map((subj, i) => (
              <TouchableOpacity
                key={subj.id || i}
                style={[styles.subjectCard, shadows.sm]}
                onPress={() => navigation.navigate('Roster')}
                activeOpacity={0.85}
              >
                <View style={[styles.subjectDot, { backgroundColor: colors.teacher }]} />
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subj.name}</Text>
                  <Text style={styles.subjectMeta}>
                    {subj.clsName} {subj.dept ? `• ${subj.dept}` : ''}
                  </Text>
                </View>
                <ChevronRight size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* 9. SYSTEM STATUS / ACTIVE PERMISSIONS MODAL                  */}
      {/* ============================================================ */}
      <Modal
        visible={showPermissionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.permissionsCard, shadows.lg]}>
            <View style={styles.permissionsHeader}>
              <View style={styles.shieldIconBox}>
                <Shield size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionsTitle}>Educator System Status</Text>
                <Text style={styles.permissionsSub}>Active verified privileges & security roles</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPermissionsModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.permissionsList}>
                {SYSTEM_PERMISSIONS.map((p) => {
                  const has = user?.permissions?.includes(p.id) ?? true;
                  return (
                    <View key={p.id} style={styles.permissionRow}>
                      <View style={[styles.permCheckIcon, { backgroundColor: has ? colors.success + '20' : colors.danger + '20' }]}>
                        {has ? <Check size={14} color={colors.success} /> : <X size={14} color={colors.danger} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.permLabel, !has && { color: colors.textMuted }]}>{p.label}</Text>
                          {p.special && has && (
                            <View style={styles.unlimitedPill}>
                              <Text style={styles.unlimitedPillText}>UNLIMITED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.permDesc}>{p.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closePermissionsBtn}
              onPress={() => setShowPermissionsModal(false)}
            >
              <Text style={styles.closePermissionsText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Interactive Attendance Report & Filter Modal */}
      <ReportModal visible={showReportModal} onClose={() => setShowReportModal(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },

  /* Educator Profile Banner */
  profileBanner: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  profileBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.teacher,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  profileInfoCol: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  rolePill: {
    backgroundColor: colors.teacher + '22',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.teacher,
  },
  profileEmail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  deptText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  profileBannerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border + '66',
  },
  coordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b98115',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#10b98133',
  },
  coordBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  facultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  facultyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  systemStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primary + '15',
  },
  systemStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Live Hero Card */
  liveHeroCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.success,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  liveHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveNowTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  liveNowTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  liveSlotTime: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  liveSubjectTitle: {
    ...typography.lg,
    ...typography.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  liveMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  liveMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  liveMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  liveMarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: 6,
  },
  liveMarkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  /* Next Slot Card */
  nextSlotCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  nextSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nextSlotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextSlotTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.teacher,
    letterSpacing: 0.5,
  },
  nextSlotTime: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  nextSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextSlotSubject: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  nextSlotMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  nextSlotActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.teacher + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  nextSlotActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teacher,
  },

  /* Coordinator Alert */
  coordinatorAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ef444410',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#ef444433',
    marginBottom: spacing.md,
  },
  coordinatorAlertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef444422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinatorAlertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordinatorAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  newTag: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  newTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
  },
  coordinatorAlertSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Stats & Action row */
  sectionTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    minWidth: '47%',
    maxWidth: '47%',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  primaryActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Weekly Schedule */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  viewFullTimetableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.teacher + '15',
  },
  viewFullTimetableText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teacher,
  },
  dayTabsScroll: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
    alignItems: 'center',
  },
  dayTabActive: {
    backgroundColor: colors.teacher,
    borderColor: colors.teacher,
  },
  dayTabText: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teacher,
    marginTop: 3,
  },
  emptySlotsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptySlotsText: {
    ...typography.sm,
    color: colors.textMuted,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  slotTimeCol: {
    alignItems: 'flex-start',
    gap: 3,
    minWidth: 90,
  },
  slotTimeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  liveBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  liveBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
  },
  slotDetailsCol: {
    flex: 1,
  },
  slotSubject: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  slotMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  slotActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  slotActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Quick Actions Grid */
  quickGrid: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: {
    ...typography.base,
    ...typography.semibold,
    color: colors.textPrimary,
  },
  actionBadgePill: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginRight: 4,
  },
  actionBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },

  /* Teaching subjects */
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    ...typography.base,
    ...typography.semibold,
    color: colors.textPrimary,
  },
  subjectMeta: {
    ...typography.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Permissions Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  permissionsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shieldIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionsTitle: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  permissionsSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  permissionsList: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  permCheckIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  permLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  permDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  unlimitedPill: {
    backgroundColor: colors.success + '22',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  unlimitedPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.success,
  },
  closePermissionsBtn: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closePermissionsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

export default TeacherDashboardScreen;
