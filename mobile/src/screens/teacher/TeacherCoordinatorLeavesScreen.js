import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
  Modal, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldCheck, Check, X, Search, Filter, Calendar, Clock,
  FileText, AlertCircle, Users, ChevronDown, ChevronUp,
  ShieldAlert, UserCheck, Mail, Building2, ExternalLink
} from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'revoked'];

const TeacherCoordinatorLeavesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Action modal state (approve, reject, or revoke)
  const [actionModal, setActionModal] = useState(null); // { id, type: 'approve' | 'reject' | 'revoke', studentName, dates }
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Top feedback toast banner
  const [banner, setBanner] = useState({ type: '', message: '' });
  const showFeedback = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4000);
  };

  // Student Quick Info Modal
  const [quickInfoStudent, setQuickInfoStudent] = useState(null);

  const fetchLeaves = async () => {
    try {
      const { data } = await api.get('/leave/coordinator/all');
      setLeaves(Array.isArray(data) ? data : (data?.leaves || []));
    } catch (err) {
      console.error('Coordinator leaves fetch error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Could not load student leaves');
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
    fetchLeaves();
  }, []);

  const handleApprove = (id, studentName, dates) => {
    setActionModal({
      id,
      type: 'approve',
      studentName: studentName || 'Student',
      dates: dates || '',
    });
    setActionReason('');
  };

  const handleActionSubmit = async () => {
    if (!actionModal) return;
    const { id, type } = actionModal;

    if (type !== 'approve' && !actionReason.trim()) {
      showFeedback('error', `Please provide a reason for ${type === 'reject' ? 'rejection' : 'revocation'}.`);
      return;
    }

    setActionLoading(true);
    try {
      if (type === 'approve') {
        await api.put(`/leave/approve/${id}`, { remarks: actionReason.trim() });
        showFeedback('success', 'Student leave application approved successfully.');
      } else if (type === 'reject') {
        await api.put(`/leave/reject/${id}`, { reason: actionReason.trim() });
        showFeedback('success', 'Leave application has been rejected.');
      } else {
        await api.put(`/leave/revoke/${id}`, { reason: actionReason.trim() });
        showFeedback('success', 'Approved leave has been revoked.');
      }
      setActionModal(null);
      setActionReason('');
      fetchLeaves();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || `Failed to ${type} leave.`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    const matchesStatus = filterStatus === 'all' || l.status?.toLowerCase() === filterStatus.toLowerCase();
    const name = l.userId?.name || l.studentName || '';
    const roll = l.userId?.rollNumber || l.rollNumber || '';
    const reason = l.reason || '';
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !q ||
      name.toLowerCase().includes(q) ||
      roll.toLowerCase().includes(q) ||
      reason.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const pendingCount = leaves.filter((l) => l.status?.toLowerCase() === 'pending').length;

  if (loading) return <FullPageLoader message="Loading class leave applications..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Class Leaves (Coord)"
        subtitle="Review student leave applications"
        navigation={navigation}
      />

      {/* Toast Feedback Banner */}
      {Boolean(banner.message) && (
        <View
          style={[
            styles.feedbackBanner,
            banner.type === 'error' ? styles.feedbackBannerError : styles.feedbackBannerSuccess,
          ]}
        >
          {banner.type === 'error' ? (
            <AlertCircle size={15} color={colors.danger} />
          ) : (
            <Check size={15} color={colors.success} />
          )}
          <Text style={styles.feedbackBannerText}>{banner.message}</Text>
        </View>
      )}

      {/* Search & Filter Bar */}
      <View style={styles.topControlPanel}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student, roll number, reason..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabsScroll}>
          {STATUS_TABS.map((st) => {
            const isSelected = filterStatus === st;
            const count = st === 'all' ? leaves.length : leaves.filter((l) => l.status?.toLowerCase() === st).length;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.statusTab, isSelected && styles.statusTabActive]}
                onPress={() => setFilterStatus(st)}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusTabText, isSelected && styles.statusTabTextActive]}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </Text>
                <View style={[styles.statusTabBadge, isSelected && styles.statusTabBadgeActive]}>
                  <Text style={[styles.statusTabBadgeText, isSelected && styles.statusTabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
      >
        {filteredLeaves.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShieldCheck size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Applications Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'No student leave applications match your search query.' : `There are no ${filterStatus !== 'all' ? filterStatus : ''} leave applications for your class.`}
            </Text>
          </View>
        ) : (
          filteredLeaves.map((leave, idx) => {
            const isExpanded = expandedRowId === (leave._id || leave.id || idx);
            const rowId = leave._id || leave.id || idx;
            const student = leave.userId || {};
            const studentName = student.name || leave.studentName || 'Student';
            const rollNum = student.rollNumber || leave.rollNumber || '—';
            const status = (leave.status || 'pending').toLowerCase();

            const startDateStr = leave.startDate ? new Date(leave.startDate).toLocaleDateString() : 'TBD';
            const endDateStr = leave.endDate ? new Date(leave.endDate).toLocaleDateString() : 'TBD';

            const days = leave.startDate && leave.endDate
              ? Math.max(1, Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1)
              : 1;

            const badgeBg =
              status === 'approved' ? colors.success + '20' :
              status === 'rejected' ? colors.danger + '20' :
              status === 'revoked' ? colors.warning + '20' :
              colors.primary + '20';

            const badgeColor =
              status === 'approved' ? colors.success :
              status === 'rejected' ? colors.danger :
              status === 'revoked' ? colors.warning :
              colors.primary;

            return (
              <View key={rowId} style={[styles.leaveCard, shadows.sm]}>
                {/* Card Top: Student & Status */}
                <View style={styles.cardHeader}>
                  <View style={styles.studentInfoCol}>
                    <View style={styles.studentNameRow}>
                      <Text style={styles.studentName}>{studentName}</Text>
                      <TouchableOpacity
                        style={styles.infoIconBtn}
                        onPress={() => setQuickInfoStudent(student)}
                        activeOpacity={0.7}
                      >
                        <AlertCircle size={14} color={colors.teacher} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.rollNumber}>Roll No: {rollNum}</Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                      {status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Duration & Dates */}
                <View style={styles.dateDurationRow}>
                  <Calendar size={13} color={colors.textMuted} />
                  <Text style={styles.dateDurationText}>
                    {startDateStr} — {endDateStr}
                  </Text>
                  <View style={styles.daysPill}>
                    <Text style={styles.daysPillText}>{days} {days === 1 ? 'day' : 'days'}</Text>
                  </View>
                </View>

                {/* Short Reason */}
                <Text style={styles.reasonSummary} numberOfLines={isExpanded ? 0 : 2}>
                  {leave.reason || 'No reason provided.'}
                </Text>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedPanel}>
                    {leave.rejectionReason && (status === 'rejected' || status === 'revoked') && (
                      <View style={styles.remarksBox}>
                        <ShieldAlert size={14} color={status === 'rejected' ? colors.danger : colors.warning} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.remarksLabel, { color: status === 'rejected' ? colors.danger : colors.warning }]}>
                            {status === 'rejected' ? 'Rejection Remarks:' : 'Revocation Remarks:'}
                          </Text>
                          <Text style={styles.remarksText}>"{leave.rejectionReason}"</Text>
                        </View>
                      </View>
                    )}

                    {leave.documentUrl && (
                      <TouchableOpacity
                        style={styles.docBtn}
                        onPress={() => Linking.openURL(leave.documentUrl).catch(() => Alert.alert('Could not open document link'))}
                        activeOpacity={0.8}
                      >
                        <FileText size={14} color={colors.primary} />
                        <Text style={styles.docBtnText}>View Attached Supporting Document</Text>
                        <ExternalLink size={12} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Action Buttons Row */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.toggleExpandBtn}
                    onPress={() => setExpandedRowId(isExpanded ? null : rowId)}
                  >
                    <Text style={styles.toggleExpandText}>{isExpanded ? 'Show Less' : 'Details'}</Text>
                    {isExpanded ? <ChevronUp size={13} color={colors.textMuted} /> : <ChevronDown size={13} color={colors.textMuted} />}
                  </TouchableOpacity>

                  <View style={styles.decisionBtns}>
                    {status === 'pending' && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => handleApprove(rowId)}
                          onPress={() => handleApprove(rowId, studentName, `${startDateStr} — ${endDateStr}`)}
                          activeOpacity={0.8}
                        >
                          <Check size={14} color="#fff" />
                          <Text style={styles.actionBtnTextWhite}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => {
                            setActionModal({ id: rowId, type: 'reject', studentName });
                            setActionReason('');
                          }}
                          activeOpacity={0.8}
                        >
                          <X size={14} color="#fff" />
                          <Text style={styles.actionBtnTextWhite}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {status === 'approved' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.revokeBtn]}
                        onPress={() => {
                          setActionModal({ id: rowId, type: 'revoke', studentName });
                          setActionReason('');
                        }}
                        activeOpacity={0.8}
                      >
                        <ShieldAlert size={14} color={colors.warning} />
                        <Text style={[styles.actionBtnText, { color: colors.warning }]}>Revoke</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Approve / Reject / Revoke Modal */}
      <Modal
        visible={Boolean(actionModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadows.lg]}>
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconBox,
                  {
                    backgroundColor: actionModal?.type === 'approve'
                      ? colors.success + '22'
                      : actionModal?.type === 'reject'
                        ? colors.danger + '22'
                        : colors.warning + '22',
                  },
                ]}
              >
                {actionModal?.type === 'approve' ? (
                  <Check size={20} color={colors.success} />
                ) : actionModal?.type === 'reject' ? (
                  <X size={20} color={colors.danger} />
                ) : (
                  <ShieldAlert size={20} color={colors.warning} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {actionModal?.type === 'approve'
                    ? 'Approve Leave Application'
                    : actionModal?.type === 'reject'
                      ? 'Reject Leave Application'
                      : 'Revoke Approved Leave'}
                </Text>
                <Text style={styles.modalSub}>
                  Student: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{actionModal?.studentName}</Text>
                  {actionModal?.dates ? ` (${actionModal.dates})` : ''}
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>
              {actionModal?.type === 'approve'
                ? 'Approval Remarks / Note (Optional)'
                : actionModal?.type === 'reject'
                  ? 'Reason for Rejection *'
                  : 'Reason for Revocation *'}
            </Text>
            <TextInput
              style={styles.modalTextArea}
              multiline
              numberOfLines={3}
              placeholder={
                actionModal?.type === 'approve'
                  ? 'Add optional remarks (e.g. Approved. Submit assignments after return)...'
                  : actionModal?.type === 'reject'
                    ? 'Provide reason (e.g. Invalid document, exam clash, attendance short)...'
                    : 'Provide reason (e.g. Mandatory practical on same day)...'
              }
              placeholderTextColor={colors.textMuted}
              value={actionReason}
              onChangeText={setActionReason}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setActionModal(null)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  {
                    backgroundColor: actionModal?.type === 'approve'
                      ? colors.success
                      : actionModal?.type === 'reject'
                        ? colors.danger
                        : colors.warning,
                  },
                ]}
                onPress={handleActionSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {actionModal?.type === 'approve'
                      ? 'Confirm Approve'
                      : actionModal?.type === 'reject'
                        ? 'Confirm Reject'
                        : 'Confirm Revoke'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Student Quick Info Modal */}
      <Modal
        visible={Boolean(quickInfoStudent)}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickInfoStudent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.quickInfoCard, shadows.lg]}>
            <View style={styles.quickInfoHeader}>
              <View>
                <Text style={styles.quickInfoName}>{quickInfoStudent?.name || 'Student Profile'}</Text>
                <Text style={styles.quickInfoRoll}>Roll: {quickInfoStudent?.rollNumber || '—'}</Text>
              </View>
              <TouchableOpacity onPress={() => setQuickInfoStudent(null)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickInfoBody}>
              <View style={styles.quickInfoRow}>
                <Mail size={14} color={colors.teacher} />
                <View>
                  <Text style={styles.quickInfoLabel}>Email</Text>
                  <Text style={styles.quickInfoVal}>{quickInfoStudent?.email || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.quickInfoRow}>
                <Building2 size={14} color={colors.teacher} />
                <View>
                  <Text style={styles.quickInfoLabel}>Department</Text>
                  <Text style={styles.quickInfoVal}>{quickInfoStudent?.departmentId?.departmentName || quickInfoStudent?.departmentId?.name || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.quickInfoRow}>
                <Users size={14} color={colors.teacher} />
                <View>
                  <Text style={styles.quickInfoLabel}>Class / Section</Text>
                  <Text style={styles.quickInfoVal}>{quickInfoStudent?.section || user?.coordinatorClassName || 'Active Class'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  topControlPanel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 7,
    ...typography.xs,
    color: colors.textPrimary,
  },
  statusTabsScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
  },
  statusTabActive: {
    backgroundColor: colors.teacher,
    borderColor: colors.teacher,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  statusTabBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  statusTabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  statusTabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  statusTabBadgeTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.xs,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  leaveCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentInfoCol: {
    flex: 1,
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studentName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  infoIconBtn: {
    padding: 2,
  },
  rollNumber: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dateDurationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  daysPill: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  daysPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  reasonSummary: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
    marginTop: 4,
  },
  expandedPanel: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  remarksBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.bgElevated,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  remarksText: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  docBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border + '44',
  },
  toggleExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  toggleExpandText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  decisionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  approveBtn: {
    backgroundColor: colors.success,
  },
  rejectBtn: {
    backgroundColor: colors.danger,
  },
  revokeBtn: {
    backgroundColor: colors.warning + '20',
    borderWidth: 1,
    borderColor: colors.warning + '55',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnTextWhite: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalTextArea: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalSubmitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  modalSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  quickInfoCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickInfoName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  quickInfoRoll: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  quickInfoBody: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  quickInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  quickInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  quickInfoVal: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: 1,
  },
  feedbackBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  feedbackBannerSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  feedbackBannerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  feedbackBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
});

export default TeacherCoordinatorLeavesScreen;

