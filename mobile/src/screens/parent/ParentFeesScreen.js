import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, CheckCircle, Clock, AlertTriangle, CreditCard } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const FEE_STATUS_CONFIG = {
  paid: { color: colors.success, label: 'Paid', icon: CheckCircle },
  partial: { color: colors.warning, label: 'Partially Paid', icon: Clock },
  pending: { color: colors.danger, label: 'Pending', icon: AlertTriangle },
  overdue: { color: colors.danger, label: 'Overdue', icon: AlertTriangle },
};

const ParentFeesScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFees = async () => {
    try {
      const { data: res } = await api.get('/parent/student-fees');
      setData(res);
    } catch (err) {
      console.error('Fees fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchFees(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchFees(); }, []);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Fee Details" subtitle={student?.name || 'Student'} />
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
              <Text style={[styles.amountValue, { color: '#fca5a5' }]}>₹{pendingAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {feeSummary.due_date && (
            <View style={styles.dueRow}>
              <Clock size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.dueText}>Due: {new Date(feeSummary.due_date).toLocaleDateString()}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Payment History */}
        <Text style={styles.sectionTitle}>Payment History</Text>
        {paymentHistory.length === 0 ? (
          <View style={styles.empty}>
            <CreditCard size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No payment history found</Text>
          </View>
        ) : (
          paymentHistory.map((pay, i) => (
            <View key={i} style={[styles.paymentCard, shadows.sm]}>
              <View style={styles.paymentLeft}>
                <CheckCircle size={18} color={colors.success} />
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAmount}>₹{parseFloat(pay.amount_paid).toLocaleString('en-IN')}</Text>
                  <Text style={styles.paymentDate}>
                    {pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentMethod}>{pay.payment_method || 'Online'}</Text>
                {pay.receipt_no && <Text style={styles.receiptNo}>#{pay.receipt_no}</Text>}
              </View>
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
  content: { padding: spacing.md },
  summaryCard: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  totalAmount: { ...typography.xl, ...typography.bold, color: '#fff' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full, marginBottom: spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: radius.full },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  amountLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  amountValue: { ...typography.base, ...typography.bold },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dueText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  sectionTitle: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  paymentCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paymentInfo: {},
  paymentAmount: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  paymentDate: { ...typography.xs, color: colors.textMuted },
  paymentRight: { alignItems: 'flex-end' },
  paymentMethod: { ...typography.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  receiptNo: { ...typography.xs, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.base, color: colors.textMuted },
});

export default ParentFeesScreen;
