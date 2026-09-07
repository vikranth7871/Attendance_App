import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  SlidersHorizontal,
  X,
  Check,
  RotateCcw,
  FileText,
  ChevronRight,
  ExternalLink,
  Eye,
  Building,
  User,
  CheckCircle,
  Paperclip,
} from 'lucide-react-native';
import Header from '../../components/Header';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { SkeletonBox } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    icon: XCircle,
  },
  revoked: {
    label: 'Revoked',
    color: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: 'rgba(217, 119, 6, 0.35)',
    icon: AlertCircle,
  },
};

const LEAVE_TYPE_COLORS = {
  sick: { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  medical: { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  emergency: { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  casual: { text: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' },
  personal: { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  default: { text: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' },
};

const formatDateSafe = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const calculateDays = (start, end) => {
  if (!start || !end) return 1;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const TeacherLeavesScreen = ({ navigation }) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | pending | approved | rejected | revoked

  // Actions loading
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Top feedback toast banner
  const [banner, setBanner] = useState({ type: '', message: '' });
  const showFeedback = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4000);
  };

  // Action Modal (Approve / Reject / Revoke)
  const [actionModal, setActionModal] = useState(null); // { id, type: 'approve' | 'reject' | 'revoke', teacherName, dates }
  const [actionReason, setActionReason] = useState('');

  // Detailed Dossier / Inspect Modal
  const [dossierLeave, setDossierLeave] = useState(null);

  // Document Viewer Modal
  const [previewDocUrl, setPreviewDocUrl] = useState(null);
  const [previewDocTitle, setPreviewDocTitle] = useState('Supporting Document');

  const fetchLeaves = async () => {
    try {
      // Backend route /api/leave/admin/teacher-leaves returns normalized teacher leave requests
      const res = await api.get('/leave/admin/teacher-leaves').catch(async () => {
        return await api.get('/admin/teacher-leaves');
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setLeaves(data);
    } catch (err) {
      console.error('Leaves fetch error:', err);
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

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === 'pending').length;
    const approved = leaves.filter((l) => l.status === 'approved').length;
    const rejectedRevoked = leaves.filter((l) => l.status === 'rejected' || l.status === 'revoked').length;
    return { total, pending, approved, rejectedRevoked };
  }, [leaves]);

  // Filtered & Searched Leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const statusMatches = filterStatus === 'all' || l.status === filterStatus;
      if (!statusMatches) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();

      const teacherName = (l.userId?.name || l.teacher_name || l.employee_name || '').toLowerCase();
      const dept = (l.userId?.departmentName || l.department_name || '').toLowerCase();
      const reason = (l.reason || '').toLowerCase();
      const type = (l.leaveType || l.leave_type || '').toLowerCase();

      return teacherName.includes(q) || dept.includes(q) || reason.includes(q) || type.includes(q);
    });
  }, [leaves, filterStatus, search]);

  // Action handlers
  const handleApprove = (leave) => {
    openActionModal(leave, 'approve');
  };

  const openActionModal = (leave, type) => {
    const id = leave.id || leave._id;
    const teacherName = leave.userId?.name || leave.teacher_name || 'Staff Member';
    const dates = `${formatDateSafe(leave.startDate || leave.start_date)} – ${formatDateSafe(leave.endDate || leave.end_date)}`;
    setActionModal({ id, type, teacherName, dates });
    setActionReason(type === 'revoke' ? 'Revoked by Admin' : '');
  };

  const submitActionModal = async () => {
    if (!actionModal) return;
    const { id, type, teacherName } = actionModal;
    const reason = actionReason.trim();

    if (type === 'reject' && !reason) {
      showFeedback('error', 'Please provide a reason for rejecting this leave.');
      return;
    }

    setActionLoadingId(id);
    try {
      if (type === 'approve') {
        await api
          .put(`/leave/approve/${id}`, { remarks: reason })
          .catch(() => api.put(`/admin/teacher-leaves/${id}/approve`, { remarks: reason }));
        showFeedback('success', `Leave application for ${teacherName} approved successfully.`);
      } else if (type === 'reject') {
        await api
          .put(`/leave/reject/${id}`, { reason: reason || 'Rejected by Admin' })
          .catch(() => api.put(`/admin/teacher-leaves/${id}/reject`, { reason }));
        showFeedback('success', `Leave application for ${teacherName} rejected.`);
      } else {
        await api
          .put(`/leave/revoke/${id}`, { reason: reason || 'Revoked by Admin' })
          .catch(() => api.put(`/admin/teacher-leaves/${id}/revoke`, { reason }));
        showFeedback('success', `Approved leave for ${teacherName} has been revoked.`);
      }

      setActionModal(null);
      setActionReason('');
      fetchLeaves();
      if (dossierLeave && (dossierLeave.id === id || dossierLeave._id === id)) {
        setDossierLeave((prev) =>
          prev
            ? {
                ...prev,
                status: type === 'approve' ? 'approved' : type === 'reject' ? 'rejected' : 'revoked',
                rejectionReason: type === 'approve' ? null : reason,
              }
            : null
        );
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || `Failed to ${type} leave request.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenDoc = (itemOrUrl) => {
    if (!itemOrUrl) return;
    if (typeof itemOrUrl === 'object') {
      const doc = itemOrUrl.documentUrl || itemOrUrl.document_url || itemOrUrl.documentDownloadUrl;
      const teacher = itemOrUrl.userId?.name || itemOrUrl.teacher_name || 'Teacher';
      setPreviewDocUrl(doc);
      setPreviewDocTitle(`${teacher}'s Supporting Document`);
    } else {
      setPreviewDocUrl(itemOrUrl);
      setPreviewDocTitle('Supporting Document');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sleek Header */}
      <Header
        title="Teacher Leaves"
        subtitle={`${metrics.pending} pending review`}
        navigation={navigation}
      />

      {/* Top Feedback Banner */}
      {Boolean(banner.message) && (
        <View
          style={[
            styles.feedbackBanner,
            banner.type === 'error' ? styles.feedbackBannerError : styles.feedbackBannerSuccess,
          ]}
        >
          {banner.type === 'error' ? (
            <AlertCircle size={16} color={colors.danger} />
          ) : (
            <CheckCircle size={16} color={colors.success} />
          )}
          <Text style={styles.feedbackBannerText}>{banner.message}</Text>
        </View>
      )}

      {/* Top Analytics Cards (Total, Pending, Approved, Rejected/Revoked) */}
      <View style={styles.analyticsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.analyticsScrollContent}
        >
          {/* Total */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Calendar size={18} color="#6366F1" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Total Requests</Text>
              <Text style={styles.metricValue}>{metrics.total}</Text>
            </View>
          </View>

          {/* Pending */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Clock size={18} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Pending Review</Text>
              <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{metrics.pending}</Text>
            </View>
          </View>

          {/* Approved */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <CheckCircle2 size={18} color="#10B981" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Approved</Text>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>{metrics.approved}</Text>
            </View>
          </View>

          {/* Rejected / Revoked */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <XCircle size={18} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Rejected / Revoked</Text>
              <Text style={[styles.metricValue, { color: '#EF4444' }]}>{metrics.rejectedRevoked}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Control Bar: Search & Status Filter Chips */}
      <View style={styles.controlBar}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={14} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by teacher, dept, or reason..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusChipsScroll}
        >
          {['all', 'pending', 'approved', 'rejected', 'revoked'].map((status) => {
            const active = filterStatus === status;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.statusChip, active && styles.statusChipActive]}
                onPress={() => setFilterStatus(status)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Edge-to-edge Table (Matching User Directory Design with Zero Bezels) */}
      <View style={styles.tableCard}>
        {/* Centered Table Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: 'center' }]}>Teacher</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: 'center' }]}>Dates</Text>
          <Text style={[styles.tableHeaderCell, { width: 84, textAlign: 'center' }]}>Status</Text>
          <Text style={[styles.tableHeaderCell, { width: 48, textAlign: 'center' }]}>View</Text>
        </View>

        {loading ? (
          /* Table Row Skeletons */
          <View style={styles.tableListContent}>
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  i % 2 === 1 && styles.tableRowAlt,
                  { opacity: Math.max(0.25, 0.9 - i * 0.08) },
                ]}
              >
                {/* Teacher Column */}
                <View style={[styles.tableCell, { flex: 1.3 }]}>
                  <SkeletonBox width="80%" height={13} style={{ borderRadius: 4, marginBottom: 4 }} />
                  <SkeletonBox width="50%" height={9} style={{ borderRadius: 3 }} />
                </View>

                {/* Dates Column */}
                <View style={[styles.tableCell, { flex: 1.3, alignItems: 'center' }]}>
                  <SkeletonBox width="85%" height={11} style={{ borderRadius: 4, marginBottom: 3 }} />
                  <SkeletonBox width="40%" height={9} style={{ borderRadius: 3 }} />
                </View>

                {/* Status Column */}
                <View style={[styles.tableCell, { width: 84, alignItems: 'center' }]}>
                  <SkeletonBox width={66} height={20} style={{ borderRadius: 10 }} />
                </View>

                {/* Eye Icon Column */}
                <View style={[styles.tableCell, { width: 48, alignItems: 'center' }]}>
                  <SkeletonBox width={28} height={28} style={{ borderRadius: 6 }} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredLeaves}
            keyExtractor={(item, i) => (item.id || item._id || i).toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            contentContainerStyle={styles.tableListContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <CheckCircle size={38} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No leave requests found</Text>
                <Text style={styles.emptySubtitle}>
                  {search || filterStatus !== 'all'
                    ? 'Try adjusting your search query or status filter.'
                    : 'There are currently no teacher leave applications to review.'}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const rowId = item.id || item._id;
              const teacherName = item.userId?.name || item.teacher_name || item.employee_name || 'Staff Member';
              const department = item.userId?.departmentName || item.department_name || item.userId?.email || 'Faculty';

              const rawType = (item.leaveType || item.leave_type || item.type || 'General').toLowerCase();
              const typeStyle = LEAVE_TYPE_COLORS[rawType] || LEAVE_TYPE_COLORS.default;

              const startDateStr = item.startDate || item.start_date;
              const endDateStr = item.endDate || item.end_date;
              const daysCount = item.total_days || calculateDays(startDateStr, endDateStr);

              const statusKey = (item.status || 'pending').toLowerCase();
              const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              const hasDoc = Boolean(item.documentUrl || item.document_url || item.documentDownloadUrl);

              return (
                <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                  {/* Column 1: Teacher & Dept */}
                  <View style={[styles.tableCell, { flex: 1.3 }]}>
                    <Text style={styles.cellTextPrimary} numberOfLines={1} ellipsizeMode="tail">
                      {teacherName}
                    </Text>
                    <Text style={styles.cellTextSecondary} numberOfLines={1} ellipsizeMode="tail">
                      {department}
                    </Text>
                  </View>

                  {/* Column 2: Dates & Days Duration */}
                  <View style={[styles.tableCell, { flex: 1.3, alignItems: 'center' }]}>
                    <Text style={styles.dateTextPrimary} numberOfLines={1}>
                      {formatDateSafe(startDateStr)} – {formatDateSafe(endDateStr)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <View style={styles.daysBadge}>
                        <Text style={styles.daysBadgeText}>
                          {daysCount} {daysCount === 1 ? 'day' : 'days'}
                        </Text>
                      </View>
                      {hasDoc && (
                        <View style={styles.hasDocBadge}>
                          <Paperclip size={9} color={colors.primary} />
                          <Text style={styles.hasDocBadgeText}>Doc</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Column 3: Status Badge */}
                  <View style={[styles.tableCell, { width: 84, alignItems: 'center' }]}>
                    <View style={[styles.statusBadgePill, { backgroundColor: statusCfg.bgColor, borderColor: statusCfg.borderColor }]}>
                      <StatusIcon size={10} color={statusCfg.color} />
                      <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                        {statusKey === 'pending' ? 'Pending' : statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                      </Text>
                    </View>
                    {item.rejectionReason && (statusKey === 'rejected' || statusKey === 'revoked') && (
                      <Text style={styles.rejectionSnippet} numberOfLines={1} ellipsizeMode="tail">
                        "{item.rejectionReason}"
                      </Text>
                    )}
                  </View>

                  {/* Column 4: Eye Icon — opens dossier */}
                  <TouchableOpacity
                    style={styles.eyeIconBtn}
                    onPress={() => setDossierLeave(item)}
                    activeOpacity={0.7}
                    accessibilityLabel="View leave details"
                  >
                    <Eye size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* ========================================================================= */}
      {/* 1. LEAVE DOSSIER / DETAILED BOTTOM SHEET MODAL                             */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(dossierLeave)}
        transparent
        animationType="slide"
        onRequestClose={() => setDossierLeave(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dossierModalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.dossierHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dossierTitle}>Leave Application Details</Text>
                <Text style={styles.dossierSubtitle}>
                  Submitted by {dossierLeave?.userId?.name || dossierLeave?.teacher_name || 'Staff Member'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDossierLeave(null)} style={styles.modalCloseBtn}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {dossierLeave && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Status Indicator Bar */}
                {(() => {
                  const sKey = (dossierLeave.status || 'pending').toLowerCase();
                  const sCfg = STATUS_CONFIG[sKey] || STATUS_CONFIG.pending;
                  const SIcon = sCfg.icon;
                  return (
                    <View style={[styles.dossierStatusBanner, { backgroundColor: sCfg.bgColor, borderColor: sCfg.borderColor }]}>
                      <SIcon size={18} color={sCfg.color} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.dossierStatusTitle, { color: sCfg.color }]}>
                          Status: {sCfg.label}
                        </Text>
                        {dossierLeave.rejectionReason && (
                          <Text style={styles.dossierRejectionText}>
                            Note: "{dossierLeave.rejectionReason}"
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })()}

                {/* Information Sections */}
                <View style={styles.dossierSection}>
                  <Text style={styles.dossierSectionHeading}>Faculty Information</Text>
                  <DossierItem label="Educator Name" value={dossierLeave.userId?.name || dossierLeave.teacher_name || 'Staff Member'} />
                  <DossierItem label="Email" value={dossierLeave.userId?.email || dossierLeave.teacher_email || '-'} />
                  <DossierItem label="Department" value={dossierLeave.userId?.departmentName || dossierLeave.department_name || 'Faculty'} />
                </View>

                <View style={styles.dossierSection}>
                  <Text style={styles.dossierSectionHeading}>Leave Schedule</Text>
                  <DossierItem label="Leave Type" value={(dossierLeave.leaveType || dossierLeave.leave_type || 'General').toUpperCase()} />
                  <DossierItem
                    label="Date Duration"
                    value={`${formatDateSafe(dossierLeave.startDate || dossierLeave.start_date)} – ${formatDateSafe(dossierLeave.endDate || dossierLeave.end_date)}`}
                  />
                  <DossierItem
                    label="Total Days"
                    value={`${dossierLeave.total_days || calculateDays(dossierLeave.startDate || dossierLeave.start_date, dossierLeave.endDate || dossierLeave.end_date)} day(s)`}
                  />
                </View>

                <View style={styles.dossierSection}>
                  <Text style={styles.dossierSectionHeading}>Reason for Absence</Text>
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonText}>{dossierLeave.reason || 'No specific description provided.'}</Text>
                  </View>
                </View>

                {/* Supporting Document */}
                <View style={styles.dossierSection}>
                  <Text style={styles.dossierSectionHeading}>Attached Document</Text>
                  {dossierLeave.documentUrl || dossierLeave.document_url || dossierLeave.documentDownloadUrl ? (
                    <TouchableOpacity
                      style={styles.docAttachmentBtn}
                      onPress={() => handleOpenDoc(dossierLeave)}
                      activeOpacity={0.75}
                    >
                      <FileText size={18} color={colors.primary} />
                      <Text style={styles.docAttachmentText}>View Supporting Document</Text>
                      <ExternalLink size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noDocText}>No supporting document was attached to this request.</Text>
                  )}
                </View>

                {/* Quick Actions Footer inside Dossier */}
                <View style={styles.dossierActionsRow}>
                  {dossierLeave.status === 'pending' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.dossierActionBtn, { backgroundColor: colors.success }]}
                        onPress={() => {
                          handleApprove(dossierLeave);
                        }}
                      >
                        <Check size={16} color="#fff" />
                        <Text style={styles.dossierActionBtnText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.dossierActionBtn, { backgroundColor: colors.danger }]}
                        onPress={() => {
                          openActionModal(dossierLeave, 'reject');
                        }}
                      >
                        <X size={16} color="#fff" />
                        <Text style={styles.dossierActionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  ) : dossierLeave.status === 'approved' ? (
                    <TouchableOpacity
                      style={[styles.dossierActionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderColor: '#F59E0B' }]}
                      onPress={() => {
                        openActionModal(dossierLeave, 'revoke');
                      }}
                    >
                      <RotateCcw size={16} color="#F59E0B" />
                      <Text style={[styles.dossierActionBtnText, { color: '#F59E0B' }]}>Revoke Leave</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. ACTION MODAL (APPROVE / REJECT / REVOKE)                               */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(actionModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reasonModalCard}>
            <View style={styles.modalHeaderRow}>
              <View
                style={[
                  styles.actionIconBox,
                  {
                    backgroundColor:
                      actionModal?.type === 'approve'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : actionModal?.type === 'reject'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                  },
                ]}
              >
                {actionModal?.type === 'approve' ? (
                  <Check size={20} color={colors.success} />
                ) : actionModal?.type === 'reject' ? (
                  <X size={20} color={colors.danger} />
                ) : (
                  <RotateCcw size={18} color="#F59E0B" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reasonModalTitle}>
                  {actionModal?.type === 'approve'
                    ? 'Approve Leave Request'
                    : actionModal?.type === 'reject'
                    ? 'Reject Leave Request'
                    : 'Revoke Approved Leave'}
                </Text>
                <Text style={styles.reasonModalSubtitle}>
                  Educator: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{actionModal?.teacherName}</Text>
                  {actionModal?.dates ? ` (${actionModal.dates})` : ''}
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>
              {actionModal?.type === 'approve'
                ? 'Approval Remarks / Note (Optional)'
                : actionModal?.type === 'reject'
                ? 'Reason for Rejection *'
                : 'Reason for Revocation (Optional)'}
            </Text>
            <TextInput
              style={styles.reasonInput}
              value={actionReason}
              onChangeText={setActionReason}
              placeholder={
                actionModal?.type === 'approve'
                  ? 'Add optional remarks (e.g. Approved with coverage arranged)...'
                  : actionModal?.type === 'reject'
                  ? 'Enter reason for rejection (required)...'
                  : 'Revoked by Admin'
              }
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setActionModal(null);
                  setActionReason('');
                }}
                disabled={Boolean(actionLoadingId)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  actionModal?.type === 'approve'
                    ? { backgroundColor: colors.success }
                    : actionModal?.type === 'reject'
                    ? { backgroundColor: colors.danger }
                    : { backgroundColor: '#D97706' },
                ]}
                onPress={submitActionModal}
                disabled={Boolean(actionLoadingId)}
              >
                {actionLoadingId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
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

      {/* ========================================================================= */}
      {/* 3. DOCUMENT PREVIEW MODAL                                                 */}
      {/* ========================================================================= */}
      <DocumentViewerModal
        visible={Boolean(previewDocUrl)}
        onClose={() => setPreviewDocUrl(null)}
        documentUrl={previewDocUrl}
        title={previewDocTitle}
      />
    </SafeAreaView>
  );
};

const DossierItem = ({ label, value }) => (
  <View style={styles.dossierItemRow}>
    <Text style={styles.dossierItemLabel}>{label}</Text>
    <Text style={styles.dossierItemValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  // Analytics Cards Horizontal Slider
  analyticsContainer: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs + 2,
  },
  analyticsScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
    gap: 10,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  // Search & Filter Controls
  controlBar: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
    padding: 0,
  },
  statusChipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Edge-to-Edge Table (Zero Side Margin & Centered Headers)
  tableCard: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: colors.border + '60',
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tableListContent: {
    paddingBottom: 80,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
  tableCell: {
    justifyContent: 'center',
    paddingRight: 4,
  },
  cellTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cellTextSecondary: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Type Pill
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Date column
  dateTextPrimary: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  daysBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  daysBadgeText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  hasDocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginTop: 2,
  },
  hasDocBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },

  // Status Badge Pill
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  rejectionSnippet: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
    maxWidth: 75,
  },

  // Eye Icon Button (View column)
  eyeIconBtn: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },

  // Actions Column Buttons
  actionButtonsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionBtnApprove: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnReject: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnRevoke: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnView: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#232733',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDoc: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty View
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.semibold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Modal Overlay & Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  dossierModalCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted + '40',
    alignSelf: 'center',
    marginVertical: 10,
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  dossierTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dossierSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  dossierStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  dossierStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  dossierRejectionText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  dossierSection: {
    marginBottom: spacing.md,
  },
  dossierSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dossierItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dossierItemLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dossierItemValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reasonBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  docAttachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '18',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: 10,
    borderRadius: radius.sm,
    gap: 8,
  },
  docAttachmentText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  noDocText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  dossierActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
  },
  dossierActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  dossierActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Reject / Revoke Reason Modal
  reasonModalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reasonModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  reasonInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 13,
    padding: 10,
    minHeight: 70,
    marginBottom: spacing.md,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    zIndex: 100,
  },
  feedbackBannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  feedbackBannerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  feedbackBannerText: {
    ...typography.sm,
    ...typography.medium,
    color: colors.textPrimary,
    flex: 1,
  },
});

export default TeacherLeavesScreen;
