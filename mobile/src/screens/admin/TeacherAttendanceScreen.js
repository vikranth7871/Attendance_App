import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarCheck,
  CalendarX,
  Clock,
  Search,
  Save,
  CheckCheck,
  XCircle,
  ShieldAlert,
  Sparkles,
  Download,
  Calendar,
  X,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  FileSpreadsheet,
  CalendarOff,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { exportCsv } from '../../utils/fileExporter';
import Papa from 'papaparse';
import { colors, spacing, radius, shadows } from '../../styles/theme';

const STATUS_CONFIG = {
  present: { label: 'Present', short: 'P', color: colors.success },
  absent: { label: 'Absent', short: 'A', color: colors.danger },
  'half-day': { label: 'Half-Day', short: 'HD', color: colors.warning },
  leave: { label: 'Leave', short: 'L', color: '#8B5CF6' },
};

/* ─── In-App Feedback Banner ─── */
const Banner = ({ type, message, onDismiss }) => {
  if (!message) return null;
  const isErr = type === 'error';
  return (
    <View style={[bs.wrap, isErr ? bs.err : bs.ok]}>
      {isErr ? <AlertCircle size={15} color="#EF4444" /> : <CheckCircle size={15} color="#10B981" />}
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

const TeacherAttendanceScreen = ({ navigation }) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [teachers, setTeachers] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [date, setDate] = useState(todayStr);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingAutoSave, setTogglingAutoSave] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });

  // Quick Remark Modal State
  const [editingRemarkTeacher, setEditingRemarkTeacher] = useState(null);
  const [remarkDraft, setRemarkDraft] = useState('');

  // Bulk Confirmation Modal State
  const [bulkModal, setBulkModal] = useState({ visible: false, targetStatus: 'present' });

  // Date Range Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [exportEndDate, setExportEndDate] = useState(todayStr);
  const [exporting, setExporting] = useState(false);

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4000);
  };

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const { data } = await api.get('/admin/teacher-attendance?date=' + todayStr);
      const teacherList = data?.teachers || [];
      setTeachers(teacherList);
      setDate(data?.date || todayStr);
      setAutoSaveEnabled(data?.autoSaveEnabled ?? true);

      const atts = {};
      const rems = {};
      teacherList.forEach(t => {
        atts[t.id] = t.status || 'absent';
        rems[t.id] = t.remarks || '';
      });
      setAttendanceMap(atts);
      setRemarksMap(rems);
    } catch (err) {
      console.error('Teacher attendance fetch error:', err);
      showBanner('error', err.response?.data?.message || 'Failed to load faculty roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayStr]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

  const handleStatusChange = (teacherId, newStatus) => {
    setAttendanceMap(prev => ({ ...prev, [teacherId]: newStatus }));
  };

  const handleRemarkChange = (teacherId, text) => {
    setRemarksMap(prev => ({ ...prev, [teacherId]: text }));
  };

  const openRemarkModal = (teacher) => {
    setEditingRemarkTeacher(teacher);
    setRemarkDraft(remarksMap[teacher.id] || '');
  };

  const saveRemarkDraft = () => {
    if (editingRemarkTeacher) {
      handleRemarkChange(editingRemarkTeacher.id, remarkDraft);
    }
    setEditingRemarkTeacher(null);
    setRemarkDraft('');
  };

  const executeMarkAll = (status) => {
    setAttendanceMap(prev => {
      const next = { ...prev };
      teachers.forEach(t => {
        if (!t.onLeave || status === 'leave') {
          next[t.id] = status;
        }
      });
      return next;
    });
    setBulkModal({ visible: false, targetStatus: 'present' });
    showBanner('success', 'Marked all eligible faculty as ' + (status === 'present' ? 'Present' : 'Absent') + '.');
  };

  const handleToggleAutoSave = async (value) => {
    setTogglingAutoSave(true);
    try {
      const { data } = await api.post('/admin/teacher-attendance/toggle-auto-save', { enabled: value });
      setAutoSaveEnabled(data?.autoSaveEnabled ?? value);
      showBanner('success', data?.message || (value ? 'EOD Auto-Save enabled.' : 'EOD Auto-Save turned off.'));
    } catch (err) {
      showBanner('error', err.response?.data?.message || 'Failed to update auto-save setting.');
    } finally {
      setTogglingAutoSave(false);
    }
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const records = teachers.map(t => ({
        teacherId: t.id,
        status: attendanceMap[t.id] || 'absent',
        remarks: remarksMap[t.id] || '',
      }));

      const { data } = await api.post('/admin/teacher-attendance', {
        date,
        records,
      });

      showBanner('success', data?.message || 'Faculty attendance saved successfully.');
      fetchData(true);
    } catch (err) {
      showBanner('error', err.response?.data?.message || 'Failed to save faculty attendance.');
    } finally {
      setSaving(false);
    }
  };

  const setPresetRange = (type) => {
    const today = new Date();
    if (type === 'today') {
      setExportStartDate(todayStr);
      setExportEndDate(todayStr);
    } else if (type === '7days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    } else if (type === '30days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    } else if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setExportStartDate(firstDay.toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    }
  };

  const handleExportReport = async () => {
    setExporting(true);
    try {
      let exportData = [];
      try {
        const { data } = await api.get('/admin/teacher-attendance/export?startDate=' + exportStartDate + '&endDate=' + exportEndDate);
        if (Array.isArray(data) && data.length > 0) exportData = data;
      } catch (err) {
        console.warn('Backend export fallback:', err);
      }

      const hasTodayInExport = exportData.some(item => {
        const itemD = typeof item.date === 'string' ? item.date.split('T')[0] : '';
        return itemD === todayStr;
      });

      if (!hasTodayInExport && exportStartDate <= todayStr && exportEndDate >= todayStr) {
        const todayRows = teachers.map(t => ({
          date: todayStr,
          teacher_name: t.name,
          email: t.email,
          department_name: t.departmentName || 'N/A',
          status: attendanceMap[t.id] || t.status || 'absent',
          remarks: remarksMap[t.id] || (t.onLeave ? ('Leave: ' + t.leaveReason) : '')
        }));
        exportData = [...todayRows, ...exportData];
      }

      if (exportData.length === 0) {
        showBanner('error', 'No attendance records found for selected range.');
        return;
      }

      const csvRows = exportData.map(r => ({
        Date: typeof r.date === 'string' ? r.date.split('T')[0] : todayStr,
        'Faculty Name': r.teacher_name || r.name || 'N/A',
        Department: r.department_name || r.departmentName || 'N/A',
        Email: r.email || 'N/A',
        Status: (r.status || 'absent').toUpperCase(),
        Remarks: r.remarks || ''
      }));

      const csvString = Papa.unparse(csvRows);
      const filename = 'Faculty_Attendance_' + exportStartDate + '_to_' + exportEndDate + '.csv';
      await exportCsv(csvString, filename);
      setShowExportModal(false);
      showBanner('success', 'Report downloaded successfully (' + csvRows.length + ' records).');
    } catch (err) {
      console.error('Export error:', err);
      showBanner('error', 'Failed to generate attendance report.');
    } finally {
      setExporting(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;

    teachers.forEach(t => {
      const st = attendanceMap[t.id] || 'absent';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'half-day') halfDay++;
      else if (st === 'leave') leave++;
    });

    const total = teachers.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, halfDay, leave, rate };
  }, [teachers, attendanceMap]);

  // Filtering
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.departmentName && t.departmentName.toLowerCase().includes(q));

      const currentStatus = attendanceMap[t.id] || 'absent';
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teachers, search, statusFilter, attendanceMap]);

  if (loading) return <FullPageLoader message="Loading faculty attendance roster..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        title="Faculty Attendance"
        subtitle="Daily Attendance Register"
        showBack
        navigation={navigation}
      />

      <Banner
        type={banner.type}
        message={banner.message}
        onDismiss={() => setBanner({ type: '', message: '' })}
      />

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Top Control Strip (Date & Mode) ─── */}
        <View style={styles.topControlStrip}>
          {/* Date Selector */}
          <View style={styles.dateSelector}>
            <Calendar size={15} color={colors.primary} />
            <Text style={styles.dateText}>
              {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
            {date === todayStr && (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>Today</Text>
              </View>
            )}
          </View>

          {/* Auto-Save Toggle */}
          <View style={styles.autoSavePill}>
            <Clock size={13} color={autoSaveEnabled ? colors.primary : colors.textMuted} />
            <Text style={[styles.autoSaveLabel, { color: autoSaveEnabled ? colors.textPrimary : colors.textMuted }]}>
              {autoSaveEnabled ? 'EOD Auto-Save' : 'Manual Save'}
            </Text>
            <Switch
              value={autoSaveEnabled}
              onValueChange={handleToggleAutoSave}
              disabled={togglingAutoSave}
              trackColor={{ false: 'rgba(156, 163, 175, 0.3)', true: colors.primary + '50' }}
              thumbColor={autoSaveEnabled ? colors.primary : '#9ca3af'}
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
            />
          </View>
        </View>

        {/* ─── Tabular Metric Ribbon ─── */}
        <View style={[styles.statsRibbon, shadows.sm]}>
          <TouchableOpacity
            style={[styles.statRibbonItem, statusFilter === 'all' && styles.statRibbonItemActive]}
            onPress={() => setStatusFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={styles.statRibbonLabel}>TOTAL</Text>
            <Text style={[styles.statRibbonVal, { color: colors.textPrimary }]}>{stats.total}</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={[styles.statRibbonItem, statusFilter === 'present' && styles.statRibbonItemActive]}
            onPress={() => setStatusFilter('present')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statRibbonLabel, { color: colors.success }]}>PRESENT</Text>
            <Text style={[styles.statRibbonVal, { color: colors.success }]}>{stats.present}</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={[styles.statRibbonItem, statusFilter === 'absent' && styles.statRibbonItemActive]}
            onPress={() => setStatusFilter('absent')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statRibbonLabel, { color: colors.danger }]}>ABSENT</Text>
            <Text style={[styles.statRibbonVal, { color: colors.danger }]}>{stats.absent}</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={[styles.statRibbonItem, statusFilter === 'leave' && styles.statRibbonItemActive]}
            onPress={() => setStatusFilter('leave')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statRibbonLabel, { color: '#8B5CF6' }]}>LEAVE</Text>
            <Text style={[styles.statRibbonVal, { color: '#8B5CF6' }]}>{stats.leave}</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={[styles.statRibbonItem, statusFilter === 'half-day' && styles.statRibbonItemActive]}
            onPress={() => setStatusFilter('half-day')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statRibbonLabel, { color: colors.warning }]}>HALF-DAY</Text>
            <Text style={[styles.statRibbonVal, { color: colors.warning }]}>{stats.halfDay}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Compact Search & Action Suite ─── */}
        <View style={styles.toolbarSuite}>
          {/* Search Row */}
          <View style={styles.searchBar}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search faculty by name, department, email..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsBar}
          >
            <TouchableOpacity
              style={styles.actionBtnSuccess}
              onPress={() => setBulkModal({ visible: true, targetStatus: 'present' })}
              activeOpacity={0.7}
            >
              <CheckCheck size={14} color={colors.success} />
              <Text style={styles.actionBtnSuccessText}>Mark All Present</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnDanger}
              onPress={() => setBulkModal({ visible: true, targetStatus: 'absent' })}
              activeOpacity={0.7}
            >
              <XCircle size={14} color={colors.danger} />
              <Text style={styles.actionBtnDangerText}>Mark All Absent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => setShowExportModal(true)}
              activeOpacity={0.7}
            >
              <Download size={14} color={colors.primary} />
              <Text style={styles.actionBtnPrimaryText}>Export Report</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ─── DATA TABLE ─── */}
        <View style={[styles.tableCard, shadows.sm]}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.colIndex}>
              <Text style={styles.tableHeaderColText}>#</Text>
            </View>
            <View style={styles.colFaculty}>
              <Text style={styles.tableHeaderColText}>FACULTY & DEPT</Text>
            </View>
            <View style={styles.colStatus}>
              <Text style={styles.tableHeaderColText}>ATTENDANCE</Text>
            </View>
            <View style={styles.colNote}>
              <Text style={styles.tableHeaderColText}>NOTE</Text>
            </View>
          </View>

          {/* Table Body */}
          {filteredTeachers.length === 0 ? (
            <View style={styles.emptyTable}>
              <Text style={styles.emptyTableText}>No matching faculty members found.</Text>
            </View>
          ) : (
            filteredTeachers.map((item, idx) => {
              const currentStatus = attendanceMap[item.id] || 'absent';
              const currentRemarks = remarksMap[item.id] || '';
              const isAlt = idx % 2 === 1;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.tableRow,
                    isAlt && styles.tableRowAlt,
                    idx === filteredTeachers.length - 1 && styles.tableRowLast,
                  ]}
                >
                  {/* Col 1: Index */}
                  <View style={styles.colIndex}>
                    <Text style={styles.indexText}>{idx + 1}</Text>
                  </View>

                  {/* Col 2: Faculty info */}
                  <View style={styles.colFaculty}>
                    <Text style={styles.facultyName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.deptEmail} numberOfLines={1}>
                      {item.departmentName || 'General'} • {item.email}
                    </Text>
                    {item.onLeave && (
                      <View style={styles.inlineLeaveBadge}>
                        <CalendarOff size={10} color="#8B5CF6" />
                        <Text style={styles.inlineLeaveText} numberOfLines={1}>
                          {item.leaveReason ? ('Leave: ' + item.leaveReason) : 'Approved Leave'}
                        </Text>
                      </View>
                    )}
                    {!!currentRemarks && (
                      <TouchableOpacity
                        onPress={() => openRemarkModal(item)}
                        style={styles.inlineRemarkChip}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.inlineRemarkText} numberOfLines={1}>
                          📝 {currentRemarks}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Col 3: Attendance Segmented Pills */}
                  <View style={styles.colStatus}>
                    <View style={styles.statusPillsWrap}>
                      {(['present', 'absent', 'half-day', 'leave']).map((st) => {
                        const cfg = STATUS_CONFIG[st];
                        const isSelected = currentStatus === st;
                        return (
                          <TouchableOpacity
                            key={st}
                            style={[
                              styles.pillBtn,
                              isSelected
                                ? { backgroundColor: cfg.color, borderColor: cfg.color }
                                : styles.pillBtnInactive,
                            ]}
                            onPress={() => handleStatusChange(item.id, st)}
                            activeOpacity={0.6}
                          >
                            <Text
                              style={[
                                styles.pillText,
                                isSelected ? styles.pillTextActive : styles.pillTextInactive,
                              ]}
                            >
                              {cfg.short}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Col 4: Note Button */}
                  <View style={styles.colNote}>
                    <TouchableOpacity
                      style={[
                        styles.noteBtn,
                        !!currentRemarks && styles.noteBtnActive,
                      ]}
                      onPress={() => openRemarkModal(item)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <MessageSquare
                        size={15}
                        color={currentRemarks ? colors.primary : colors.textMuted}
                      />
                      {!!currentRemarks && <View style={styles.noteDot} />}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Legend strip beneath table */}
        <View style={styles.legendStrip}>
          <Text style={styles.legendTitle}>Legend:</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>P = Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendText}>A = Absent</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>HD = Half-Day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.legendText}>L = Leave</Text>
          </View>
        </View>
      </ScrollView>

      {/* ─── Sticky Bottom Save Bar ─── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSaveAttendance}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Faculty Attendance</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Faculty Remark Modal ─── */}
      <Modal
        visible={!!editingRemarkTeacher}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingRemarkTeacher(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MessageSquare size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    Attendance Note
                  </Text>
                  <Text style={styles.modalSubTitle} numberOfLines={1}>
                    {editingRemarkTeacher?.name} ({editingRemarkTeacher?.departmentName || 'Academics'})
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setEditingRemarkTeacher(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Tag Presets */}
            <Text style={styles.presetHeading}>Quick Preset Tags</Text>
            <View style={styles.presetRow}>
              {['Late', 'Medical', 'Official Duty', 'Permission', 'Personal'].map(tag => {
                const isSelected = remarkDraft.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.presetChip,
                      isSelected && styles.presetChipActive
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setRemarkDraft(remarkDraft.replace(tag, '').replace(/^,\s*|,\s*$/g, '').trim());
                      } else {
                        setRemarkDraft(prev => prev ? (prev + ', ' + tag) : tag);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isSelected && styles.presetChipTextActive
                      ]}
                    >
                      {tag}
                    </Text>
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
                placeholder="e.g. Late by 15 mins due to transit, Field work..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingRemarkTeacher(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={saveRemarkDraft}
              >
                <Text style={styles.modalSaveText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Bulk Action Confirmation Modal ─── */}
      <Modal
        visible={bulkModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkModal({ visible: false, targetStatus: 'present' })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {bulkModal.targetStatus === 'present' ? (
                <CheckCheck size={22} color={colors.success} />
              ) : (
                <XCircle size={22} color={colors.danger} />
              )}
              <Text style={styles.modalTitle}>
                Mark All {bulkModal.targetStatus === 'present' ? 'Present' : 'Absent'}?
              </Text>
            </View>
            <Text style={styles.modalSub}>
              This will set all eligible faculty members to {bulkModal.targetStatus === 'present' ? 'Present' : 'Absent'}. Faculty on approved leave will remain protected.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBulkModal({ visible: false, targetStatus: 'present' })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  bulkModal.targetStatus === 'present'
                    ? { backgroundColor: colors.success }
                    : { backgroundColor: colors.danger }
                ]}
                onPress={() => executeMarkAll(bulkModal.targetStatus)}
              >
                <Text style={styles.modalExportText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Date Range Export Report Modal ─── */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={20} color={colors.success} />
                <Text style={styles.modalTitle}>Download Attendance Report</Text>
              </View>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Choose a quick preset or specify a date range to export audit report to CSV.
            </Text>

            <Text style={styles.presetHeading}>Quick Range Presets</Text>
            <View style={styles.presetRow}>
              <TouchableOpacity style={styles.presetChip} onPress={() => setPresetRange('today')}>
                <Text style={styles.presetChipText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetChip} onPress={() => setPresetRange('7days')}>
                <Text style={styles.presetChipText}>Last 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetChip} onPress={() => setPresetRange('30days')}>
                <Text style={styles.presetChipText}>Last 30 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetChip} onPress={() => setPresetRange('month')}>
                <Text style={styles.presetChipText}>This Month</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
              <View style={styles.dateInputWrapper}>
                <Calendar size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.modalTextInput}
                  value={exportStartDate}
                  onChangeText={setExportStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
              <View style={styles.dateInputWrapper}>
                <Calendar size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.modalTextInput}
                  value={exportEndDate}
                  onChangeText={setExportEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowExportModal(false)}
                disabled={exporting}
              >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  mainScroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  /* Top Control Strip */
  topControlStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todayPill: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  todayPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  autoSavePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgCard,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoSaveLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Tabular Metric Ribbon */
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statRibbonItemActive: {
    backgroundColor: colors.primary + '15',
  },
  statRibbonLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statRibbonVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  /* Search & Toolbar Suite */
  toolbarSuite: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 0,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  actionBtnSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success + '15',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  actionBtnSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.danger + '15',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  actionBtnDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* ─── DATA TABLE STYLES ─── */
  tableCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  tableHeaderColText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },

  /* Column Dimensions */
  colIndex: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  colFaculty: {
    flex: 1,
    minWidth: 100,
    paddingRight: 6,
    justifyContent: 'center',
  },
  facultyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deptEmail: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  inlineLeaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#8B5CF618',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#8B5CF630',
  },
  inlineLeaveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  inlineRemarkChip: {
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  inlineRemarkText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },

  colStatus: {
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  pillBtn: {
    width: 30,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillBtnInactive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pillTextActive: {
    color: '#fff',
  },
  pillTextInactive: {
    color: colors.textMuted,
  },

  colNote: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  noteBtnActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  noteDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },

  emptyTable: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  /* Legend */
  legendStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexWrap: 'wrap',
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  /* Sticky Bottom Save Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.lg,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  presetHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  presetChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    height: 40,
  },
  modalTextInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },
  modalTextArea: {
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 13,
    minHeight: 70,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.xs,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  modalExportText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

export default TeacherAttendanceScreen;
