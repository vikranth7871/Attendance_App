import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, ActivityIndicator, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users, BookOpen, ClipboardList, TrendingUp, Calendar, ChevronRight,
  MessageSquare, Award, FileSpreadsheet, Download, Clock,
  CheckCircle2, Shield, ShieldCheck, ShieldAlert, Check, X, MapPin,
  PlayCircle, GraduationCap, Building2
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
  const [exportingTimetable, setExportingTimetable] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState(DAYS.includes(todayName) ? todayName : 'Monday');

  const isCoordinator = Boolean(user?.classCoordinatorFor || user?.coordinatorClassName || user?.class_coordinator_for);
  const coordClassName = user?.coordinatorClassName || 'CS101-A';

  const fetchData = async () => {
    try {
      const [reportRes, subjRes, leavesRes] = await Promise.all([
        api.get('/teacher/report').catch(() => ({ data: null })),
        api.get('/teacher/subjects').catch(() => ({ data: [] })),
        isCoordinator
          ? api.get('/leave/coordinator/all').catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

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

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [isCoordinator])
  );

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

  // Check if all today's slots have ended
  const todayDone = useMemo(() => {
    if (liveSlot || nextSlot) return false;
    const now = new Date();
    const curDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const curMins = now.getHours() * 60 + now.getMinutes();

    const todaySlots = subjects.filter((s) => {
      const slotDay = s.dayOfWeek || s.day_of_week;
      return slotDay && slotDay.toLowerCase() === curDay.toLowerCase();
    });

    if (todaySlots.length === 0) return false;

    const lastSlot = todaySlots.reduce((latest, s) => {
      let endM = 0;
      if (s.endTime) endM = parseTimeMinutes(s.endTime);
      else if (s.timeSlot) {
        const [, et] = s.timeSlot.split(' - ');
        endM = parseTimeMinutes(et);
      }
      return Math.max(latest, endM);
    }, 0);

    return curMins > lastSlot;
  }, [subjects, liveSlot, nextSlot]);

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
    if (exportingTimetable) return;
    setExportingTimetable(true);
    try {
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
    } catch (err) {
      console.error('Failed to export timetable:', err);
      Alert.alert('Export Error', 'Unable to export timetable.');
    } finally {
      setExportingTimetable(false);
    }
  };

  if (loading) return <FullPageLoader message="Loading educator dashboard..." />;

  const quickActions = [
    { label: 'Weekly Timetable', sub: 'View full schedule', icon: Calendar, screen: 'TeacherTimetable', color: colors.teacher },
    { label: 'Mark Attendance', sub: 'Live class marking', icon: ClipboardList, screen: 'Attendance', color: colors.success },
    ...(isCoordinator
      ? [{
          label: 'Class Leaves',
          sub: 'Student requests',
          icon: ShieldCheck,
          screen: 'TeacherCoordinatorLeaves',
          color: '#ef4444',
          badge: pendingLeavesCount ? `${pendingLeavesCount} New` : null
        }]
      : []),
    { label: 'Class Roster', sub: 'Student directory', icon: Users, screen: 'Roster', color: colors.primary },
    { label: 'Assignments', sub: 'Course homework', icon: BookOpen, screen: 'Assignments', color: colors.student },
    { label: 'Parent Messages', sub: 'Direct messaging', icon: MessageSquare, screen: 'TeacherMessages', color: colors.parent },
    { label: 'AI Quiz Manager', sub: 'Manage & generate', icon: Award, screen: 'TeacherQuizManage', color: colors.student },
    { label: 'Exam Marks', sub: 'Grade entry', icon: FileSpreadsheet, screen: 'TeacherExams', color: colors.warning },
    { label: 'Attendance Report', sub: 'Filter & CSV export', icon: Download, action: () => setShowReportModal(true), color: colors.primary },
    { label: 'Apply Leave', sub: 'Faculty time-off', icon: Calendar, screen: 'TeacherApplyLeave', color: colors.danger },
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
                <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'Faculty Member'}</Text>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>EDUCATOR</Text>
                </View>
              </View>

              <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>

              {user?.departmentId && (
                <View style={styles.deptRow}>
                  <Building2 size={11} color={colors.textMuted} />
                  <Text style={styles.deptText} numberOfLines={1}>
                    {user?.departmentId?.departmentName || user?.departmentId?.name || 'Academic Department'}
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
                  Coordinator: {coordClassName}
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
              activeOpacity={0.75}
            >
              <Shield size={12} color={colors.primary} />
              <Text style={styles.systemStatusText}>System Status</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2. CLASS COORDINATOR PENDING LEAVES ALERT (STRICTLY PRESERVED)*/}
        {/* ============================================================ */}
        {isCoordinator && pendingLeavesCount > 0 && (
          <TouchableOpacity
            style={[styles.coordinatorAlertCard, shadows.sm]}
            onPress={() => navigation.navigate('TeacherCoordinatorLeaves')}
            activeOpacity={0.85}
          >
            <View style={styles.coordinatorAlertIconBox}>
              <ShieldAlert size={22} color="#ef4444" />
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
                Applications awaiting your approval as Class Coordinator ({coordClassName}).
              </Text>
            </View>
            <ChevronRight size={18} color="#ef4444" />
          </TouchableOpacity>
        )}

        {/* ============================================================ */}
        {/* 3. LIVE NOW / NEXT LECTURE HERO BANNER                        */}
        {/* ============================================================ */}
        {liveSlot ? (
          <View style={[styles.liveHeroCard, shadows.md]}>
            <View style={styles.liveHeroHeader}>
              <View style={styles.liveNowTag}>
                <View style={styles.livePulseDot} />
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
        ) : todayDone ? (
          <View style={[styles.todayDoneCard, shadows.sm]}>
            <View style={styles.todayDoneIconBox}>
              <CheckCircle2 size={18} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayDoneTitle}>All Lectures Completed For Today! 🎉</Text>
              <Text style={styles.todayDoneSub}>You have wrapped up all your scheduled classes for today.</Text>
            </View>
          </View>
        ) : null}

        {/* ============================================================ */}
        {/* 4. ACADEMIC OVERVIEW STATS (MATCHING WEB TEMPLATE)            */}
        {/* ============================================================ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Academic Overview</Text>
          <TouchableOpacity
            style={styles.reportShortcutBtn}
            onPress={() => setShowReportModal(true)}
            activeOpacity={0.7}
          >
            <Download size={12} color={colors.primary} />
            <Text style={styles.reportShortcutText}>Reports</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={Users}
            label="My Students"
            value={report?.totalStudents ?? (subjects.length ? `${subjects.length * 30}+` : '38')}
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
        {/* 5. TEACHER SCHEDULE & DOWNLOAD TIMETABLE (WEB PARITY)         */}
        {/* ============================================================ */}
        <View style={[styles.sectionHeaderRow, { marginTop: spacing.md }]}>
          <View>
            <Text style={styles.sectionTitle}>Teacher Schedule</Text>
            <Text style={styles.sectionSubTitle}>
              {selectedDay} • {daySlots.length} {daySlots.length === 1 ? 'Lecture' : 'Lectures'}
            </Text>
          </View>

          {/* Web-Style Download Timetable Button */}
          <TouchableOpacity
            style={[styles.downloadTimetableBtn, shadows.sm]}
            onPress={handleExportTimetable}
            disabled={exportingTimetable}
            activeOpacity={0.85}
          >
            {exportingTimetable ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Download size={14} color="#fff" />
                <Text style={styles.downloadTimetableText}>Download</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Day Switcher Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsScroll}>
          {DAYS.map((day) => {
            const isSelected = selectedDay === day;
            const isToday = day.toLowerCase() === todayName.toLowerCase();
            const slotCount = subjects.filter((s) => (s.dayOfWeek || s.day_of_week)?.toLowerCase() === day.toLowerCase()).length;

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
                {slotCount > 0 && (
                  <View style={[styles.slotCountPill, isSelected && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <Text style={[styles.slotCountText, isSelected && { color: '#fff' }]}>{slotCount}</Text>
                  </View>
                )}
                {isToday ? (
                  <View style={[styles.todayDot, isSelected && { backgroundColor: '#fff' }]} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Scheduled Slot Cards for the Selected Day */}
        {daySlots.length === 0 ? (
          <View style={styles.emptySlotsCard}>
            <Calendar size={28} color={colors.textMuted} />
            <Text style={styles.emptySlotsText}>No lectures scheduled on {selectedDay}</Text>
            <TouchableOpacity
              style={styles.viewFullTimetableBtn}
              onPress={() => navigation.navigate('TeacherTimetable')}
            >
              <Text style={styles.viewFullTimetableText}>Open Full Weekly View</Text>
              <ChevronRight size={13} color={colors.teacher} />
            </TouchableOpacity>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} color={isCurrent ? colors.success : colors.textMuted} />
                    <Text style={[styles.slotTimeText, isCurrent && { color: colors.success, fontWeight: '700' }]}>
                      {timeStr}
                    </Text>
                  </View>
                  {isCurrent && (
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                    </View>
                  )}
                </View>

                <View style={styles.slotDetailsCol}>
                  <Text style={styles.slotSubject} numberOfLines={1}>{subName}</Text>
                  <View style={styles.slotPillRow}>
                    <View style={styles.slotClassPill}>
                      <Users size={10} color={colors.textSecondary} />
                      <Text style={styles.slotClassText}>{clsName}</Text>
                    </View>
                    <View style={styles.slotRoomPill}>
                      <MapPin size={10} color={colors.textMuted} />
                      <Text style={styles.slotRoomText}>{roomStr}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.slotActionBtn, isCurrent ? { backgroundColor: colors.success } : { backgroundColor: colors.teacher + '20' }]}
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
        {/* 6. QUICK ACTIONS (2-COLUMN GRID MATCHING WEB TEMPLATES)       */}
        {/* ============================================================ */}
        <View style={[styles.sectionHeaderRow, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubTitle}>Tools & Workspaces</Text>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.quickCard, shadows.sm]}
              onPress={() => {
                if (action.action) action.action();
                else if (action.screen) navigation.navigate(action.screen);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '20' }]}>
                <action.icon size={20} color={action.color} />
              </View>
              <View style={styles.quickTextCol}>
                <View style={styles.quickLabelRow}>
                  <Text style={styles.quickLabel} numberOfLines={1}>{action.label}</Text>
                  {action.badge && (
                    <View style={styles.actionBadgePill}>
                      <Text style={styles.actionBadgePillText}>{action.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.quickSub} numberOfLines={1}>{action.sub}</Text>
              </View>
              <ChevronRight size={13} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ============================================================ */}
        {/* 7. MY TEACHING SUBJECTS (MATCHING WEB PROFILE LIST)           */}
        {/* ============================================================ */}
        {uniqueSubjects.length > 0 && (
          <>
            <View style={[styles.sectionHeaderRow, { marginTop: spacing.md }]}>
              <View>
                <Text style={styles.sectionTitle}>My Teaching Subjects</Text>
                <Text style={styles.sectionSubTitle}>{uniqueSubjects.length} Courses Assigned</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Roster')} activeOpacity={0.7}>
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
                <View style={[styles.subjectIconBox, { backgroundColor: colors.teacher + '15' }]}>
                  <BookOpen size={16} color={colors.teacher} />
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName} numberOfLines={1}>{subj.name}</Text>
                  <Text style={styles.subjectMeta} numberOfLines={1}>
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
      {/* 8. SYSTEM STATUS / ACTIVE PERMISSIONS MODAL                  */}
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
              activeOpacity={0.8}
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
    flexShrink: 1,
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
    gap: 5,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
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
    ...typography.base,
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

  /* Today Done Card */
  todayDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#10b98133',
    marginBottom: spacing.md,
  },
  todayDoneIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b98115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDoneTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todayDoneSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* Coordinator Alert (Preserved Action Required) */
  coordinatorAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ef444412',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#ef444444',
    marginBottom: spacing.md,
  },
  coordinatorAlertIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef444422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinatorAlertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  coordinatorAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  newTag: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  newTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  coordinatorAlertSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  sectionSubTitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  reportShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primary + '15',
  },
  reportShortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
  },

  /* Download Timetable Button (Matching Web shiny button) */
  downloadTimetableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.teacher,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  downloadTimetableText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  /* Day Tabs */
  dayTabsScroll: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  dayTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
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
  slotCountPill: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  slotCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teacher,
  },

  /* Slot Cards */
  emptySlotsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  emptySlotsText: {
    ...typography.sm,
    color: colors.textMuted,
  },
  viewFullTimetableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  viewFullTimetableText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teacher,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  slotTimeCol: {
    alignItems: 'flex-start',
    gap: 3,
    minWidth: 85,
  },
  slotTimeText: {
    fontSize: 10,
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
  slotPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  slotClassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  slotClassText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  slotRoomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  slotRoomText: {
    fontSize: 10,
    color: colors.textMuted,
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

  /* Quick Actions (2-Column Grid) */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  quickCard: {
    flexBasis: '48.5%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTextCol: {
    flex: 1,
  },
  quickLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  quickSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  actionBadgePill: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  actionBadgePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
  },

  /* Teaching subjects */
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  subjectIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subjectMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
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
