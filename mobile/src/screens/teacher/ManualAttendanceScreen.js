import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  CheckCheck,
  XCircle,
  BookOpen,
  Search,
  Lock,
  Clock,
  AlertCircle,
  Save,
  ShieldAlert,
  ChevronDown,
  Calendar,
  X,
  CheckCircle,
  MessageSquare,
  Download,
  FileSpreadsheet,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportCsv } from '../../utils/fileExporter';
import Papa from 'papaparse';

// ─── Status Config (matches Faculty Attendance design) ─────────────────────
const STATUS_CONFIG = {
  present: { label: 'Present', short: 'P', color: '#16a34a' },
  absent:  { label: 'Absent',  short: 'A', color: '#dc2626' },
  leave:   { label: 'Leave',   short: 'L', color: colors.primary },
};

// ─── Helper: check if current time is within a class slot (+/- 10 min buffer)
const isSlotTimeActive = (slot, selectedDate) => {
  if (!slot || !slot.startTime || !slot.endTime || !slot.dayOfWeek) return true;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (selectedDate && selectedDate !== todayStr) return false;
  if (days[now.getDay()] !== slot.dayOfWeek) return false;

  const timeToMinutes = (timeStr) => {
    const parts = (timeStr || '').trim().split(' ');
    if (parts.length < 2) return 0;
    const [time, modifier] = parts;
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(slot.startTime) - 10;
  const endMinutes = timeToMinutes(slot.endTime) + 10;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// ─── Inline Feedback Banner ─────────────────────────────────────────────────
const Banner = ({ type, message, onDismiss }) => {
  if (!message) return null;
  const isErr = type === 'error';
  return (
    <View style={[bs.wrap, isErr ? bs.err : bs.ok]}>
      {isErr
        ? <AlertCircle size={15} color="#EF4444" />
        : <CheckCircle size={15} color="#10B981" />}
      <Text style={[bs.txt, { color: isErr ? '#EF4444' : '#10B981' }]}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={14} color={isErr ? '#EF4444' : '#10B981'} />
      </TouchableOpacity>
    </View>
  );
};

const bs = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginHorizontal: spacing.md, marginTop: spacing.sm },
  err:  { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  ok:   { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  txt:  { flex: 1, fontSize: 13, fontWeight: '600' },
});

// ─── Main Screen ────────────────────────────────────────────────────────────
const ManualAttendanceScreen = () => {
  const { user } = useAuth();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [roster, setRoster]                     = useState([]);
  const [selectedSession, setSelectedSession]   = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [searchTerm, setSearchTerm]             = useState('');
  const [statusFilter, setStatusFilter]         = useState('all');
  const [attendanceMap, setAttendanceMap]       = useState({});
  const [remarksMap, setRemarksMap]             = useState({});
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [attendanceDate, setAttendanceDate]     = useState(todayStr);
  const [autoSaveEnabled, setAutoSaveEnabled]   = useState(true);
  const [togglingAutoSave, setTogglingAutoSave] = useState(false);
  const [banner, setBanner]                     = useState({ type: '', message: '' });

  // Modals
  const [showSlotPicker, setShowSlotPicker]     = useState(false);
  const [showDatePicker, setShowDatePicker]     = useState(false);
  const [tempDateInput, setTempDateInput]       = useState('');
  const [editingRemarkStudent, setEditingRemarkStudent] = useState(null);
  const [remarkDraft, setRemarkDraft]           = useState('');
  const [bulkModal, setBulkModal]               = useState({ visible: false, targetStatus: 'present' });
  const [showExportModal, setShowExportModal]   = useState(false);
  const [exportStartDate, setExportStartDate]   = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [exportEndDate, setExportEndDate]       = useState(todayStr);
  const [exporting, setExporting]               = useState(false);

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4000);
  };

  // ─── Fetch Roster & Auto-save setting ────────────────────────────────────
  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [rosterRes, autoRes] = await Promise.all([
        api.get('/teacher/roster').catch(() => ({ data: {} })),
        api.get('/attendance/auto-save-setting').catch(() => ({ data: { autoSaveEnabled: true } })),
      ]);

      const subjectRoster = rosterRes.data?.subjectRoster || [];
      setRoster(subjectRoster);
      setAutoSaveEnabled(autoRes.data?.autoSaveEnabled ?? true);

      if (subjectRoster.length > 0 && !selectedSession) {
        setSelectedSession(subjectRoster[0]);
      } else if (selectedSession) {
        const found = subjectRoster.find((r) => r.allocationId === selectedSession.allocationId);
        if (found) setSelectedSession(found);
      }
    } catch (err) {
      console.error('Fetch roster error:', err);
      showBanner('error', 'Failed to load class attendance roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSession?.allocationId]);

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

  // ─── Init attendanceMap when session changes ──────────────────────────────
  useEffect(() => {
    if (selectedSession?.students) {
      const initial = {};
      const remarks = {};
      selectedSession.students.forEach((s) => {
        const sid = s._id || s.id;
        if (s.attendanceStatus === 'leave') initial[sid] = 'leave';
        else if (s.attendanceStatus === 'present') initial[sid] = 'present';
        else initial[sid] = 'absent';
        remarks[sid] = s.remarks || '';
      });
      setAttendanceMap(initial);
      setRemarksMap(remarks);
    } else {
      setAttendanceMap({});
      setRemarksMap({});
    }

    if (selectedSession?.slots?.length > 0) {
      const activeIdx = selectedSession.slots.findIndex((s) =>
        isSlotTimeActive(s, attendanceDate)
      );
      setSelectedSlotIndex(activeIdx !== -1 ? activeIdx : 0);
    } else {
      setSelectedSlotIndex(0);
    }
  }, [selectedSession, attendanceDate]);

  // ─── Auto-save toggle ─────────────────────────────────────────────────────
  const handleToggleAutoSave = async (value) => {
    setTogglingAutoSave(true);
    try {
      const nextVal = value !== undefined ? value : !autoSaveEnabled;
      const { data } = await api.post('/attendance/toggle-auto-save', { enabled: nextVal });
      setAutoSaveEnabled(data.autoSaveEnabled);
      showBanner('success', data.message || (nextVal ? 'Auto-Save enabled.' : 'Auto-Save turned off.'));
    } catch (err) {
      showBanner('error', 'Failed to update Auto-Save setting.');
    } finally {
      setTogglingAutoSave(false);
    }
  };

  // ─── Slot & Status Helpers ────────────────────────────────────────────────
  const currentSlot = selectedSession?.slots?.length > 0
    ? selectedSession.slots[selectedSlotIndex] || selectedSession.slots[0]
    : null;

  const hasBypass = user?.permissions?.includes('bypassTimeRestraint') || user?.role === 'admin';
  const isSelectedSlotActive = isSlotTimeActive(currentSlot, attendanceDate);
  const canMark = isSelectedSlotActive || hasBypass;

  const handleStatusChange = (studentId, newStatus) => {
    if (!canMark) {
      Alert.alert('Time Restricted', 'Attendance marking is restricted outside the active slot time.');
      return;
    }
    setAttendanceMap((prev) => ({ ...prev, [studentId]: newStatus }));
  };

  const handleRemarkChange = (studentId, text) => {
    setRemarksMap((prev) => ({ ...prev, [studentId]: text }));
  };

  const openRemarkModal = (student) => {
    setEditingRemarkStudent(student);
    const sid = student._id || student.id;
    setRemarkDraft(remarksMap[sid] || '');
  };

  const saveRemarkDraft = () => {
    if (editingRemarkStudent) {
      const sid = editingRemarkStudent._id || editingRemarkStudent.id;
      handleRemarkChange(sid, remarkDraft);
    }
    setEditingRemarkStudent(null);
    setRemarkDraft('');
  };

  // ─── Bulk Mark ────────────────────────────────────────────────────────────
  const executeBulkMark = (status) => {
    if (!canMark) {
      Alert.alert('Time Restricted', 'Attendance marking is restricted outside the active slot time.');
      setBulkModal({ visible: false, targetStatus: 'present' });
      return;
    }
    setAttendanceMap((prev) => {
      const next = { ...prev };
      (selectedSession?.students || []).forEach((s) => {
        const sid = s._id || s.id;
        if (s.attendanceStatus !== 'leave' && next[sid] !== 'leave') {
          next[sid] = status;
        }
      });
      return next;
    });
    setBulkModal({ visible: false, targetStatus: 'present' });
    showBanner('success', 'Marked all eligible students as ' + (status === 'present' ? 'Present' : 'Absent') + '.');
  };

  // ─── Save Bulk Attendance ─────────────────────────────────────────────────
  const submitBulkAttendance = async () => {
    if (!canMark) {
      showBanner('error', 'Attendance marking is restricted outside the active slot time window.');
      return;
    }
    const studentIds = Object.keys(attendanceMap);
    if (studentIds.length === 0) {
      showBanner('error', 'No student attendance records to submit.');
      return;
    }
    setSaving(true);
    try {
      const attendanceData = studentIds.map((id) => ({
        studentId: id,
        status: attendanceMap[id] || 'absent',
        remarks: remarksMap[id] || '',
      }));
      const payload = {
        attendanceData,
        classId:   selectedSession?.class?._id  || selectedSession?.class?.id,
        subjectId: selectedSession?.subject?._id || selectedSession?.subject?.id,
        date:      attendanceDate,
        timeSlot:  currentSlot?.timeSlot || (currentSlot ? `${currentSlot.startTime} - ${currentSlot.endTime}` : null),
      };
      await api.post('/attendance/manual-bulk', payload);
      showBanner('success', `Attendance saved for ${studentIds.length} students!`);
      fetchData(true);
    } catch (err) {
      showBanner('error', err.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Export ───────────────────────────────────────────────────────────────
  const handleExportReport = async () => {
    setExporting(true);
    try {
      const students = selectedSession?.students || [];
      const csvRows = students.map((s) => {
        const sid = s._id || s.id;
        return {
          Date:      attendanceDate,
          Name:      s.name || 'N/A',
          'Roll No': s.rollNumber || 'N/A',
          Email:     s.email || 'N/A',
          Status:    (attendanceMap[sid] || 'absent').toUpperCase(),
          Remarks:   remarksMap[sid] || '',
        };
      });
      const csvString = Papa.unparse(csvRows);
      const filename  = `Attendance_${selectedSession?.subject?.subjectName || 'Export'}_${attendanceDate}.csv`;
      await exportCsv(csvString, filename);
      setShowExportModal(false);
      showBanner('success', `Report downloaded (${csvRows.length} records).`);
    } catch (err) {
      showBanner('error', 'Failed to generate attendance report.');
    } finally {
      setExporting(false);
    }
  };

  // ─── KPI Stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let present = 0, absent = 0, leave = 0;
    Object.values(attendanceMap).forEach((v) => {
      if (v === 'present') present++;
      else if (v === 'leave') leave++;
      else absent++;
    });
    const total = Object.keys(attendanceMap).length;
    return { total, present, absent, leave };
  }, [attendanceMap]);

  // ─── Filtered Students ────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    const students = selectedSession?.students || [];
    return students.filter((s) => {
      const sid = s._id || s.id;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch = !q
        || s.name?.toLowerCase().includes(q)
        || s.rollNumber?.toLowerCase().includes(q)
        || s.email?.toLowerCase().includes(q);
      const currentSt = attendanceMap[sid] || 'absent';
      const matchStatus = statusFilter === 'all' || currentSt === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [selectedSession?.students, searchTerm, statusFilter, attendanceMap]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <FullPageLoader message="Loading student attendance portal..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header title="Attendance" subtitle="Student Attendance Portal" />

      <Banner
        type={banner.type}
        message={banner.message}
        onDismiss={() => setBanner({ type: '', message: '' })}
      />

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Subject Chips ─────────────────────────────────────────────── */}
        {roster.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.subjectScrollRow}
            contentContainerStyle={styles.subjectChipRow}
          >
            {roster.map((session) => {
              const active     = session.slots?.some((s) => isSlotTimeActive(s, attendanceDate));
              const isSelected = selectedSession?.allocationId === session.allocationId;
              return (
                <TouchableOpacity
                  key={session.allocationId}
                  style={[styles.subjectChip, isSelected && styles.subjectChipActive]}
                  onPress={() => { setSelectedSession(session); setStatusFilter('all'); }}
                  activeOpacity={0.8}
                >
                  <BookOpen size={12} color={isSelected ? '#fff' : active ? '#10b981' : colors.primary} />
                  <Text style={[styles.subjectChipText, isSelected && styles.subjectChipTextActive]} numberOfLines={1}>
                    {session.class?.className} – {session.subject?.subjectName}
                  </Text>
                  {active && (
                    <View style={[styles.liveDot, isSelected && { backgroundColor: '#a7f3d0' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ─── Top Control Strip (Date & Slot & Auto-Save) ──────────────── */}
        <View style={styles.topControlStrip}>
          {/* Date chip */}
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => { setTempDateInput(attendanceDate); setShowDatePicker(true); }}
          >
            <Calendar size={14} color={colors.primary} />
            <Text style={styles.dateText}>
              {new Date(attendanceDate + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
            {attendanceDate === todayStr && (
              <View style={styles.todayPill}><Text style={styles.todayPillText}>Today</Text></View>
            )}
          </TouchableOpacity>

          {/* Slot chip (only when >1 slot) */}
          {(selectedSession?.slots?.length > 1) && (
            <TouchableOpacity style={styles.slotChip} onPress={() => setShowSlotPicker(true)}>
              <Clock size={12} color={colors.primary} />
              <Text style={styles.slotChipText} numberOfLines={1}>
                {currentSlot?.dayOfWeek?.slice(0, 3)} • {currentSlot?.timeSlot || `${currentSlot?.startTime}-${currentSlot?.endTime}`}
              </Text>
              <ChevronDown size={12} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Auto-Save pill */}
          <View style={styles.autoSavePill}>
            <Clock size={12} color={autoSaveEnabled ? colors.primary : colors.textMuted} />
            <Text style={[styles.autoSaveLabel, { color: autoSaveEnabled ? colors.textPrimary : colors.textMuted }]}>
              {autoSaveEnabled ? 'Auto-Save' : 'Manual'}
            </Text>
            <TouchableOpacity
              onPress={() => handleToggleAutoSave(!autoSaveEnabled)}
              disabled={togglingAutoSave}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View style={[styles.toggleTrack, { backgroundColor: autoSaveEnabled ? colors.primary : '#4b5563' }]}>
                <View style={[styles.toggleKnob, autoSaveEnabled ? styles.toggleKnobOn : styles.toggleKnobOff]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Session Status Banner ──────────────────────────────────────── */}
        {!isSelectedSlotActive && !hasBypass && (
          <View style={styles.restrictedBanner}>
            <Lock size={13} color="#dc2626" />
            <Text style={styles.restrictedBannerText}>
              Time restricted · marking locked until slot time
            </Text>
          </View>
        )}

        {/* ─── Tabular Stats Ribbon ───────────────────────────────────────── */}
        <View style={[styles.statsRibbon, shadows.sm]}>
          {[
            { key: 'all',     label: 'TOTAL',   value: stats.total,   color: colors.textPrimary },
            { key: 'present', label: 'PRESENT',  value: stats.present, color: '#16a34a' },
            { key: 'absent',  label: 'ABSENT',   value: stats.absent,  color: '#dc2626' },
            { key: 'leave',   label: 'LEAVE',    value: stats.leave,   color: colors.primary },
          ].map((item, i, arr) => (
            <React.Fragment key={item.key}>
              <TouchableOpacity
                style={[styles.statRibbonItem, statusFilter === item.key && styles.statRibbonItemActive]}
                onPress={() => setStatusFilter(item.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statRibbonLabel, { color: item.color }]}>{item.label}</Text>
                <Text style={[styles.statRibbonVal, { color: item.color }]}>{item.value}</Text>
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ─── Search & Action Toolbar ─────────────────────────────────────── */}
        <View style={styles.toolbarSuite}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search student by name or roll..."
              placeholderTextColor={colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
              clearButtonMode="while-editing"
            />
            {!!searchTerm && (
              <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsBar}>
            <TouchableOpacity
              style={styles.actionBtnSuccess}
              onPress={() => setBulkModal({ visible: true, targetStatus: 'present' })}
              activeOpacity={0.7}
            >
              <CheckCheck size={14} color="#16a34a" />
              <Text style={styles.actionBtnSuccessText}>Mark All Present</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnDanger}
              onPress={() => setBulkModal({ visible: true, targetStatus: 'absent' })}
              activeOpacity={0.7}
            >
              <XCircle size={14} color="#dc2626" />
              <Text style={styles.actionBtnDangerText}>Mark All Absent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => setShowExportModal(true)}
              activeOpacity={0.7}
            >
              <Download size={14} color={colors.primary} />
              <Text style={styles.actionBtnPrimaryText}>Export</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ─── DATA TABLE ──────────────────────────────────────────────────── */}
        <View style={[styles.tableCard, shadows.sm]}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.colIndex}>
              <Text style={styles.tableHeaderColText}>#</Text>
            </View>
            <View style={styles.colStudent}>
              <Text style={styles.tableHeaderColText}>STUDENT & CLASS</Text>
            </View>
            <View style={styles.colStatus}>
              <Text style={styles.tableHeaderColText}>ATTENDANCE</Text>
            </View>
            <View style={styles.colNote}>
              <Text style={styles.tableHeaderColText}>NOTE</Text>
            </View>
          </View>

          {/* Table Body */}
          {filteredStudents.length === 0 ? (
            <View style={styles.emptyTable}>
              <Users size={36} color={colors.textMuted} />
              <Text style={styles.emptyTableText}>
                {selectedSession ? 'No matching students found.' : 'Select a subject to start marking.'}
              </Text>
            </View>
          ) : (
            filteredStudents.map((item, idx) => {
              const studentId    = item._id || item.id;
              const currentSt    = attendanceMap[studentId] || 'absent';
              const currentRemark = remarksMap[studentId] || '';
              const isLeave      = item.attendanceStatus === 'leave' || currentSt === 'leave';
              const isAlt        = idx % 2 === 1;

              return (
                <View
                  key={studentId}
                  style={[
                    styles.tableRow,
                    isAlt && styles.tableRowAlt,
                    idx === filteredStudents.length - 1 && styles.tableRowLast,
                  ]}
                >
                  {/* Col 1: Index */}
                  <View style={styles.colIndex}>
                    <Text style={styles.indexText}>{idx + 1}</Text>
                  </View>

                  {/* Col 2: Student info */}
                  <View style={styles.colStudent}>
                    <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.studentSub} numberOfLines={1}>
                      {item.rollNumber ? `Roll: ${item.rollNumber}` : ''}{item.rollNumber && item.email ? ' • ' : ''}{item.email || ''}
                    </Text>
                    {isLeave && (
                      <View style={styles.inlineLeaveBadge}>
                        <ShieldAlert size={9} color={colors.primary} />
                        <Text style={styles.inlineLeaveText}>Approved Leave</Text>
                      </View>
                    )}
                    {!!currentRemark && (
                      <TouchableOpacity
                        onPress={() => openRemarkModal(item)}
                        style={styles.inlineRemarkChip}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.inlineRemarkText} numberOfLines={1}>📝 {currentRemark}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Col 3: Status Pills (P / A / L) */}
                  <View style={styles.colStatus}>
                    <View style={styles.statusPillsWrap}>
                      {(['present', 'absent', 'leave']).map((st) => {
                        const cfg        = STATUS_CONFIG[st];
                        const isSelected = currentSt === st;
                        return (
                          <TouchableOpacity
                            key={st}
                            style={[
                              styles.pillBtn,
                              isSelected
                                ? { backgroundColor: cfg.color, borderColor: cfg.color }
                                : styles.pillBtnInactive,
                            ]}
                            onPress={() => handleStatusChange(studentId, st)}
                            activeOpacity={0.6}
                          >
                            <Text style={[styles.pillText, isSelected ? styles.pillTextActive : styles.pillTextInactive]}>
                              {cfg.short}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Col 4: Note button */}
                  <View style={styles.colNote}>
                    <TouchableOpacity
                      style={[styles.noteBtn, !!currentRemark && styles.noteBtnActive]}
                      onPress={() => openRemarkModal(item)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <MessageSquare size={14} color={currentRemark ? colors.primary : colors.textMuted} />
                      {!!currentRemark && <View style={styles.noteDot} />}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ─── Legend ───────────────────────────────────────────────────────── */}
        <View style={styles.legendStrip}>
          <Text style={styles.legendTitle}>Legend:</Text>
          {[
            { label: 'P = Present', color: '#16a34a' },
            { label: 'A = Absent',  color: '#dc2626' },
            { label: 'L = Leave',   color: colors.primary },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ─── Sticky Bottom Save Bar ───────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || !canMark || filteredStudents.length === 0) && { opacity: 0.6 }]}
          onPress={submitBulkAttendance}
          disabled={saving || !canMark || filteredStudents.length === 0}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Attendance</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Slot Picker Modal ────────────────────────────────────────────── */}
      <Modal visible={showSlotPicker} transparent animationType="fade" onRequestClose={() => setShowSlotPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowSlotPicker(false)} />
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Timetable Slot</Text>
              <TouchableOpacity onPress={() => setShowSlotPicker(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedSession?.slots?.map((slot, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.slotOption, selectedSlotIndex === idx && styles.slotOptionActive]}
                onPress={() => { setSelectedSlotIndex(idx); setShowSlotPicker(false); }}
              >
                <Text style={[styles.slotOptionText, selectedSlotIndex === idx && { color: colors.primary, fontWeight: '800' }]}>
                  {slot.dayOfWeek} • {slot.timeSlot || `${slot.startTime} - ${slot.endTime}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ─── Date Picker Modal ────────────────────────────────────────────── */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowDatePicker(false)} />
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Attendance Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Enter date in YYYY-MM-DD format:</Text>
            <View style={styles.dateInputWrapper}>
              <Calendar size={16} color={colors.textMuted} />
              <TextInput
                style={styles.modalTextInput}
                value={tempDateInput}
                onChangeText={setTempDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  if (tempDateInput.trim()) setAttendanceDate(tempDateInput.trim());
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.modalSaveText}>Set Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Remark Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={!!editingRemarkStudent}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingRemarkStudent(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MessageSquare size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>Attendance Note</Text>
                  <Text style={styles.modalSubTitle} numberOfLines={1}>{editingRemarkStudent?.name}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setEditingRemarkStudent(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.presetHeading}>Quick Tags</Text>
            <View style={styles.presetRow}>
              {['Late', 'Medical', 'Field Work', 'Permission', 'Personal'].map((tag) => {
                const isSel = remarkDraft.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.presetChip, isSel && styles.presetChipActive]}
                    onPress={() => {
                      if (isSel) setRemarkDraft(remarkDraft.replace(tag, '').replace(/^,\s*|,\s*$/g, '').trim());
                      else setRemarkDraft((p) => p ? `${p}, ${tag}` : tag);
                    }}
                  >
                    <Text style={[styles.presetChipText, isSel && styles.presetChipTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Remark / Notes</Text>
              <TextInput
                style={styles.modalTextArea}
                value={remarkDraft}
                onChangeText={setRemarkDraft}
                placeholder="e.g. Late arrival, Medical leave..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingRemarkStudent(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveRemarkDraft}>
                <Text style={styles.modalSaveText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Bulk Confirm Modal ───────────────────────────────────────────── */}
      <Modal
        visible={bulkModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkModal({ visible: false, targetStatus: 'present' })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {bulkModal.targetStatus === 'present'
                ? <CheckCheck size={22} color="#16a34a" />
                : <XCircle size={22} color="#dc2626" />}
              <Text style={styles.modalTitle}>
                Mark All {bulkModal.targetStatus === 'present' ? 'Present' : 'Absent'}?
              </Text>
            </View>
            <Text style={styles.modalSub}>
              This will set all eligible students to {bulkModal.targetStatus === 'present' ? 'Present' : 'Absent'}. Students on approved leave will remain protected.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setBulkModal({ visible: false, targetStatus: 'present' })}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: bulkModal.targetStatus === 'present' ? '#16a34a' : '#dc2626' },
                ]}
                onPress={() => executeBulkMark(bulkModal.targetStatus)}
              >
                <Text style={styles.modalExportText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Export Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={20} color="#16a34a" />
                <Text style={styles.modalTitle}>Export Attendance</Text>
              </View>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Downloads current session attendance for {selectedSession?.subject?.subjectName || 'selected subject'} as CSV.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowExportModal(false)} disabled={exporting}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalExportBtn, exporting && { opacity: 0.6 }]}
                onPress={handleExportReport}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Download size={16} color="#fff" />
                    <Text style={styles.modalExportText}>Download CSV</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  mainScroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  /* Subject chips */
  subjectScrollRow: { flexGrow: 0, marginHorizontal: spacing.md, marginTop: spacing.sm },
  subjectChipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  subjectChipText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, maxWidth: 160 },
  subjectChipTextActive: { color: '#fff' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },

  /* Top Control Strip */
  topControlStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgCard,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  todayPill: { backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  todayPillText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgCard,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotChipText: { fontSize: 11, fontWeight: '700', color: colors.textPrimary },
  autoSavePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bgCard,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoSaveLabel: { fontSize: 11, fontWeight: '600' },
  toggleTrack: {
    width: 28, height: 16, borderRadius: 8,
    position: 'relative', justifyContent: 'center',
  },
  toggleKnob: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#fff', position: 'absolute',
  },
  toggleKnobOn: { right: 2 },
  toggleKnobOff: { left: 2 },

  /* Restricted banner */
  restrictedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  restrictedBannerText: { fontSize: 11, fontWeight: '600', color: '#dc2626' },

  /* Stats Ribbon */
  statsRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statRibbonItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 2, borderRadius: radius.sm,
  },
  statRibbonItemActive: { backgroundColor: colors.primary + '15' },
  statRibbonLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  statRibbonVal: { fontSize: 15, fontWeight: '800' },
  statDivider: { width: 1, height: 24, backgroundColor: colors.border },

  /* Toolbar */
  toolbarSuite: { paddingHorizontal: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border, height: 40, gap: 8,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13, paddingVertical: 0 },
  actionsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  actionBtnSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#16a34a15', paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: radius.full, borderWidth: 1, borderColor: '#16a34a40',
  },
  actionBtnSuccessText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  actionBtnDanger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#dc262615', paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: radius.full, borderWidth: 1, borderColor: '#dc262640',
  },
  actionBtnDangerText: { fontSize: 11, fontWeight: '700', color: '#dc2626' },
  actionBtnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary + '15', paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary + '40',
  },
  actionBtnPrimaryText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  /* Data Table */
  tableCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: 9, paddingHorizontal: 8,
  },
  tableHeaderColText: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  tableRowAlt: { backgroundColor: 'rgba(255,255,255,0.02)' },
  tableRowLast: { borderBottomWidth: 0 },

  /* Column widths */
  colIndex: { width: 28, alignItems: 'center', justifyContent: 'center' },
  indexText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  colStudent: { flex: 1, minWidth: 80, paddingRight: 6, justifyContent: 'center' },
  studentName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  studentSub: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  inlineLeaveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4,
    alignSelf: 'flex-start', marginTop: 3,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  inlineLeaveText: { fontSize: 9, fontWeight: '700', color: colors.primary },
  inlineRemarkChip: {
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    alignSelf: 'flex-start', marginTop: 3,
  },
  inlineRemarkText: { fontSize: 10, color: colors.primary, fontWeight: '600' },

  colStatus: { width: 112, alignItems: 'center', justifyContent: 'center' },
  statusPillsWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderRadius: 8, padding: 2,
    borderWidth: 1, borderColor: colors.border, gap: 3,
  },
  pillBtn: {
    width: 30, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  pillBtnInactive: { backgroundColor: 'transparent', borderColor: 'transparent' },
  pillText: { fontSize: 10, fontWeight: '800' },
  pillTextActive: { color: '#fff' },
  pillTextInactive: { color: colors.textMuted },

  colNote: { width: 32, alignItems: 'center', justifyContent: 'center' },
  noteBtn: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
    borderWidth: 1, borderColor: colors.border,
    position: 'relative',
  },
  noteBtnActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  noteDot: {
    position: 'absolute', top: 3, right: 3,
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: colors.primary,
  },

  emptyTable: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTableText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },

  /* Legend */
  legendStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: spacing.md, paddingHorizontal: spacing.md, flexWrap: 'wrap',
  },
  legendTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },

  /* Sticky Bottom Save Bar */
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...shadows.lg,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary,
    paddingVertical: 12, borderRadius: radius.md,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Modals */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.md,
  },
  modalCard: {
    width: '100%', maxWidth: 440,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.xs,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  modalSubTitle: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  modalSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  presetHeading: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  presetChip: {
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: radius.full, backgroundColor: colors.bgPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  presetChipActive: { backgroundColor: colors.primary + '25', borderColor: colors.primary },
  presetChipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  presetChipTextActive: { color: colors.primary, fontWeight: '700' },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  dateInputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 10, height: 40,
  },
  modalTextInput: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  modalTextArea: {
    backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: 10, color: colors.textPrimary,
    fontSize: 13, minHeight: 70,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: spacing.xs },
  modalCancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  modalSaveBtn: {
    flex: 1, backgroundColor: colors.primary,
    paddingVertical: 10, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  modalExportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#16a34a', paddingVertical: 10, borderRadius: radius.md,
  },
  modalExportText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* Slot & slot picker */
  slotOption: {
    paddingVertical: 12, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm, marginBottom: 4,
  },
  slotOptionActive: { backgroundColor: colors.primary + '15' },
  slotOptionText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
});

export default ManualAttendanceScreen;
