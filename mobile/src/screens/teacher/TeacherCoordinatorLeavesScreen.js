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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
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
  ShieldCheck,
  ShieldAlert,
  Info,
  Mail,
  Phone,
  GraduationCap,
} from 'lucide-react-native';
import Header from '../../components/Header';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { SkeletonBox } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';

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
  medical: { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  sick: { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  emergency: { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  casual: { text: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' },
  personal: { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  duty: { text: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  default: { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
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

const TeacherCoordinatorLeavesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const coordClass =
    user?.coordinatorClassName ||
    user?.class_coordinator_for ||
    user?.coordinator_class_name ||
    user?.coordinatedClass ||
    'CS101-A';

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
  const [actionModal, setActionModal] = useState(null); // { id, type: 'approve' | 'reject' | 'revoke', studentName, dates }
  const [actionReason, setActionReason] = useState('');

  // Detailed Dossier / Inspect Modal
  const [dossierLeave, setDossierLeave] = useState(null);

  // Student Quick Info Modal
  const [quickInfoStudent, setQuickInfoStudent] = useState(null);

  // Document Viewer Modal
  const [previewDocUrl, setPreviewDocUrl] = useState(null);
  const [previewDocTitle, setPreviewDocTitle] = useState('Supporting Document');

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leave/coordinator/all');
      const data = Array.isArray(res.data) ? res.data : (res.data?.leaves || []);
      setLeaves(data);
    } catch (err) {
      console.error('Coordinator leaves fetch error:', err);
      showFeedback('error', err.response?.data?.message || 'Could not load student leaves');
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
    const pending = leaves.filter((l) => (l.status || '').toLowerCase() === 'pending').length;
    const approved = leaves.filter((l) => (l.status || '').toLowerCase() === 'approved').length;
    const rejectedRevoked = leaves.filter(
      (l) => (l.status || '').toLowerCase() === 'rejected' || (l.status || '').toLowerCase() === 'revoked'
    ).length;
    return { total, pending, approved, rejectedRevoked };
  }, [leaves]);

  // Filtered & Searched Leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const statusKey = (l.status || 'pending').toLowerCase();
      const statusMatches = filterStatus === 'all' || statusKey === filterStatus.toLowerCase();
      if (!statusMatches) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();

      const studentName = (l.userId?.name || l.studentName || l.student_name || '').toLowerCase();
      const roll = (l.userId?.rollNumber || l.rollNumber || l.roll_number || '').toLowerCase();
      const reason = (l.reason || '').toLowerCase();
      const type = (l.leaveType || l.leave_type || '').toLowerCase();

      return studentName.includes(q) || roll.includes(q) || reason.includes(q) || type.includes(q);
    });
  }, [leaves, filterStatus, search]);

  // Action handlers
  const handleApprove = (leave) => {
    openActionModal(leave, 'approve');
  };

  const openActionModal = (leave, type) => {
    const id = leave.id || leave._id;
    const studentName = leave.userId?.name || leave.studentName || leave.student_name || 'Student';
    const dates = `${formatDateSafe(leave.startDate || leave.start_date)} – ${formatDateSafe(leave.endDate || leave.end_date)}`;
    setActionModal({ id, type, studentName, dates });
    setActionReason(type === 'revoke' ? 'Revoked by Coordinator' : '');
  };

  const submitActionModal = async () => {
    if (!actionModal) return;
    const { id, type, studentName } = actionModal;
    const reason = actionReason.trim();

    if (type !== 'approve' && !reason) {
      showFeedback('error', `Please provide a reason for ${type === 'reject' ? 'rejection' : 'revocation'}.`);
      return;
    }

    setActionLoadingId(id);
    try {
      if (type === 'approve') {
        await api.put(`/leave/approve/${id}`, { remarks: reason });
        showFeedback('success', `Student leave for ${studentName} approved successfully.`);
      } else if (type === 'reject') {
        await api.put(`/leave/reject/${id}`, { reason: reason || 'Rejected by Coordinator' });
        showFeedback('success', `Leave application for ${studentName} rejected.`);
      } else {
        await api.put(`/leave/revoke/${id}`, { reason: reason || 'Revoked by Coordinator' });
        showFeedback('success', `Approved leave for ${studentName} has been revoked.`);
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
      showFeedback('error', err.response?.data?.message || `Failed to ${type} leave.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenDoc = (itemOrUrl) => {
    if (!itemOrUrl) return;
    if (typeof itemOrUrl === 'object') {
      const doc = itemOrUrl.documentUrl || itemOrUrl.document_url || itemOrUrl.documentDownloadUrl;
      const student = itemOrUrl.userId?.name || itemOrUrl.studentName || 'Student';
      setPreviewDocUrl(doc);
      setPreviewDocTitle(`${student}'s Supporting Document`);
    } else {
      setPreviewDocUrl(itemOrUrl);
      setPreviewDocTitle('Supporting Document');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sleek Header */}
      <Header
        title="Class Leaves (Coord)"
        subtitle={`${coordClass} Coordinator • ${metrics.pending} pending review`}
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
            placeholder="Search by student name, roll number, or reason..."
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

      {/* Edge-to-edge Table (Matching Teacher Leaves Screen Template) */}
      <View style={styles.tableCard}>
        {/* Table Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 1.4, textAlign: 'left', paddingLeft: 6 }]}>Student</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: 'center' }]}>Dates</Text>
          <Text style={[styles.tableHeaderCell, { width: 88, textAlign: 'center' }]}>Status</Text>
          <Text style={[styles.tableHeaderCell, { width: isWide ? 110 : 48, textAlign: 'center' }]}>
            {isWide ? 'Actions' : 'View'}
          </Text>
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
                {/* Student Column */}
                <View style={[styles.tableCell, { flex: 1.4 }]}>
                  <SkeletonBox width="75%" height={13} style={{ borderRadius: 4, marginBottom: 4 }} />
                  <SkeletonBox width="50%" height={9} style={{ borderRadius: 3 }} />
                </View>

                {/* Dates Column */}
                <View style={[styles.tableCell, { flex: 1.3, alignItems: 'center' }]}>
                  <SkeletonBox width="85%" height={11} style={{ borderRadius: 4, marginBottom: 3 }} />
                  <SkeletonBox width="45%" height={9} style={{ borderRadius: 3 }} />
                </View>

                {/* Status Column */}
                <View style={[styles.tableCell, { width: 88, alignItems: 'center' }]}>
                  <SkeletonBox width={66} height={20} style={{ borderRadius: 10 }} />
                </View>

                {/* View Column */}
                <View style={[styles.tableCell, { width: isWide ? 110 : 48, alignItems: 'center' }]}>
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
                <Calendar size={38} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No student leave requests found</Text>
                <Text style={styles.emptySubtitle}>
                  {search || filterStatus !== 'all'
                    ? 'Try adjusting your search query or status filter.'
                    : `There are currently no leave requests submitted for ${coordClass}.`}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const rowId = item.id || item._id;
              const student = item.userId || {};
              const studentName = student.name || item.studentName || item.student_name || 'Student';
              const rollNumber = student.rollNumber || item.rollNumber || item.roll_number || 'STU';

              const rawType = (item.leaveType || item.leave_type || 'General').toLowerCase();
              const typeStyle = LEAVE_TYPE_COLORS[rawType] || LEAVE_TYPE_COLORS.default;

              const startDateStr = item.startDate || item.start_date;
              const endDateStr = item.endDate || item.end_date;
              const daysCount = item.total_days || calculateDays(startDateStr, endDateStr);

              const statusKey = (item.status || 'pending').toLowerCase();
              const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              const hasDoc = Boolean(item.documentUrl || item.document_url || item.documentDownloadUrl);

              return (
                <TouchableOpacity
                  style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                  onPress={() => setDossierLeave(item)}
                  activeOpacity={0.7}
                >
                  {/* Column 1: Student Name, Quick Info & Type */}
                  <View style={[styles.tableCell, { flex: 1.4, paddingLeft: 6 }]}>
                    <View style={styles.studentNameRow}>
                      <Text style={styles.cellTextPrimary} numberOfLines={1} ellipsizeMode="tail">
                        {studentName}
                      </Text>
                      <TouchableOpacity
                        style={styles.quickInfoBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setQuickInfoStudent(student);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <AlertCircle size={13} color="#8b5cf6" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.cellTextSecondary} numberOfLines={1}>
                      Roll: {rollNumber}
                    </Text>

                    <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>
                        {item.leaveType || 'General'}
                      </Text>
                    </View>
                  </View>

                  {/* Column 2: Dates & Duration */}
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
                        <TouchableOpacity
                          style={styles.hasDocBadge}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenDoc(item);
                          }}
                          activeOpacity={0.8}
                        >
                          <Paperclip size={9} color={colors.primary} />
                          <Text style={styles.hasDocBadgeText}>Doc</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Column 3: Status Badge */}
                  <View style={[styles.tableCell, { width: 88, alignItems: 'center' }]}>
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

                  {/* Column 4: View or Quick Actions */}
                  <View style={[styles.tableCell, { width: isWide ? 110 : 48, alignItems: 'center' }]}>
                    {isWide ? (
                      <View style={styles.wideActionsRow}>
                        {statusKey === 'pending' ? (
                          <>
                            <TouchableOpacity
                              style={[styles.smallActionBtn, styles.smallActionBtnApprove]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleApprove(item);
                              }}
                              disabled={actionLoadingId === rowId}
                            >
                              <Check size={13} color="#10b981" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.smallActionBtn, styles.smallActionBtnReject]}
                              onPress={(e) => {
                                e.stopPropagation();
                                openActionModal(item, 'reject');
                              }}
                              disabled={actionLoadingId === rowId}
                            >
                              <X size={13} color="#ef4444" />
                            </TouchableOpacity>
                          </>
                        ) : statusKey === 'approved' ? (
                          <TouchableOpacity
                            style={[styles.smallActionBtn, styles.smallActionBtnRevoke]}
                            onPress={(e) => {
                              e.stopPropagation();
                              openActionModal(item, 'revoke');
                            }}
                            disabled={actionLoadingId === rowId}
                          >
                            <RotateCcw size={12} color="#f59e0b" />
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={[styles.smallActionBtn, styles.smallActionBtnView]}
                          onPress={(e) => {
                            e.stopPropagation();
                            setDossierLeave(item);
                          }}
                        >
                          <Eye size={13} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.eyeIconBtn}
                        onPress={() => setDossierLeave(item)}
                        activeOpacity={0.7}
                        accessibilityLabel="View leave details"
                      >
                        <Eye size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
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
                  Submitted by {dossierLeave?.userId?.name || dossierLeave?.studentName || 'Student'} • Roll:{' '}
                  {dossierLeave?.userId?.rollNumber || dossierLeave?.rollNumber || 'STU'}
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

                {/* Student Profile Info */}
                <View style={styles.dossierSection}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.dossierSectionHeading}>Student Information</Text>
                    {dossierLeave.userId && (
                      <TouchableOpacity
                        style={styles.profileDetailsLink}
                        onPress={() => setQuickInfoStudent(dossierLeave.userId)}
                      >
                        <Info size={12} color="#8b5cf6" />
                        <Text style={styles.profileDetailsLinkText}>View Profile</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <DossierItem label="Student Name" value={dossierLeave.userId?.name || dossierLeave.studentName || 'Student'} />
                  <DossierItem label="Roll Number" value={dossierLeave.userId?.rollNumber || dossierLeave.rollNumber || '—'} />
                  <DossierItem label="Coordinated Class" value={coordClass} />
                  <DossierItem label="Email" value={dossierLeave.userId?.email || '—'} />
                </View>

                {/* Leave Schedule */}
                <View style={styles.dossierSection}>
                  <Text style={styles.dossierSectionHeading}>Leave Schedule</Text>
                  <DossierItem
                    label="Leave Type"
                    value={(dossierLeave.leaveType || dossierLeave.leave_type || 'General').toUpperCase()}
                  />
                  <DossierItem
                    label="Date Duration"
                    value={`${formatDateSafe(dossierLeave.startDate || dossierLeave.start_date)} – ${formatDateSafe(dossierLeave.endDate || dossierLeave.end_date)}`}
                  />
                  <DossierItem
                    label="Total Days"
                    value={`${dossierLeave.total_days || calculateDays(dossierLeave.startDate || dossierLeave.start_date, dossierLeave.endDate || dossierLeave.end_date)} day(s)`}
                  />
                </View>

                {/* Reason */}
                <View style={styles.dossierSection}>
                  <Text style={styles.dossierSectionHeading}>Reason for Absence</Text>
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonText}>{dossierLeave.reason || 'No specific description provided.'}</Text>
                  </View>
                </View>

                {/* Rejection Remarks */}
                {dossierLeave.rejectionReason && (
                  <View style={styles.dossierSection}>
                    <Text style={styles.dossierSectionHeading}>
                      {dossierLeave.status === 'rejected' ? 'Rejection Remarks' : 'Revocation Remarks'}
                    </Text>
                    <View style={styles.remarksAlertBox}>
                      <ShieldAlert size={16} color={dossierLeave.status === 'rejected' ? colors.danger : '#f59e0b'} />
                      <Text style={styles.remarksAlertText}>"{dossierLeave.rejectionReason}"</Text>
                    </View>
                  </View>
                )}

                {/* Supporting Document */}
                <View style={styles.dossierSection}>
                  <Text style={styles.dossierSectionHeading}>Supporting Document</Text>
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
                        onPress={() => handleApprove(dossierLeave)}
                      >
                        <Check size={16} color="#fff" />
                        <Text style={styles.dossierActionBtnText}>Approve Leave</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.dossierActionBtn, { backgroundColor: colors.danger }]}
                        onPress={() => openActionModal(dossierLeave, 'reject')}
                      >
                        <X size={16} color="#fff" />
                        <Text style={styles.dossierActionBtnText}>Reject Application</Text>
                      </TouchableOpacity>
                    </>
                  ) : dossierLeave.status === 'approved' ? (
                    <TouchableOpacity
                      style={[
                        styles.dossierActionBtn,
                        { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderColor: '#F59E0B' },
                      ]}
                      onPress={() => openActionModal(dossierLeave, 'revoke')}
                    >
                      <RotateCcw size={16} color="#F59E0B" />
                      <Text style={[styles.dossierActionBtnText, { color: '#F59E0B' }]}>Revoke Approval</Text>
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
                    ? 'Approve Student Leave'
                    : actionModal?.type === 'reject'
                    ? 'Reject Leave Application'
                    : 'Revoke Approved Leave'}
                </Text>
                <Text style={styles.reasonModalSubtitle}>
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
              style={styles.reasonInput}
              value={actionReason}
              onChangeText={setActionReason}
              placeholder={
                actionModal?.type === 'approve'
                  ? 'Add optional remarks (e.g. Approved with doctor cert)...'
                  : actionModal?.type === 'reject'
                  ? 'Enter reason for rejection (required)...'
                  : 'Enter reason for revoking approval (required)...'
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
      {/* 3. STUDENT QUICK INFO MODAL                                               */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(quickInfoStudent)}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickInfoStudent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quickInfoCard}>
            <View style={styles.quickInfoHeader}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {(quickInfoStudent?.name || 'S')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickInfoName}>{quickInfoStudent?.name || 'Student'}</Text>
                <Text style={styles.quickInfoRoll}>
                  Roll No: {quickInfoStudent?.rollNumber || quickInfoStudent?.roll_number || 'STU'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setQuickInfoStudent(null)} style={styles.modalCloseBtn}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickInfoBody}>
              <View style={styles.quickInfoItem}>
                <GraduationCap size={16} color="#8b5cf6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickInfoItemLabel}>Class / Department</Text>
                  <Text style={styles.quickInfoItemVal}>
                    {coordClass} • {quickInfoStudent?.departmentName || 'Computer Science'}
                  </Text>
                </View>
              </View>

              <View style={styles.quickInfoItem}>
                <Mail size={16} color="#8b5cf6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickInfoItemLabel}>Email</Text>
                  <Text style={styles.quickInfoItemVal}>{quickInfoStudent?.email || '—'}</Text>
                </View>
              </View>

              {quickInfoStudent?.phone && (
                <View style={styles.quickInfoItem}>
                  <Phone size={16} color="#8b5cf6" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quickInfoItemLabel}>Phone</Text>
                    <Text style={styles.quickInfoItemVal}>{quickInfoStudent.phone}</Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.quickInfoCloseBtn}
              onPress={() => setQuickInfoStudent(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickInfoCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 4. IN-APP DOCUMENT VIEWER MODAL                                           */}
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
    <Text style={styles.dossierItemValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  // Toast Feedback Banner
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  feedbackBannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.3)',
  },
  feedbackBannerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.3)',
  },
  feedbackBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },

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

  // Edge-to-Edge Table
  tableCard: {
    flex: 1,
    backgroundColor: 'transparent',
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
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cellTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: 130,
  },
  quickInfoBtn: {
    padding: 2,
  },
  cellTextSecondary: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  typeBadgeText: {
    fontSize: 9,
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
    maxWidth: 80,
  },

  // Eye Icon Button
  eyeIconBtn: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },

  // Tablet / Wide actions
  wideActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionBtnApprove: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  smallActionBtnReject: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  smallActionBtnRevoke: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  smallActionBtnView: {
    backgroundColor: '#1f2430',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
  },

  // Dossier Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  dossierModalCard: {
    backgroundColor: '#141824',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  dossierTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dossierSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  dossierStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  dossierStatusTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  dossierRejectionText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dossierSection: {
    marginBottom: 14,
    backgroundColor: '#181d2a',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dossierSectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  profileDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileDetailsLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  dossierItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  dossierItemLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  dossierItemValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  reasonBox: {
    backgroundColor: '#111520',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  reasonText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  remarksAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 6,
    padding: 10,
  },
  remarksAlertText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
    flex: 1,
    fontStyle: 'italic',
  },
  docAttachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    gap: 8,
  },
  docAttachmentText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
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
    marginTop: 6,
  },
  dossierActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 6,
  },
  dossierActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Action (Reason) Modal
  reasonModalCard: {
    backgroundColor: '#141824',
    borderRadius: radius.lg,
    padding: spacing.md,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    marginVertical: 'auto',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reasonModalSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  reasonInput: {
    backgroundColor: '#1a1f2e',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: colors.textPrimary,
    fontSize: 12,
    padding: 10,
    minHeight: 70,
    marginBottom: 14,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Quick Info Modal
  quickInfoCard: {
    backgroundColor: '#141824',
    borderRadius: radius.lg,
    padding: spacing.md,
    width: '90%',
    maxWidth: 380,
    alignSelf: 'center',
    marginVertical: 'auto',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#c4b5fd',
  },
  quickInfoName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  quickInfoRoll: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '600',
    marginTop: 1,
  },
  quickInfoBody: {
    gap: 10,
    marginBottom: 16,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#181d2a',
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  quickInfoItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  quickInfoItemVal: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  quickInfoCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickInfoCloseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

export default TeacherCoordinatorLeavesScreen;
