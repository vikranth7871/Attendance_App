import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText, Plus, Clock, AlertCircle, Paperclip, X,
  UploadCloud, Info, CheckCircle2, ShieldAlert
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Header from '../../components/Header';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const LEAVE_TYPES = ['Medical', 'Casual', 'Emergency', 'Personal', 'Other'];
const STATUS_COLORS = {
  pending: colors.warning,
  approved: colors.success,
  rejected: colors.danger,
  revoked: colors.textMuted
};

const StudentLeaveScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [viewingDocUrl, setViewingDocUrl] = useState(null);
  const [viewingDocTitle, setViewingDocTitle] = useState('');

  const [form, setForm] = useState({
    leaveType: 'Medical',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchLeaves = async () => {
    try {
      const { data } = await api.get('/leave/my-leaves');
      setLeaves(data?.leaves || data || []);
    } catch (err) {
      console.error('Leave fetch error:', err);
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
    }
  };

  const handleSubmit = async () => {
    if (!form.startDate.trim() || !form.endDate.trim() || !form.reason.trim()) {
      Alert.alert('Missing Fields', 'Please fill in start date, end date, and reason.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('leaveType', form.leaveType);
      formData.append('startDate', form.startDate.trim());
      formData.append('endDate', form.endDate.trim());
      formData.append('reason', form.reason.trim());

      if (attachment) {
        formData.append('document', {
          uri: attachment.uri,
          name: attachment.name || 'proof.pdf',
          type: attachment.mimeType || 'application/octet-stream',
        });
      }

      await api.post('/leave/apply', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowForm(false);
      setForm({ leaveType: 'Medical', startDate: '', endDate: '', reason: '' });
      setAttachment(null);
      Alert.alert('✅ Submitted', 'Your leave application has been submitted to your coordinator.');
      fetchLeaves();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = leaves.filter((l) => (l.status || '').toLowerCase() === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Leave Applications"
        subtitle={`${pendingCount} pending review`}
        rightAction={
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <TouchableOpacity style={styles.guideBtn} onPress={() => setShowGuidelines(true)}>
              <Info size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
              <Plus size={18} color={colors.student} />
            </TouchableOpacity>
          </View>
        }
        showLogout={false}
      />

      <FlatList
        data={leaves}
        keyExtractor={(item, i) => item.id?.toString() || item._id?.toString() || i.toString()}
        renderItem={({ item }) => {
          const statusKey = (item.status || '').toLowerCase();
          const statusColor = STATUS_COLORS[statusKey] || colors.textMuted;
          const docUrl = item.documentUrl || item.document_url || item.document;
          const typeName = item.leaveType || item.leave_type || 'Leave';
          const startDate = item.startDate || item.start_date;
          const endDate = item.endDate || item.end_date;

          return (
            <View style={[styles.leaveCard, shadows.sm]}>
              <View style={styles.cardHeader}>
                <Text style={styles.leaveType}>{typeName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <Clock size={13} color={colors.textMuted} />
                <Text style={styles.dateText}>
                  {startDate ? new Date(startDate).toLocaleDateString() : '—'} → {endDate ? new Date(endDate).toLocaleDateString() : '—'}
                </Text>
              </View>

              {item.reason ? (
                <Text style={styles.reason} numberOfLines={3}>{item.reason}</Text>
              ) : null}

              {docUrl ? (
                <TouchableOpacity
                  style={styles.docBtn}
                  onPress={() => {
                    const fullUrl = docUrl.startsWith('http') ? docUrl : `${api.defaults.baseURL.replace('/api', '')}${docUrl.startsWith('/') ? '' : '/'}${docUrl}`;
                    setViewingDocUrl(fullUrl);
                    setViewingDocTitle(`${typeName} Proof Attachment`);
                  }}
                >
                  <Paperclip size={13} color={colors.student} />
                  <Text style={styles.docBtnText}>View Attached Proof</Text>
                </TouchableOpacity>
              ) : null}

              {item.rejection_reason || item.rejectionReason ? (
                <View style={styles.rejectNote}>
                  <AlertCircle size={13} color={colors.danger} />
                  <Text style={styles.rejectText}>{item.rejection_reason || item.rejectionReason}</Text>
                </View>
              ) : null}
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.student} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FileText size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No leave applications recorded yet</Text>
            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.applyBtnText}>Apply Now</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Leave Application Modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.sheet} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Leave Category</Text>
            <View style={styles.typeRow}>
              {LEAVE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.leaveType === t && styles.typeChipActive]}
                  onPress={() => setForm((f) => ({ ...f, leaveType: t }))}
                >
                  <Text style={[styles.typeChipText, form.leaveType === t && { color: colors.student }]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Start Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.startDate}
              onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))}
              placeholder="e.g. 2025-04-10"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>End Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.endDate}
              onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))}
              placeholder="e.g. 2025-04-12"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Reason & Details *</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={form.reason}
              onChangeText={(v) => setForm((f) => ({ ...f, reason: v }))}
              placeholder="Detail reasons for absence..."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            {/* Medical Proof / Supporting Attachment */}
            <Text style={styles.label}>Supporting Proof (Medical Cert / Letter)</Text>
            {attachment ? (
              <View style={styles.attachedFileRow}>
                <Paperclip size={16} color={colors.student} />
                <Text style={styles.attachedFileName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <TouchableOpacity onPress={() => setAttachment(null)}>
                  <X size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument}>
                <UploadCloud size={18} color={colors.student} />
                <Text style={styles.uploadBtnText}>Attach Document or Photo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Application</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Guidelines Modal */}
      <Modal visible={showGuidelines} transparent animationType="fade" onRequestClose={() => setShowGuidelines(false)}>
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
                <CheckCircle2 size={16} color={colors.student} />
                <Text style={styles.guideText}>
                  Leaves exceeding <Text style={{ fontWeight: '700', color: colors.textPrimary }}>3 consecutive days</Text> require coordinator and HoD validation.
                </Text>
              </View>

              <View style={styles.guideItem}>
                <CheckCircle2 size={16} color={colors.student} />
                <Text style={styles.guideText}>
                  Medical leaves must include a verified physician certificate or hospital admission discharge summary.
                </Text>
              </View>

              <View style={styles.guideItem}>
                <CheckCircle2 size={16} color={colors.student} />
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

      {/* Universal Document Viewer */}
      <DocumentViewerModal
        visible={!!viewingDocUrl}
        documentUrl={viewingDocUrl}
        title={viewingDocTitle}
        onClose={() => setViewingDocUrl(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  addBtn: { padding: spacing.sm, backgroundColor: colors.student + '22', borderRadius: radius.md },
  guideBtn: { padding: spacing.sm, backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  list: { padding: spacing.md },
  leaveCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  leaveType: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  dateText: { ...typography.sm, color: colors.textSecondary },
  reason: { ...typography.sm, color: colors.textMuted, fontStyle: 'italic', marginBottom: 6 },
  docBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: colors.student + '15', borderRadius: radius.sm,
    alignSelf: 'flex-start', marginTop: 4, marginBottom: 4,
  },
  docBtnText: { ...typography.xs, color: colors.student, fontWeight: '700' },
  rejectNote: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, backgroundColor: colors.danger + '11',
    padding: 6, borderRadius: radius.sm,
  },
  rejectText: { ...typography.xs, color: colors.danger, flex: 1 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  applyBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.student, borderRadius: radius.md },
  applyBtnText: { ...typography.sm, ...typography.bold, color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  sheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.lg,
    maxHeight: '90%', borderWidth: 1, borderColor: colors.border,
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  label: { ...typography.xs, color: colors.textSecondary, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  typeChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.md, backgroundColor: colors.bgPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  typeChipActive: { borderColor: colors.student, backgroundColor: colors.student + '15' },
  typeChipText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  input: {
    backgroundColor: colors.bgPrimary, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.sm, color: colors.textPrimary,
    marginBottom: spacing.md, fontSize: 14,
  },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderWidth: 1, borderColor: colors.student,
    borderStyle: 'dashed', borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  uploadBtnText: { ...typography.sm, color: colors.student, fontWeight: '600' },
  attachedFileRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.bgPrimary, padding: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  attachedFileName: { ...typography.xs, color: colors.textPrimary, flex: 1 },
  submitBtn: {
    backgroundColor: colors.student, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.xs,
  },
  submitBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
  guidelineCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: colors.border,
  },
  guideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  guideHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  guideTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  guideBody: { maxHeight: 260, marginBottom: spacing.md },
  guideItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginBottom: spacing.sm },
  guideText: { ...typography.sm, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  guideDismissBtn: {
    backgroundColor: colors.student, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center',
  },
  guideDismissText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default StudentLeaveScreen;
