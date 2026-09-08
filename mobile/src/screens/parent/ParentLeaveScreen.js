import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarOff, CheckCircle2, XCircle, Clock, Check, X,
  Calendar, FileText, UploadCloud, Plus, ChevronLeft, ChevronRight,
  Filter, AlertCircle
} from 'lucide-react-native';
import Header from '../../components/Header';
import ChildSwitcher from '../../components/ChildSwitcher';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const LEAVE_TYPES = [
  { label: 'Casual Leave', value: 'Casual' },
  { label: 'Sick / Medical Leave', value: 'Medical' },
  { label: 'Emergency Leave', value: 'Emergency' },
  { label: 'Personal Leave', value: 'Personal' },
  { label: 'On-Duty / Official', value: 'On-Duty' },
];

const ParentLeaveScreen = ({ route, navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(route?.params?.studentId || null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'apply'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'

  // Action remarks modal (Approve / Reject)
  const [actionModal, setActionModal] = useState(null); // { leaveId, action: 'approved' | 'rejected' }
  const [remarks, setRemarks] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Apply Leave Form State
  const [leaveType, setLeaveType] = useState('Medical');
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [documentName, setDocumentName] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Simple Month Matrix for Leave Date Picker
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      const kids = Array.isArray(data) ? data : [];
      setChildren(kids);
      if (!selectedChildId && kids.length > 0) {
        setSelectedChildId(String(route?.params?.studentId || kids[0].id || kids[0].studentId));
      }
    } catch (err) {
      console.error('Fetch children error in leaves:', err);
    }
  };

  const fetchLeaves = async (childId = selectedChildId) => {
    setLoading(true);
    try {
      const url = childId
        ? `/parent/student-leaves?studentId=${childId}`
        : '/parent/student-leaves';
      const { data } = await api.get(url);
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch parent leaves:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchLeaves(selectedChildId);
    } else {
      fetchLeaves();
    }
  }, [selectedChildId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
    fetchLeaves(selectedChildId);
  }, [selectedChildId]);

  const handleAction = async () => {
    if (!actionModal) return;
    const { leaveId, action } = actionModal;
    setProcessingId(leaveId);
    try {
      await api.put(`/parent/student-leaves/${leaveId}/action`, {
        action,
        remarks: remarks.trim(),
      });
      setActionModal(null);
      setRemarks('');
      Alert.alert('✅ Updated', `Leave request marked as ${action}.`);
      fetchLeaves(selectedChildId);
    } catch (err) {
      console.error('Action error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update leave status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApplyLeave = async () => {
    if (!startDate) {
      Alert.alert('Missing Date', 'Please select a leave date from the calendar.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Missing Reason', 'Please provide a reason for the leave application.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/parent/apply-leave', {
        studentId: selectedChildId,
        leaveType,
        startDate,
        endDate: isRangeMode ? (endDate || startDate) : startDate,
        reason: reason.trim(),
        documentUrl: documentName ? `https://storage.iattend.local/${documentName}` : null,
      });

      Alert.alert('✅ Submitted', 'Leave application submitted successfully for your child.');
      setStartDate('');
      setEndDate('');
      setReason('');
      setDocumentName(null);
      setActiveTab('records');
      fetchLeaves(selectedChildId);
    } catch (err) {
      console.error('Apply leave error:', err);
      Alert.alert('Submission Failed', err.response?.data?.message || 'Could not submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calendar Helpers
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const handleDatePress = (day) => {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!isRangeMode) {
      setStartDate(formatted);
      setEndDate('');
    } else {
      if (!startDate || (startDate && endDate)) {
        setStartDate(formatted);
        setEndDate('');
      } else if (startDate && !endDate) {
        if (new Date(formatted) >= new Date(startDate)) {
          setEndDate(formatted);
        } else {
          setEndDate(startDate);
          setStartDate(formatted);
        }
      }
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  if (loading && !refreshing) return <FullPageLoader message="Loading leave requests..." />;

  const filteredLeaves = leaves.filter((l) => {
    if (statusFilter === 'all') return true;
    return (l.status || '').toLowerCase() === statusFilter.toLowerCase();
  });

  const counts = {
    all: leaves.length,
    pending: leaves.filter(l => (l.status || '').toLowerCase() === 'pending').length,
    approved: leaves.filter(l => (l.status || '').toLowerCase() === 'approved').length,
    rejected: leaves.filter(l => (l.status || '').toLowerCase() === 'rejected').length,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Leave Requests & Approvals"
        subtitle="Review, approve or apply for your child's leave"
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
      >
        {/* Child Switcher Component */}
        {children.length > 0 && (
          <ChildSwitcher
            childrenList={children}
            selectedChildId={selectedChildId}
            onSelectChild={(id) => setSelectedChildId(id)}
          />
        )}

        {/* Top Screen Segmented Tabs */}
        <View style={styles.topTabs}>
          <TouchableOpacity
            style={[styles.topTabBtn, activeTab === 'records' && styles.topTabBtnActive]}
            onPress={() => setActiveTab('records')}
            activeOpacity={0.8}
          >
            <CalendarOff size={15} color={activeTab === 'records' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.topTabBtnText, activeTab === 'records' && styles.topTabBtnTextActive]}>
              Leave Records ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topTabBtn, activeTab === 'apply' && styles.topTabBtnActive]}
            onPress={() => setActiveTab('apply')}
            activeOpacity={0.8}
          >
            <Plus size={15} color={activeTab === 'apply' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.topTabBtnText, activeTab === 'apply' && styles.topTabBtnTextActive]}>
              Apply for Child
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: Records & Approvals matching Web */}
        {activeTab === 'records' && (
          <View>
            {/* Status Filter Chips */}
            <View style={styles.filterRow}>
              {[
                { key: 'all', label: `All (${counts.all})` },
                { key: 'pending', label: `Pending (${counts.pending})` },
                { key: 'approved', label: `Approved (${counts.approved})` },
                { key: 'rejected', label: `Rejected (${counts.rejected})` },
              ].map((f) => {
                const isActive = statusFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setStatusFilter(f.key)}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredLeaves.length === 0 ? (
              <View style={[styles.emptyCard, shadows.sm]}>
                <CalendarOff size={44} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Leave Records</Text>
                <Text style={styles.emptySubtitle}>
                  No leave requests found under the "{statusFilter}" filter for this student.
                </Text>
              </View>
            ) : (
              filteredLeaves.map((leave) => {
                const st = (leave.status || 'pending').toLowerCase();
                const isAppr = st === 'approved';
                const isRej = st === 'rejected';
                const isPend = st === 'pending';
                const statusColor = isAppr ? colors.success : isRej ? colors.danger : colors.warning;

                const startDateStr = leave.start_date || leave.startDate;
                const endDateStr = leave.end_date || leave.endDate;
                const formattedStart = startDateStr
                  ? new Date(startDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';
                const formattedEnd = endDateStr
                  ? new Date(endDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : formattedStart;

                return (
                  <View key={leave.id || leave._id} style={[styles.leaveCard, shadows.sm]}>
                    <View style={[styles.statusStripe, { backgroundColor: statusColor }]} />

                    <View style={{ flex: 1 }}>
                      <View style={styles.leaveCardHeader}>
                        <Text style={styles.leaveTypeTitle}>
                          {leave.leave_type || leave.leaveType || 'General Leave'}
                        </Text>
                        <View style={[styles.statusCapsule, { backgroundColor: statusColor + '22' }]}>
                          <Text style={[styles.statusCapsuleText, { color: statusColor }]}>
                            {st.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dateRangeRow}>
                        <Calendar size={13} color={colors.textSecondary} />
                        <Text style={styles.dateRangeText}>
                          {formattedStart} → {formattedEnd}
                        </Text>
                      </View>

                      <Text style={styles.leaveReasonText}>
                        "{leave.reason}"
                      </Text>

                      {(isRej || leave.rejection_reason || leave.rejectionReason) && (
                        <View style={styles.rejectionCallout}>
                          <AlertCircle size={13} color={colors.danger} />
                          <Text style={styles.rejectionCalloutText}>
                            Reason: {leave.rejection_reason || leave.rejectionReason || 'Institutional policy limitation'}
                          </Text>
                        </View>
                      )}

                      {/* Approve / Reject Buttons for Pending */}
                      {isPend && (
                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity
                            style={[styles.approveBtn, shadows.sm]}
                            onPress={() => setActionModal({ leaveId: leave.id, action: 'approved' })}
                            activeOpacity={0.8}
                          >
                            <Check size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.rejectBtn, shadows.sm]}
                            onPress={() => setActionModal({ leaveId: leave.id, action: 'rejected' })}
                            activeOpacity={0.8}
                          >
                            <X size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: Apply for Child Form */}
        {activeTab === 'apply' && (
          <View style={[styles.applyPanel, shadows.sm]}>
            <Text style={styles.formSectionTitle}>1. Select Leave Category</Text>
            <View style={styles.typeOptionsRow}>
              {LEAVE_TYPES.map((t) => {
                const isSelected = leaveType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.typeOptionChip, isSelected && styles.typeOptionChipSelected]}
                    onPress={() => setLeaveType(t.value)}
                  >
                    <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextSelected]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.formDivider} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.formSectionTitle}>2. Date Selection</Text>
              <TouchableOpacity
                style={styles.modeToggle}
                onPress={() => {
                  setIsRangeMode(!isRangeMode);
                  setEndDate('');
                }}
              >
                <Text style={styles.modeToggleText}>
                  {isRangeMode ? 'Mode: Multi-Day Range' : 'Mode: Single Day'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selected Date Summary */}
            <View style={styles.selectedDatesBox}>
              <Text style={styles.selectedDatesText}>
                {startDate
                  ? isRangeMode && endDate
                    ? `From: ${startDate}  To: ${endDate}`
                    : `Selected: ${startDate}`
                  : 'Tap dates on the calendar below'}
              </Text>
            </View>

            {/* Interactive Calendar Matrix */}
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                  <ChevronLeft size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.calMonthTitle}>
                  {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                  <ChevronRight size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.calWeekdays}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <Text key={d} style={styles.calWeekdayText}>{d}</Text>
                ))}
              </View>

              <View style={styles.calDaysGrid}>
                {Array.from({ length: firstDayOfMonth(currentMonth, currentYear) }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.calDayCell} />
                ))}

                {Array.from({ length: daysInMonth(currentMonth, currentYear) }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isStart = startDate === dateStr;
                  const isEnd = endDate === dateStr;
                  const isInRange = isRangeMode && startDate && endDate && dateStr > startDate && dateStr < endDate;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.calDayCell,
                        (isStart || isEnd) && styles.calDaySelected,
                        isInRange && styles.calDayInRange,
                      ]}
                      onPress={() => handleDatePress(day)}
                    >
                      <Text style={[styles.calDayText, (isStart || isEnd) && styles.calDayTextSelected]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formDivider} />

            <Text style={styles.formSectionTitle}>3. Reason for Leave</Text>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              placeholder="Explain the detailed reason for this leave request..."
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
            />

            {/* Document Proof Attachment */}
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={() => setDocumentName(`medical_note_${Date.now()}.pdf`)}
            >
              <UploadCloud size={16} color={colors.primaryLight} />
              <Text style={styles.attachmentButtonText}>
                {documentName ? `Attached: ${documentName}` : 'Attach Medical / Official Certificate (Optional)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.6 }]}
              onPress={handleApplyLeave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Leave Application</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Approval / Rejection Remarks Modal */}
        <Modal
          visible={Boolean(actionModal)}
          transparent
          animationType="fade"
          onRequestClose={() => setActionModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, shadows.md]}>
              <Text style={styles.modalTitle}>
                {actionModal?.action === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </Text>
              <Text style={styles.modalSub}>
                Add optional guardian remarks for the institutional records.
              </Text>

              <TextInput
                style={styles.modalInput}
                multiline
                numberOfLines={3}
                placeholder="Enter remarks (optional)..."
                placeholderTextColor={colors.textMuted}
                value={remarks}
                onChangeText={setRemarks}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setActionModal(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalConfirmBtn,
                    { backgroundColor: actionModal?.action === 'approved' ? colors.success : colors.danger }
                  ]}
                  onPress={handleAction}
                  disabled={processingId !== null}
                >
                  <Text style={styles.modalConfirmBtnText}>
                    {processingId ? 'Updating...' : actionModal?.action === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing.md,
  },
  topTabs: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: 4,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  topTabBtnActive: {
    backgroundColor: colors.primary,
  },
  topTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  topTabBtnTextActive: {
    color: '#ffffff',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primaryLight,
  },
  leaveCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  statusStripe: {
    width: 4,
    borderRadius: radius.full,
    marginRight: 12,
  },
  leaveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leaveTypeTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  statusCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusCapsuleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 4,
  },
  dateRangeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  leaveReasonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  rejectionCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: radius.sm,
    marginTop: 8,
  },
  rejectionCalloutText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.danger,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  applyPanel: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  typeOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeOptionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  typeOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  formDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  modeToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: radius.full,
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  selectedDatesBox: {
    padding: 10,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedDatesText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
    textAlign: 'center',
  },
  calendarContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calNavBtn: {
    padding: 6,
  },
  calMonthTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  calWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  calWeekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  calDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 18,
  },
  calDaySelected: {
    backgroundColor: colors.primary,
  },
  calDayInRange: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  calDayText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  calDayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  reasonInput: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
    fontSize: 13,
    marginBottom: spacing.md,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'dashed rgba(99, 102, 241, 0.4)',
    marginBottom: spacing.lg,
  },
  attachmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  modalSub: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 10,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
    fontSize: 13,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default ParentLeaveScreen;
