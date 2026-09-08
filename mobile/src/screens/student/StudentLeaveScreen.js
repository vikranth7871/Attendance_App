import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UploadCloud,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  MousePointerClick,
  ExternalLink,
  ShieldAlert,
  Briefcase,
  HeartPulse,
  Award,
  Info,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Header from '../../components/Header';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

/* ─── Leave Types Metadata (Adapted for Student Context) ─── */
const LEAVE_TYPES = [
  {
    id: 'Casual',
    label: 'Casual Leave',
    desc: 'General short-term leave for personal or family commitments',
    icon: Calendar,
    color: '#818cf8',
  },
  {
    id: 'Sick',
    label: 'Sick / Medical Leave',
    desc: 'Medical illness, doctor appointments, or health recovery',
    icon: HeartPulse,
    color: '#ec4899',
  },
  {
    id: 'Academic',
    label: 'Academic / Exam Leave',
    desc: 'External competitions, competitive exams, or symposiums',
    icon: Award,
    color: '#f59e0b',
  },
  {
    id: 'Duty',
    label: 'On-Duty / Sports / Event',
    desc: 'Institutional sports representation or official campus duty',
    icon: Briefcase,
    color: '#10b981',
  },
  {
    id: 'Other',
    label: 'Other Emergency',
    desc: 'Special or unforeseen emergency requiring leave',
    icon: ShieldAlert,
    color: '#a855f7',
  },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/* ─── Date Utility Helpers ─── */
const parseDateStr = (dateStr) => {
  if (!dateStr) return null;
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
};

const formatDateStr = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (dateStr) => {
  const d = parseDateStr(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/* ─── Feedback Banner ─── */
const Banner = ({ type, message, onDismiss }) => {
  if (!message) return null;
  const isErr = type === 'error';
  return (
    <View style={[bs.wrap, isErr ? bs.err : bs.ok]}>
      {isErr ? <AlertCircle size={16} color="#EF4444" /> : <CheckCircle2 size={16} color="#10B981" />}
      <Text style={[bs.txt, { color: isErr ? '#EF4444' : '#10B981' }]}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={15} color={isErr ? '#EF4444' : '#10B981'} />
      </TouchableOpacity>
    </View>
  );
};

const bs = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  err: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  ok: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  txt: { flex: 1, fontSize: 13, fontWeight: '600' },
});

const StudentLeaveScreen = ({ navigation }) => {
  // Screen Tabs: 'new' | 'history'
  const [activeTab, setActiveTab] = useState('new');
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected' | 'revoked'

  // Form State
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState(null);

  // Calendar State
  const [calendarMode, setCalendarMode] = useState('single'); // 'single' | 'range'
  const [rangeStep, setRangeStep] = useState(0); // 0 = picking start, 1 = picking end
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // UI States
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });

  // Document Viewer
  const [previewDocUrl, setPreviewDocUrl] = useState(null);
  const [previewDocTitle, setPreviewDocTitle] = useState('Attached Document');

  const showFeedback = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 5000);
  };

  // Fetch Student's Leave History
  const fetchLeaves = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const { data } = await api.get('/leave/my-leaves');
      setLeaves(Array.isArray(data) ? data : data?.leaves || []);
    } catch (err) {
      console.error('Student leaves fetch error:', err);
      showFeedback('error', 'Failed to load leave history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaves(true);
  }, []);

  /* ─── Calendar Math & Helpers ─── */
  const startObj = useMemo(() => parseDateStr(startDate), [startDate]);
  const endObj = useMemo(() => parseDateStr(endDate), [endDate]);

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentCalendarDate(new Date(year, month + 1, 1));
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [firstDayOfMonth, daysInMonth, year, month]);

  const isInRange = (dayObj) => {
    if (!startObj || !endObj || !dayObj) return false;
    const t = dayObj.getTime();
    const s = startObj.getTime();
    const e = endObj.getTime();
    return t > s && t < e;
  };

  const handleDayClick = (dayObj) => {
    if (!dayObj) return;
    const dateStr = formatDateStr(dayObj);

    if (calendarMode === 'single') {
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else {
      // Range Mode
      if (rangeStep === 0 || !startObj) {
        setStartDate(dateStr);
        setEndDate(dateStr);
        setRangeStep(1);
      } else {
        if (dayObj.getTime() < startObj.getTime()) {
          setStartDate(dateStr);
          setEndDate(formatDateStr(startObj));
        } else {
          setEndDate(dateStr);
        }
        setRangeStep(0);
      }
    }
  };

  const handleModeSwitch = (newMode) => {
    setCalendarMode(newMode);
    setRangeStep(0);
    if (newMode === 'single' && startDate) {
      setEndDate(startDate);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const str = formatDateStr(today);
    setCurrentCalendarDate(today);
    setStartDate(str);
    setEndDate(str);
    setRangeStep(0);
  };

  const handleTomorrow = () => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const str = formatDateStr(tmrw);
    setCurrentCalendarDate(tmrw);
    setStartDate(str);
    setEndDate(str);
    setRangeStep(0);
  };

  const handleResetDates = () => {
    setStartDate('');
    setEndDate('');
    setRangeStep(0);
  };

  const durationSummaryText = useMemo(() => {
    if (!startObj) return 'Select date(s) on the calendar';
    if (!endObj || isSameDay(startObj, endObj)) {
      return `1 Day Leave (${formatDisplayDate(startDate)})`;
    }
    const diffTime = Math.abs(endObj - startObj);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${days} Days Range (${formatDisplayDate(startDate)} — ${formatDisplayDate(endDate)})`;
  }, [startObj, endObj, startDate, endDate]);

  /* ─── File Attachment ─── */
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setAttachment(res.assets[0]);
      }
    } catch (err) {
      console.error('File pick error:', err);
      Alert.alert('File Error', 'Could not access document picker.');
    }
  };

  /* ─── Submit Leave Application ─── */
  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Missing Dates', 'Please select both start and end dates from the calendar.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Missing Reason', 'Please provide a reason for your leave application.');
      return;
    }

    setSubmitting(true);
    setBanner({ type: '', message: '' });

    try {
      const formData = new FormData();
      formData.append('leaveType', leaveType);
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('reason', reason.trim());

      if (attachment) {
        if (Platform.OS === 'web') {
          const rawFile = attachment.file;
          if (rawFile && (rawFile instanceof Blob || rawFile instanceof File)) {
            formData.append('document', rawFile, attachment.name || 'document.pdf');
          } else if (attachment.uri) {
            try {
              const resBlob = await fetch(attachment.uri).then((r) => r.blob());
              formData.append('document', resBlob, attachment.name || 'document.pdf');
            } catch (blobErr) {
              console.warn('Failed to fetch blob from URI:', blobErr);
            }
          }
        } else {
          formData.append('document', {
            uri: attachment.uri,
            name: attachment.name || 'document.pdf',
            type: attachment.mimeType || 'application/octet-stream',
          });
        }
      }

      await api.post('/leave/apply', formData);

      showFeedback('success', 'Leave application submitted successfully for Coordinator review!');
      setStartDate('');
      setEndDate('');
      setReason('');
      setAttachment(null);
      setRangeStep(0);

      // Refresh list and switch to History tab
      fetchLeaves(true);
      setActiveTab('history');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to submit leave application.';
      Alert.alert('Application Failed', errMsg);
      showFeedback('error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Filtered Leaves & Counts ─── */
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let revoked = 0;
    leaves.forEach((l) => {
      const s = (l.status || '').toLowerCase();
      if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
      else if (s === 'revoked') revoked++;
      else pending++;
    });
    return { all: leaves.length, pending, approved, rejected, revoked };
  }, [leaves]);

  const filteredLeaves = useMemo(() => {
    if (historyFilter === 'all') return leaves;
    return leaves.filter((l) => (l.status || '').toLowerCase() === historyFilter);
  }, [leaves, historyFilter]);

  const selectedTypeMeta = useMemo(() => {
    return LEAVE_TYPES.find((t) => t.id === leaveType) || LEAVE_TYPES[0];
  }, [leaveType]);

  const SelectedTypeIcon = selectedTypeMeta.icon;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ─── Screen Header ─── */}
      <Header
        title="Leave Application"
        subtitle="Submit leave applications for coordinator approval"
        navigation={navigation}
        rightAction={
          <TouchableOpacity
            style={styles.headerInfoBtn}
            onPress={() => setShowGuidelines(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Info size={18} color="#818cf8" />
          </TouchableOpacity>
        }
      />

      {/* ─── Feedback Banner ─── */}
      <Banner
        type={banner.type}
        message={banner.message}
        onDismiss={() => setBanner({ type: '', message: '' })}
      />

      {/* ─── Top Segmented Screen Tabs ─── */}
      <View style={styles.screenTabContainer}>
        <View style={styles.screenTabPills}>
          <TouchableOpacity
            style={[
              styles.screenTabPill,
              activeTab === 'new' && styles.screenTabPillActive,
            ]}
            onPress={() => setActiveTab('new')}
            activeOpacity={0.8}
          >
            <Send
              size={15}
              color={activeTab === 'new' ? '#fff' : colors.textMuted}
            />
            <Text
              style={[
                styles.screenTabPillText,
                activeTab === 'new' && styles.screenTabPillTextActive,
              ]}
            >
              New Request
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.screenTabPill,
              activeTab === 'history' && styles.screenTabPillActive,
            ]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <FileText
              size={15}
              color={activeTab === 'history' ? '#fff' : colors.textMuted}
            />
            <Text
              style={[
                styles.screenTabPillText,
                activeTab === 'history' && styles.screenTabPillTextActive,
              ]}
            >
              Leave History ({counts.all})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'new' ? (
          /* ════════════════════════════════════════════════════════════════
             TAB 1: NEW LEAVE REQUEST FORM
             ════════════════════════════════════════════════════════════════ */
          <View style={[styles.mainCard, shadows.md]}>
            {/* Card Header */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.sendIconWrap}>
                  <Send size={16} color="#818cf8" />
                </View>
                <View>
                  <Text style={styles.cardHeaderTitle}>New Leave Request</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Submit dates and details for official approval
                  </Text>
                </View>
              </View>
            </View>

            {/* ─── 1. Leave Type Selector ─── */}
            <View style={styles.formFieldGroup}>
              <Text style={styles.formLabel}>
                Leave Type <Text style={styles.reqStar}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setShowTypePicker(true)}
                activeOpacity={0.8}
              >
                <View style={styles.dropdownTriggerLeft}>
                  <View
                    style={[
                      styles.typeIconBox,
                      { backgroundColor: selectedTypeMeta.color + '18' },
                    ]}
                  >
                    <SelectedTypeIcon size={16} color={selectedTypeMeta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropdownSelectedText}>
                      {selectedTypeMeta.label}
                    </Text>
                    <Text style={styles.dropdownSubtext} numberOfLines={1}>
                      {selectedTypeMeta.desc}
                    </Text>
                  </View>
                </View>
                <ChevronDown size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* ─── 2. Interactive Calendar & Date Selection ─── */}
            <View style={styles.formFieldGroup}>
              <Text style={styles.formLabel}>
                Leave Date / Range Selection <Text style={styles.reqStar}>*</Text>
              </Text>

              {/* Nested Calendar Picker Container (Matches Web / Teacher Design) */}
              <View style={styles.calendarContainer}>
                {/* Mode Switcher Tabs */}
                <View style={styles.calendarModeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.calendarModeBtn,
                      calendarMode === 'single' && styles.calendarModeBtnActive,
                    ]}
                    onPress={() => handleModeSwitch('single')}
                    activeOpacity={0.8}
                  >
                    <Calendar
                      size={14}
                      color={calendarMode === 'single' ? '#fff' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.calendarModeText,
                        calendarMode === 'single' && styles.calendarModeTextActive,
                      ]}
                    >
                      Single Day Leave
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.calendarModeBtn,
                      calendarMode === 'range' && styles.calendarModeBtnActive,
                    ]}
                    onPress={() => handleModeSwitch('range')}
                    activeOpacity={0.8}
                  >
                    <CalendarRange
                      size={14}
                      color={calendarMode === 'range' ? '#fff' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.calendarModeText,
                        calendarMode === 'range' && styles.calendarModeTextActive,
                      ]}
                    >
                      Multi-Day Range
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Action Chips Row */}
                <View style={styles.quickChipsRow}>
                  <View style={styles.chipsGroupLeft}>
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={handleToday}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickChipText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={handleTomorrow}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickChipText}>Tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickChip, styles.resetChip]}
                      onPress={handleResetDates}
                      activeOpacity={0.7}
                    >
                      <RotateCcw size={11} color={colors.textSecondary} />
                      <Text style={styles.resetChipText}>Reset</Text>
                    </TouchableOpacity>
                  </View>

                  {calendarMode === 'range' && (
                    <View style={styles.stepHintWrap}>
                      <MousePointerClick size={12} color="#818cf8" />
                      <Text style={styles.stepHintText}>
                        {rangeStep === 0 ? 'Step 1: Tap Start' : 'Step 2: Tap End'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Date Input Boxes */}
                <View style={styles.dateInputsRow}>
                  <View style={styles.dateInputCell}>
                    <Text style={styles.dateInputCellLabel}>
                      {calendarMode === 'single' ? 'Leave Date' : 'Start Date'}
                    </Text>
                    <View style={styles.dateInputBox}>
                      <CalendarDays size={14} color="#818cf8" />
                      <Text
                        style={[
                          styles.dateInputVal,
                          !startDate && styles.dateInputPlaceholder,
                        ]}
                      >
                        {startDate ? formatDisplayDate(startDate) : 'Select on calendar'}
                      </Text>
                    </View>
                  </View>

                  {calendarMode === 'range' && (
                    <View style={styles.dateInputCell}>
                      <Text style={styles.dateInputCellLabel}>End Date</Text>
                      <View style={styles.dateInputBox}>
                        <CalendarDays size={14} color="#f59e0b" />
                        <Text
                          style={[
                            styles.dateInputVal,
                            !endDate && styles.dateInputPlaceholder,
                          ]}
                        >
                          {endDate ? formatDisplayDate(endDate) : 'Select end date'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* ─── Interactive Month Calendar Widget ─── */}
                <View style={styles.calendarWidgetBox}>
                  {/* Month Navigation */}
                  <View style={styles.monthNavRow}>
                    <TouchableOpacity
                      style={styles.monthNavBtn}
                      onPress={prevMonth}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <ChevronLeft size={18} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <Text style={styles.monthNavTitle}>
                      {MONTH_NAMES[month]} {year}
                    </Text>

                    <TouchableOpacity
                      style={styles.monthNavBtn}
                      onPress={nextMonth}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <ChevronRight size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  {/* Day Names Row */}
                  <View style={styles.weekDaysRow}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                      <Text key={i} style={styles.weekDayHeader}>
                        {d}
                      </Text>
                    ))}
                  </View>

                  {/* Days Matrix */}
                  <View style={styles.daysGrid}>
                    {calendarCells.map((dayObj, idx) => {
                      if (!dayObj) {
                        return <View key={idx} style={styles.dayCellEmpty} />;
                      }

                      const isStart = isSameDay(dayObj, startObj);
                      const isEnd = isSameDay(dayObj, endObj);
                      const inBetween = calendarMode === 'range' && isInRange(dayObj);
                      const isSelected = isStart || (calendarMode === 'range' && isEnd);

                      const today = new Date();
                      const isToday = isSameDay(dayObj, today);

                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.dayCell,
                            inBetween && styles.dayCellInRange,
                            isSelected && styles.dayCellSelected,
                            isToday && !isSelected && styles.dayCellToday,
                          ]}
                          onPress={() => handleDayClick(dayObj)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.dayCellText,
                              isSelected && styles.dayCellTextSelected,
                              inBetween && styles.dayCellTextInRange,
                              isToday && !isSelected && styles.dayCellTextToday,
                            ]}
                          >
                            {dayObj.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Duration Summary Pill */}
                <View
                  style={[
                    styles.durationPill,
                    startObj && styles.durationPillActive,
                  ]}
                >
                  <Calendar size={15} color={startObj ? colors.primary : colors.textMuted} />
                  <Text
                    style={[
                      styles.durationPillText,
                      startObj && styles.durationPillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {durationSummaryText}
                  </Text>
                  {startObj && <Check size={15} color="#10b981" />}
                </View>
              </View>
            </View>

            {/* ─── 3. Reason Textarea ─── */}
            <View style={styles.formFieldGroup}>
              <Text style={styles.formLabel}>
                Reason <Text style={styles.reqStar}>*</Text>
              </Text>
              <TextInput
                style={styles.textareaInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Explain reason for leave..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* ─── 4. Supporting Document Upload (Optional) ─── */}
            <View style={styles.formFieldGroup}>
              <Text style={styles.formLabel}>Supporting Document (Optional)</Text>

              {attachment ? (
                <View style={styles.attachedDocCard}>
                  <View style={styles.attachedDocLeft}>
                    <View style={styles.docIconWrap}>
                      <FileText size={18} color="#818cf8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attachedDocName} numberOfLines={1}>
                        {attachment.name || 'document.pdf'}
                      </Text>
                      <Text style={styles.attachedDocSize}>
                        {attachment.size
                          ? `${(attachment.size / 1024).toFixed(1)} KB`
                          : 'Document attached'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeDocBtn}
                    onPress={() => setAttachment(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadDashedBox}
                  onPress={handlePickDocument}
                  activeOpacity={0.8}
                >
                  <UploadCloud size={22} color={colors.primary} />
                  <Text style={styles.uploadPromptTitle}>
                    Attach Medical / Proof Document
                  </Text>
                  <Text style={styles.uploadPromptSubtitle}>
                    Supports PDF, JPG, or PNG files
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ─── Submit Button ─── */}
            <TouchableOpacity
              style={[styles.submitActionBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitActionText}>Submitting Application...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Send size={16} color="#fff" />
                  <Text style={styles.submitActionText}>Submit Application</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ════════════════════════════════════════════════════════════════
             TAB 2: LEAVE HISTORY & STATUS TRACKER
             ════════════════════════════════════════════════════════════════ */
          <View style={[styles.mainCard, shadows.md]}>
            {/* Card Header */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.sendIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                  <FileText size={16} color="#818cf8" />
                </View>
                <View>
                  <Text style={styles.cardHeaderTitle}>Leave History & Status</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Real-time status tracking of all leave requests
                  </Text>
                </View>
              </View>
            </View>

            {/* Status Filter Chips Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusChipsScroll}
            >
              {[
                { id: 'all', label: `All (${counts.all})` },
                { id: 'pending', label: `Pending (${counts.pending})` },
                { id: 'approved', label: `Approved (${counts.approved})` },
                { id: 'rejected', label: `Rejected (${counts.rejected})` },
                { id: 'revoked', label: `Revoked (${counts.revoked})` },
              ].map((chip) => {
                const isActive = historyFilter === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[
                      styles.statusFilterChip,
                      isActive && styles.statusFilterChipActive,
                    ]}
                    onPress={() => setHistoryFilter(chip.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.statusFilterChipText,
                        isActive && styles.statusFilterChipTextActive,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Content Body */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : filteredLeaves.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Calendar size={44} color={colors.textMuted} style={{ opacity: 0.3 }} />
                <Text style={styles.emptyTitle}>
                  {historyFilter === 'all'
                    ? 'No leave applications submitted yet'
                    : `No ${historyFilter} leave applications found`}
                </Text>
                <Text style={styles.emptySubtitle}>
                  Submit a new request to track coordinator approval here.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setActiveTab('new')}
                  activeOpacity={0.8}
                >
                  <Send size={14} color="#fff" />
                  <Text style={styles.emptyActionBtnText}>Create Leave Request</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.leavesListWrap}>
                {filteredLeaves.map((l) => {
                  const s = (l.status || 'pending').toLowerCase();
                  const isApproved = s === 'approved';
                  const isRejected = s === 'rejected';
                  const isRevoked = s === 'revoked';

                  const badgeBg = isApproved
                    ? 'rgba(16, 185, 129, 0.12)'
                    : isRejected
                    ? 'rgba(239, 68, 68, 0.12)'
                    : isRevoked
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(99, 102, 241, 0.12)';

                  const badgeBorder = isApproved
                    ? 'rgba(16, 185, 129, 0.3)'
                    : isRejected
                    ? 'rgba(239, 68, 68, 0.3)'
                    : isRevoked
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'rgba(99, 102, 241, 0.3)';

                  const badgeColor = isApproved
                    ? '#10b981'
                    : isRejected
                    ? '#ef4444'
                    : isRevoked
                    ? '#f59e0b'
                    : '#818cf8';

                  const startFormatted = formatDisplayDate(l.startDate || l.start_date);
                  const endFormatted = formatDisplayDate(l.endDate || l.end_date);
                  const docUrl = l.documentUrl || l.document_url || l.document;

                  return (
                    <View key={l.id || l._id} style={styles.leaveHistoryCard}>
                      {/* Top Header: Leave Type + Status Badge */}
                      <View style={styles.historyCardHeader}>
                        <View style={styles.historyTypeGroup}>
                          <Text style={styles.historyTypeName}>
                            {l.leaveType || l.leave_type || 'Casual'} Leave
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadgePill,
                            { backgroundColor: badgeBg, borderColor: badgeBorder },
                          ]}
                        >
                          {isApproved ? (
                            <CheckCircle2 size={12} color={badgeColor} />
                          ) : isRejected ? (
                            <XCircle size={12} color={badgeColor} />
                          ) : isRevoked ? (
                            <AlertCircle size={12} color={badgeColor} />
                          ) : (
                            <Clock size={12} color={badgeColor} />
                          )}
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: badgeColor, textTransform: 'capitalize' },
                            ]}
                          >
                            {s === 'pending' ? 'Pending Review' : s}
                          </Text>
                        </View>
                      </View>

                      {/* Date Range Row */}
                      <View style={styles.historyDateRow}>
                        <Calendar size={13} color="#818cf8" />
                        <Text style={styles.historyDateText}>
                          {startFormatted} {startFormatted !== endFormatted ? `— ${endFormatted}` : ''}
                        </Text>
                      </View>

                      {/* Reason Description */}
                      <Text style={styles.historyReasonText}>
                        {l.reason || 'No description provided'}
                      </Text>

                      {/* Rejection / Revocation Reason Box */}
                      {(isRejected || isRevoked) &&
                        (l.rejectionReason || l.rejection_reason) && (
                          <View
                            style={[
                              styles.rejectionReasonBox,
                              {
                                backgroundColor: isRejected
                                  ? 'rgba(239, 68, 68, 0.08)'
                                  : 'rgba(245, 158, 11, 0.08)',
                                borderColor: isRejected
                                  ? 'rgba(239, 68, 68, 0.25)'
                                  : 'rgba(245, 158, 11, 0.25)',
                              },
                            ]}
                          >
                            <AlertCircle
                              size={15}
                              color={isRejected ? '#ef4444' : '#f59e0b'}
                              style={{ marginTop: 1 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.rejectionReasonLabel,
                                  { color: isRejected ? '#ef4444' : '#f59e0b' },
                                ]}
                              >
                                {isRejected ? 'REJECTION REASON' : 'REVOCATION REASON'}
                              </Text>
                              <Text style={styles.rejectionReasonDetail}>
                                {l.rejectionReason || l.rejection_reason}
                              </Text>
                            </View>
                          </View>
                        )}

                      {/* Attached Document Action Button */}
                      {docUrl && (
                        <TouchableOpacity
                          style={styles.viewDocButton}
                          onPress={() => {
                            const fullUrl = docUrl.startsWith('http')
                              ? docUrl
                              : `${api.defaults.baseURL.replace('/api', '')}${docUrl.startsWith('/') ? '' : '/'}${docUrl}`;
                            setPreviewDocUrl(fullUrl);
                            setPreviewDocTitle(
                              `${l.leaveType || 'Leave'} Document (${startFormatted})`
                            );
                          }}
                          activeOpacity={0.8}
                        >
                          <FileText size={13} color="#818cf8" />
                          <Text style={styles.viewDocButtonText}>
                            View Attached Proof Document
                          </Text>
                          <ExternalLink size={12} color="#818cf8" />
                        </TouchableOpacity>
                      )}

                      {/* Created At Timestamp */}
                      {(l.createdAt || l.created_at) && (
                        <Text style={styles.historyTimestamp}>
                          Applied on{' '}
                          {new Date(l.createdAt || l.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Leave Type Bottom Sheet Picker Modal ─── */}
      <Modal
        visible={showTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.typePickerSheet, shadows.lg]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Select Leave Type</Text>
              <TouchableOpacity
                onPress={() => setShowTypePicker(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {LEAVE_TYPES.map((t) => {
                const isSelected = leaveType === t.id;
                const IconComponent = t.icon;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeOptionCard,
                      isSelected && styles.typeOptionCardSelected,
                    ]}
                    onPress={() => {
                      setLeaveType(t.id);
                      setShowTypePicker(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.typeOptionIconWrap,
                        { backgroundColor: t.color + '18' },
                      ]}
                    >
                      <IconComponent size={18} color={t.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.typeOptionName,
                          isSelected && { color: colors.primary },
                        ]}
                      >
                        {t.label}
                      </Text>
                      <Text style={styles.typeOptionDesc}>{t.desc}</Text>
                    </View>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Institutional Guidelines Modal ─── */}
      <Modal
        visible={showGuidelines}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuidelines(false)}
      >
        <View style={styles.overlayCenter}>
          <View style={[styles.guidelineCard, shadows.lg]}>
            <View style={styles.guideHeader}>
              <View style={styles.guideHeaderLeft}>
                <ShieldAlert size={20} color={colors.warning} />
                <Text style={styles.guideTitle}>Institutional Leave Policy</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGuidelines(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.guideBody}>
              <View style={styles.guideItem}>
                <CheckCircle2 size={16} color={colors.primary} />
                <Text style={styles.guideText}>
                  Leaves exceeding <Text style={{ fontWeight: '700', color: colors.textPrimary }}>3 consecutive days</Text> require coordinator and HoD validation.
                </Text>
              </View>

              <View style={styles.guideItem}>
                <CheckCircle2 size={16} color={colors.primary} />
                <Text style={styles.guideText}>
                  Medical leaves must include a verified physician certificate or hospital prescription attachment.
                </Text>
              </View>

              <View style={styles.guideItem}>
                <CheckCircle2 size={16} color={colors.primary} />
                <Text style={styles.guideText}>
                  Approved leaves may prevent attendance penalties for final exam hall ticket eligibility (minimum 75% aggregate requirement).
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.guideDismissBtn} onPress={() => setShowGuidelines(false)}>
              <Text style={styles.guideDismissText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Document Viewer Modal ─── */}
      <DocumentViewerModal
        visible={!!previewDocUrl}
        onClose={() => setPreviewDocUrl(null)}
        documentUrl={previewDocUrl}
        title={previewDocTitle}
      />
    </SafeAreaView>
  );
};

/* ─── Stylesheet ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  headerInfoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.md,
  },

  /* Screen Segmented Tab Switcher */
  screenTabContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  screenTabPills: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  screenTabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  screenTabPillActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  screenTabPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  screenTabPillTextActive: {
    color: '#fff',
  },

  /* Main Card Layout */
  mainCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sendIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  /* Form Fields */
  formFieldGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  reqStar: {
    color: colors.danger,
  },

  /* Dropdown Trigger */
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  typeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownSelectedText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dropdownSubtext: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },

  /* ─── Calendar Container ─── */
  calendarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    gap: 12,
  },

  /* Mode Switcher Tabs */
  calendarModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  calendarModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  calendarModeBtnActive: {
    backgroundColor: colors.primary,
  },
  calendarModeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  calendarModeTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  /* Quick Action Chips */
  quickChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipsGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818cf8',
  },
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepHintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepHintText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#818cf8',
  },

  /* Date Display Inputs */
  dateInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateInputCell: {
    flex: 1,
    gap: 4,
  },
  dateInputCellLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateInputVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateInputPlaceholder: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 11,
  },

  /* Calendar Widget Box */
  calendarWidgetBox: {
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthNavBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekDayHeader: {
    width: 32,
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 34,
  },
  dayCell: {
    width: '14.28%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellInRange: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 0,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#818cf8',
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayCellTextSelected: {
    color: '#fff',
    fontWeight: '800',
  },
  dayCellTextInRange: {
    color: '#818cf8',
    fontWeight: '700',
  },
  dayCellTextToday: {
    color: '#818cf8',
    fontWeight: '800',
  },

  /* Duration Summary Pill */
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  durationPillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  durationPillText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  durationPillTextActive: {
    color: '#818cf8',
    fontWeight: '700',
  },

  /* Textarea */
  textareaInput: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 80,
  },

  /* File Attachment */
  uploadDashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgInput,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadPromptTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  uploadPromptSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  attachedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: radius.md,
    padding: 10,
  },
  attachedDocLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  docIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedDocName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attachedDocSize: {
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  removeDocBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Submit Action Button */
  submitActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  submitActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },

  /* ─── Leave History Styles ─── */
  statusChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusFilterChipTextActive: {
    color: '#fff',
  },

  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: 8,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  leavesListWrap: {
    gap: 12,
  },
  leaveHistoryCard: {
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyTypeGroup: {
    flex: 1,
  },
  historyTypeName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDateText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  historyReasonText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  rejectionReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  rejectionReasonLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rejectionReasonDetail: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 15,
  },
  viewDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  viewDocButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818cf8',
  },
  historyTimestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* ─── Type Picker Bottom Sheet ─── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  typePickerSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  typeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  typeOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  typeOptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  typeOptionDesc: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },

  /* ─── Guidelines Modal ─── */
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  guidelineCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  guideHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  guideBody: {
    maxHeight: 280,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: spacing.md,
  },
  guideText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  guideDismissBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideDismissText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

export default StudentLeaveScreen;
