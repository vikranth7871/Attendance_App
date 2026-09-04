import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
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
} from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { exportCsv } from '../../utils/fileExporter';
import Papa from 'papaparse';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_CONFIG = {
  present: { label: 'Present', color: colors.success, bg: colors.success + '22' },
  absent: { label: 'Absent', color: colors.danger, bg: colors.danger + '22' },
  'half-day': { label: 'Half-Day', color: colors.warning, bg: colors.warning + '22' },
  leave: { label: 'On Leave', color: '#8B5CF6', bg: '#8B5CF622' },
};

const TeacherAttendanceScreen = ({ navigation }) => {
  const [teachers, setTeachers] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingAutoSave, setTogglingAutoSave] = useState(false);

  // Date Range Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/admin/teacher-attendance');
      const teacherList = data?.teachers || [];
      setTeachers(teacherList);
      setDate(data?.date || new Date().toISOString().split('T')[0]);
      setAutoSaveEnabled(data?.autoSaveEnabled ?? true);

      // Populate local maps
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
      Alert.alert('Error', err.response?.data?.message || 'Failed to load faculty attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const handleStatusChange = (teacherId, newStatus) => {
    setAttendanceMap(prev => ({ ...prev, [teacherId]: newStatus }));
  };

  const handleRemarkChange = (teacherId, text) => {
    setRemarksMap(prev => ({ ...prev, [teacherId]: text }));
  };

  const handleMarkAll = (status) => {
    setAttendanceMap(prev => {
      const next = { ...prev };
      filteredTeachers.forEach(t => {
        // Skip teachers who are on approved leave unless manually overridden
        if (!t.onLeave || status === 'leave') {
          next[t.id] = status;
        }
      });
      return next;
    });
  };

  const handleToggleAutoSave = async (value) => {
    setTogglingAutoSave(true);
    try {
      const { data } = await api.post('/admin/teacher-attendance/toggle-auto-save', { enabled: value });
      setAutoSaveEnabled(data?.autoSaveEnabled ?? value);
      Alert.alert('Settings Updated', data?.message || 'Auto-save setting changed.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update auto-save setting.');
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

      Alert.alert('✅ Saved', data?.message || 'Faculty attendance saved successfully.');
      fetchData();
    } catch (err) {
      Alert.alert('Save Failed', err.response?.data?.message || 'Failed to save faculty attendance.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportReport = async () => {
    if (!exportStartDate || !exportEndDate) {
      Alert.alert('Missing Dates', 'Please specify both start and end dates.');
      return;
    }
    setExporting(true);
    try {
      const { data } = await api.get('/admin/teacher-attendance/export', {
        params: { startDate: exportStartDate, endDate: exportEndDate }
      });
      if (!Array.isArray(data) || data.length === 0) {
        Alert.alert('No Data', 'No faculty attendance records found for this date range.');
        return;
      }

      const formatted = data.map(r => ({
        Date: r.date,
        'Faculty Name': r.teacher_name,
        Email: r.email,
        Department: r.department_name,
        Status: r.status,
        Remarks: r.remarks || '',
      }));

      const csv = Papa.unparse(formatted);
      const filename = `faculty_attendance_${exportStartDate}_to_${exportEndDate}.csv`;
      const ok = await exportCsv(filename, csv);
      if (ok) {
        setShowExportModal(false);
        Alert.alert('✅ Exported', `Attendance report generated: ${filename}`);
      }
    } catch (err) {
      console.error('Export error:', err);
      Alert.alert('Export Failed', err.response?.data?.message || 'Failed to export faculty attendance.');
    } finally {
      setExporting(false);
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const q = search.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.departmentName || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q)
    );
  });

  const presentCount = Object.values(attendanceMap).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceMap).filter(s => s === 'absent').length;
  const halfDayCount = Object.values(attendanceMap).filter(s => s === 'half-day').length;
  const leaveCount = Object.values(attendanceMap).filter(s => s === 'leave').length;

  if (loading) return <FullPageLoader message="Loading faculty roster..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Faculty Attendance"
        subtitle={`Today: ${date}`}
        navigation={navigation}
      />

      {/* Summary KPI Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: colors.success + '44' }]}>
          <CalendarCheck size={16} color={colors.success} />
          <Text style={[styles.summaryValue, { color: colors.success }]}>{presentCount}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: colors.danger + '44' }]}>
          <CalendarX size={16} color={colors.danger} />
          <Text style={[styles.summaryValue, { color: colors.danger }]}>{absentCount}</Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: colors.warning + '44' }]}>
          <Clock size={16} color={colors.warning} />
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{halfDayCount}</Text>
          <Text style={styles.summaryLabel}>Half-Day</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#8B5CF644' }]}>
          <ShieldAlert size={16} color="#8B5CF6" />
          <Text style={[styles.summaryValue, { color: '#8B5CF6' }]}>{leaveCount}</Text>
          <Text style={styles.summaryLabel}>On Leave</Text>
        </View>
      </View>

      {/* Auto-save Switch Banner */}
      <View style={styles.autoSaveBar}>
        <View style={styles.autoSaveInfo}>
          <Sparkles size={16} color={colors.primary} />
          <View>
            <Text style={styles.autoSaveTitle}>EOD Auto-Save</Text>
            <Text style={styles.autoSaveSub}>
              {autoSaveEnabled ? 'Unmarked staff logged as Absent at EOD' : 'Manual Save Only'}
            </Text>
          </View>
        </View>
        <Switch
          value={autoSaveEnabled}
          onValueChange={handleToggleAutoSave}
          disabled={togglingAutoSave}
          trackColor={{ false: colors.bgElevated, true: colors.primary + '66' }}
          thumbColor={autoSaveEnabled ? colors.primary : colors.textMuted}
        />
      </View>

      {/* Quick Action & Search Row */}
      <View style={styles.controlsRow}>
        <View style={styles.searchBox}>
          <Search size={15} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search faculty or dept..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.quickButtons}>
          <TouchableOpacity
            style={[styles.quickBtn, { borderColor: colors.primary + '55', backgroundColor: colors.primary + '15' }]}
            onPress={() => setShowExportModal(true)}
          >
            <Download size={14} color={colors.primary} />
            <Text style={[styles.quickBtnText, { color: colors.primary }]}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { borderColor: colors.success + '55', backgroundColor: colors.success + '15' }]}
            onPress={() => handleMarkAll('present')}
          >
            <CheckCheck size={14} color={colors.success} />
            <Text style={[styles.quickBtnText, { color: colors.success }]}>All P</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { borderColor: colors.danger + '55', backgroundColor: colors.danger + '15' }]}
            onPress={() => handleMarkAll('absent')}
          >
            <XCircle size={14} color={colors.danger} />
            <Text style={[styles.quickBtnText, { color: colors.danger }]}>All A</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Roster List */}
      <FlatList
        data={filteredTeachers}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => {
          const currentStatus = attendanceMap[item.id] || 'absent';
          const currentRemarks = remarksMap[item.id] || '';

          return (
            <View style={[styles.recordCard, shadows.sm]}>
              <View style={styles.recordHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{(item.name || 'T').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.teacherName}>{item.name}</Text>
                  <Text style={styles.deptText}>{item.departmentName || 'Academics'}</Text>
                </View>
                {item.onLeave && (
                  <View style={styles.leavePill}>
                    <Text style={styles.leavePillText}>Approved Leave</Text>
                  </View>
                )}
              </View>

              {/* Status Select Buttons */}
              <View style={styles.statusRow}>
                {['present', 'absent', 'half-day', 'leave'].map((st) => {
                  const cfg = STATUS_CONFIG[st];
                  const isSelected = currentStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusBtn,
                        isSelected && { backgroundColor: cfg.color, borderColor: cfg.color }
                      ]}
                      onPress={() => handleStatusChange(item.id, st)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.statusBtnLabel,
                          isSelected ? { color: '#fff', fontWeight: '700' } : { color: colors.textSecondary }
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Remarks / Reason */}
              <TextInput
                style={styles.remarksInput}
                placeholder={item.onLeave ? `Leave Reason: ${item.leaveReason || 'Approved'}` : "Remarks (e.g. Late by 15m, field trip)..."}
                placeholderTextColor={colors.textMuted}
                value={currentRemarks}
                onChangeText={(txt) => handleRemarkChange(item.id, txt)}
              />
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No faculty members found</Text>
          </View>
        }
      />

      {/* Save Floating Bar */}
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

      {/* Date Range Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Download size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Export Faculty Attendance</Text>
              </View>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Select the date range for the faculty attendance audit report (CSV).
            </Text>

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
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
  },
  summaryValue: { ...typography.lg, ...typography.bold },
  summaryLabel: { fontSize: 10, color: colors.textMuted },
  autoSaveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoSaveInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  autoSaveTitle: { ...typography.xs, ...typography.bold, color: colors.textPrimary },
  autoSaveSub: { fontSize: 11, color: colors.textMuted },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.sm,
    padding: 0,
  },
  quickButtons: { flexDirection: 'row', gap: 6 },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  quickBtnText: { ...typography.xs, ...typography.bold },
  list: { paddingHorizontal: spacing.md, paddingBottom: 90 },
  recordCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  avatarText: { ...typography.base, ...typography.bold, color: colors.primary },
  teacherName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  deptText: { ...typography.xs, color: colors.textMuted },
  leavePill: {
    backgroundColor: '#8B5CF625',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#8B5CF644',
  },
  leavePillText: { fontSize: 10, fontWeight: '700', color: '#8B5CF6' },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xs,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
  },
  statusBtnLabel: { fontSize: 11, fontWeight: '600' },
  remarksInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...typography.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: 4,
  },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { ...typography.base, color: colors.textMuted },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  saveBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  modalSub: {
    ...typography.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 42,
  },
  modalTextInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.sm,
    padding: 0,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.sm,
    color: colors.textSecondary,
  },
  modalExportBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  modalExportText: {
    ...typography.sm,
    ...typography.bold,
    color: '#fff',
  },
});

export default TeacherAttendanceScreen;
