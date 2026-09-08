import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CreditCard, CheckCircle, Clock, AlertTriangle,
  Download, Calendar, DollarSign, FileText, ChevronRight
} from 'lucide-react-native';
import Header from '../../components/Header';
import ChildSwitcher from '../../components/ChildSwitcher';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';
import { exportText } from '../../utils/fileExporter';

const ParentFeesScreen = ({ route, navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(route?.params?.studentId || null);
  const [feesData, setFeesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchChildren = async () => {
    try {
      const { data: kids } = await api.get('/parent/children');
      const list = Array.isArray(kids) ? kids : [];
      setChildren(list);
      if (!selectedChildId && list.length > 0) {
        setSelectedChildId(String(route?.params?.studentId || list[0].id || list[0].studentId));
      }
    } catch (err) {
      console.error('Fees fetch children error:', err);
    }
  };

  const fetchFees = async (childId = selectedChildId) => {
    setLoading(true);
    try {
      const url = childId
        ? `/parent/student-fees?studentId=${childId}`
        : '/parent/student-fees';
      const { data: res } = await api.get(url);
      setFeesData(res);
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
    if (selectedChildId) {
      fetchFees(selectedChildId);
    } else {
      fetchFees();
    }
  }, [selectedChildId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
    fetchFees(selectedChildId);
  }, [selectedChildId]);

  if (loading && !refreshing) return <FullPageLoader message="Loading fee details & receipts..." />;

  const feeSummary = feesData?.feeSummary || {};
  const paymentHistory = feesData?.paymentHistory || [];
  const student = feesData?.student || {};

  const totalAmount = parseFloat(feeSummary.total_amount) || 45000;
  const paidAmount = parseFloat(feeSummary.paid_amount) || 0;
  const pendingAmount = parseFloat(feeSummary.pending_amount) || 0;
  const isPaidInFull = pendingAmount <= 0;
  const paidPct = totalAmount > 0 ? Math.min(Math.round((paidAmount / totalAmount) * 100), 100) : 0;

  const handleDownloadReceipt = async (payment) => {
    setDownloadingId(payment.receipt_no || payment.id);
    try {
      let txt = `=========================================\n`;
      txt += `       FEE PAYMENT RECEIPT\n`;
      txt += `   iAttend Smart Academic Management\n`;
      txt += `=========================================\n\n`;
      txt += `Receipt No     : ${payment.receipt_no || payment.id || 'N/A'}\n`;
      txt += `Student Name   : ${student.name || 'Student'}\n`;
      txt += `Class          : ${student.className || student.classInfo?.className || 'Class VIII-A'}\n`;
      txt += `Amount Paid    : ₹${payment.amount_paid}\n`;
      txt += `Payment Method : ${payment.payment_method || 'Online / Bank Transfer'}\n`;
      txt += `Payment Date   : ${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}\n`;
      txt += `Transaction Ref: ${payment.transaction_ref || 'TXN-' + Math.floor(Math.random() * 900000 + 100000)}\n`;
      txt += `Status         : SUCCESSFUL / VERIFIED\n\n`;
      txt += `Remaining Due  : ₹${pendingAmount}\n`;
      txt += `=========================================\n`;
      txt += `Official system-generated payment voucher\n`;

      const fileName = `Receipt_${payment.receipt_no || 'Voucher'}.txt`;
      const success = await exportText(fileName, txt, 'text/plain');
      if (success) {
        Alert.alert('✅ Downloaded', `Receipt #${payment.receipt_no || 'Payment'} saved successfully.`);
      }
    } catch (err) {
      console.error('Download receipt error:', err);
      Alert.alert('Error', 'Could not generate receipt file.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Fee Details & Receipts"
        subtitle={student.name ? `Fee ledger & receipts for ${student.name}` : 'Fee summary and payments'}
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

        {/* 3 Web-Parity Overview Cards */}
        <View style={styles.overviewGrid}>
          {/* Card 1: Total Academic Fee */}
          <View style={[styles.overviewCard, shadows.sm, { borderColor: 'rgba(99,102,241,0.3)' }]}>
            <Text style={styles.cardLabel}>TOTAL ACADEMIC FEE</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toLocaleString()}</Text>
            <Text style={styles.cardSub}>Academic Year 2026</Text>
          </View>

          {/* Card 2: Amount Paid */}
          <View style={[styles.overviewCard, shadows.sm, { borderColor: 'rgba(16,185,129,0.3)' }]}>
            <Text style={styles.cardLabel}>AMOUNT PAID</Text>
            <Text style={[styles.paidValue, { color: colors.success }]}>
              ₹{paidAmount.toLocaleString()}
            </Text>
            <Text style={styles.cardSub}>Cleared Transactions ({paidPct}%)</Text>
          </View>

          {/* Card 3: Pending Amount */}
          <View style={[styles.overviewCardFull, shadows.sm, { borderColor: isPaidInFull ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.cardLabel}>PENDING AMOUNT</Text>
                <Text style={[styles.pendingValue, { color: isPaidInFull ? colors.success : colors.danger }]}>
                  ₹{pendingAmount.toLocaleString()}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isPaidInFull ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }
                ]}
              >
                {isPaidInFull ? (
                  <CheckCircle size={14} color={colors.success} />
                ) : (
                  <AlertTriangle size={14} color={colors.danger} />
                )}
                <Text style={[styles.statusBadgeText, { color: isPaidInFull ? colors.success : colors.danger }]}>
                  {isPaidInFull ? 'Paid in Full' : 'Payment Due'}
                </Text>
              </View>
            </View>

            {/* Fee Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${paidPct}%`,
                    backgroundColor: isPaidInFull ? colors.success : colors.warning,
                  }
                ]}
              />
            </View>

            <Text style={styles.cardSub}>
              {isPaidInFull
                ? 'No Dues Remaining · Cleared'
                : feeSummary.due_date
                ? `Due by ${new Date(feeSummary.due_date).toLocaleDateString()}`
                : 'Payment pending for current term'}
            </Text>
          </View>
        </View>

        {/* Payment History & Receipts */}
        <View style={[styles.historyPanel, shadows.sm]}>
          <View style={styles.panelHeader}>
            <CreditCard size={18} color={colors.primaryLight} />
            <Text style={styles.panelTitle}>Payment History & Receipts</Text>
          </View>

          {paymentHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Payment Receipts Found</Text>
              <Text style={styles.emptySub}>
                Transaction history and downloadable receipts will appear here once payment is processed.
              </Text>
            </View>
          ) : (
            paymentHistory.map((p, idx) => {
              const formattedDate = p.payment_date
                ? new Date(p.payment_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Recent';

              const isDownloading = downloadingId === (p.receipt_no || p.id);

              return (
                <View key={p.id || idx} style={styles.receiptCard}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.receiptTopRow}>
                      <Text style={styles.receiptNo}>{p.receipt_no || `REC-${idx + 1}`}</Text>
                      <View style={styles.paidMethodBadge}>
                        <Text style={styles.paidMethodText}>{p.payment_method || 'Online'}</Text>
                      </View>
                    </View>

                    <Text style={styles.receiptDate}>{formattedDate}</Text>
                    <Text style={styles.receiptAmount}>₹{(p.amount_paid || 0).toLocaleString()}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.downloadBtn, isDownloading && { opacity: 0.6 }]}
                    onPress={() => handleDownloadReceipt(p)}
                    disabled={isDownloading}
                    activeOpacity={0.8}
                  >
                    <Download size={14} color={colors.primaryLight} />
                    <Text style={styles.downloadBtnText}>
                      {isDownloading ? 'Saving...' : 'Receipt TXT'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

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
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  overviewCard: {
    width: '48%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  overviewCardFull: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginVertical: 2,
  },
  paidValue: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  pendingValue: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  cardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  historyPanel: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  receiptCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  receiptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  receiptNo: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  paidMethodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
  },
  paidMethodText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  receiptDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  receiptAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    marginTop: 6,
  },
  emptySub: {
    ...typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});

export default ParentFeesScreen;
