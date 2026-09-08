import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, CheckCircle, Clock, AlertTriangle, CreditCard, Download } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText, generateReceiptText } from '../../utils/fileExporter';

const FEE_STATUS_CONFIG = {
  paid: { color: colors.success, label: 'Paid', icon: CheckCircle },
  partial: { color: colors.warning, label: 'Partially Paid', icon: Clock },
  pending: { color: colors.danger, label: 'Pending', icon: AlertTriangle },
  overdue: { color: colors.danger, label: 'Overdue', icon: AlertTriangle },
};

const ParentFeesScreen = ({ route, navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(route?.params?.studentId || null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChildren = async () => {
    try {
      const { data: kids } = await api.get('/parent/children');
      const list = Array.isArray(kids) ? kids : [];
      setChildren(list);
      if (!selectedChildId && list.length > 0) {
        setSelectedChildId(route?.params?.studentId || list[0].id || list[0].studentId);
      }
    } catch (err) {
      console.error('Fees fetch children error:', err);
    }
  };

  const fetchFees = async (childId = selectedChildId) => {
    try {
      const url = childId ? `/parent/student-fees?studentId=${childId}` : '/parent/student-fees';
      const { data: res } = await api.get(url);
      setData(res);
    } catch (err) {
      console.error('Fees fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    fetchFees(selectedChildId);
  }, [selectedChildId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
    fetchFees(selectedChildId);
  }, [selectedChildId]);

  if (loading) return <FullPageLoader message="Loading fee details..." />;

  const feeSummary = data?.feeSummary || {};
  const paymentHistory = data?.paymentHistory || [];
  const student = data?.student;

  const statusCfg = FEE_STATUS_CONFIG[feeSummary.status] || FEE_STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  const totalAmount = parseFloat(feeSummary.total_amount) || 0;
  const paidAmount = parseFloat(feeSummary.paid_amount) || 0;
  const pendingAmount = parseFloat(feeSummary.pending_amount) || 0;
  const paidPct = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const handleDownloadReceipt = async (payment) => {
    const receiptText = generateReceiptText({
      receiptNo: payment.receipt_no || payment.id,
      studentName: student?.name,
      amount: payment.amount_paid,
      date: payment.payment_date,
      method: payment.payment_method,
      balance: pendingAmount,
    });

    const success = await exportText(
      `Receipt_${payment.receipt_no || 'Fee'}.txt`,
      receiptText,
      'text/plain'
    );
    if (success) {
      Alert.alert('✅ Downloaded', 'Official payment receipt downloaded and ready to share.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Fee Invoices" subtitle={student?.name || 'Student'} />

      {/* Child Switcher Tabs */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childFilterRow}>
          {children.map((k) => {
            const kidId = k.id || k.studentId || k._id;
            const isSel = selectedChildId && String(selectedChildId) === String(kidId);
            return (
              <TouchableOpacity
                key={kidId}
                style={[styles.childChip, isSel && styles.childChipActive]}
                onPress={() => setSelectedChildId(kidId)}
              >
                <Text style={[styles.childChipText, isSel && styles.childChipTextActive]}>{k.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
      >
        {/* Fee Summary Card */}
        <LinearGradient colors={colors.gradientParent} style={[styles.summaryCard, shadows.md]}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Total Fee</Text>
              <Text style={styles.totalAmount}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusCfg.color + '33' }]}>
              <StatusIcon size={13} color={statusCfg.color} />
              <Text style={[styles.statusPillText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(paidPct, 100)}%` }]} />
          </View>

          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Paid</Text>
              <Text style={[styles.amountValue, { color: '#86efac' }]}>₹{paidAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amountLabel}>Pending</Text>
              <Text style={[styles.amountValue, { color: pendingAmount > 0 ? '#fca5a5' : '#86efac' }]}>
                ₹{pendingAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {feeSummary.due_date && (
            <View style={styles.dueRow}>
              <Clock size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.dueText}>Due Date: {new Date(feeSummary.due_date).toLocaleDateString()}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Payment History */}
        <Text style={styles.sectionTitle}>Payment History</Text>
        {paymentHistory.length === 0 ? (
          <View style={styles.empty}>
            <CreditCard size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No payment records found</Text>
          </View>
        ) : (
          paymentHistory.map((p, i) => (
            <View key={p.id || i} style={[styles.paymentCard, shadows.sm]}>
              <View style={styles.paymentCardTop}>
                <View style={styles.paymentLeft}>
                  <CheckCircle size={18} color={colors.success} />
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentAmount}>₹{parseFloat(p.amount_paid).toLocaleString('en-IN')}</Text>
                    <Text style={styles.paymentDate}>{new Date(p.payment_date).toLocaleDateString()}</Text>
                  </View>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentMethod}>{p.payment_method || 'Online'}</Text>
                  {p.receipt_no && (
                    <Text style={styles.receiptNo}>#{p.receipt_no}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => handleDownloadReceipt(p)}
                activeOpacity={0.8}
              >
                <Download size={13} color={colors.parent} />
                <Text style={styles.downloadBtnText}>Download Receipt</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  childFilterRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs },
  childChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.bgCard, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  childChipActive: { backgroundColor: colors.parent + '22', borderColor: colors.parent },
  childChipText: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  childChipTextActive: { color: colors.parent, fontWeight: '700' },
  content: { padding: spacing.md },
  summaryCard: {
    borderRadius: radius.xl, padding: spacing.lg,
    marginBottom: spacing.md, gap: spacing.sm,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { ...typography.xs, color: 'rgba(255,255,255,0.8)' },
  totalAmount: { ...typography.xxl, ...typography.bold, color: '#fff' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  statusPillText: { ...typography.xs, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: radius.full },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountLabel: { ...typography.xs, color: 'rgba(255,255,255,0.7)' },
  amountValue: { ...typography.base, ...typography.bold, marginTop: 2 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText: { ...typography.xs, color: 'rgba(255,255,255,0.8)' },
  sectionTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginVertical: spacing.sm },
  paymentCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  paymentCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paymentInfo: {},
  paymentAmount: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  paymentDate: { ...typography.xs, color: colors.textMuted },
  paymentRight: { alignItems: 'flex-end' },
  paymentMethod: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  receiptNo: { ...typography.xs, color: colors.textMuted },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 6, backgroundColor: colors.parent + '15',
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.parent + '33',
    marginTop: 4,
  },
  downloadBtnText: { ...typography.xs, color: colors.parent, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.sm, color: colors.textMuted },
});

export default ParentFeesScreen;
