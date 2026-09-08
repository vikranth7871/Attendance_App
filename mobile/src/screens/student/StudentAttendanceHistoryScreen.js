import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  CalendarDays,
  RotateCcw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  ChevronRight,
  X,
  MapPin,
  User,
  Check,
  Tag,
} from 'lucide-react-native';
import {
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const { width } = Dimensions.get('window');

/**
 * Mini Circular SVG Attendance Gauge
 */
const MiniAttendanceGauge = ({ percentage = 0, size = 36, stroke = 3.5, color }) => {
  const r = size / 2;
  const normalizedRadius = r - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const validPct = Math.max(0, Math.min(100, Math.round(percentage)));
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={r}
          cy={r}
          r={normalizedRadius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={r}
          cy={r}
          r={normalizedRadius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color }}>{validPct}%</Text>
        </View>
      </View>
    </View>
  );
};

const StudentAttendanceHistoryScreen = ({ navigation }) => {
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state (mirroring web HistoryPage.jsx)
  const [startDate, setStartDate] = useState(''); // 'YYYY-MM-DD'
  const [endDate, setEndDate] = useState('');     // 'YYYY-MM-DD'
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [activePreset, setActivePreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'

  // Custom Date Modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/student/overview');
      setOverview(res.data || null);
      setHistory(res.data?.history || []);
    } catch (err) {
      console.error('Fetch student history error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Distinct subjects for filter selector
  const subjectOptions = useMemo(() => {
    const counts = {};
    (history || []).forEach((h) => {
      const name = h.subjectId?.subjectName || 'Unknown Subject';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [history]);

  // Client-side date and subject filtering (exact parity with web HistoryPage.jsx)
  const filtered = useMemo(() => {
    return (history || []).filter((record) => {
      const subName = record.subjectId?.subjectName || 'Unknown Subject';
      if (selectedSubject !== 'ALL' && subName !== selectedSubject) return false;

      if (!startDate && !endDate) return true;
      const recordDate = new Date(record.date);
      if (isNaN(recordDate.getTime())) return true;

      try {
        if (startDate && endDate) {
          return isWithinInterval(recordDate, {
            start: startOfDay(parseISO(startDate)),
            end: endOfDay(parseISO(endDate)),
          });
        }
        if (startDate) return recordDate >= startOfDay(parseISO(startDate));
        if (endDate) return recordDate <= endOfDay(parseISO(endDate));
      } catch {
        return true;
      }
      return true;
    });
  }, [history, startDate, endDate, selectedSubject]);

  const totalFiltered = filtered.length;
  const presentFiltered = filtered.filter((r) => r.status === 'present').length;
  const absentFiltered = filtered.filter((r) => r.status === 'absent').length;
  const leaveFiltered = filtered.filter((r) => r.status === 'leave').length;
  const attendancePct = totalFiltered > 0 ? Math.round((presentFiltered / totalFiltered) * 100) : 0;
  const pctColor = attendancePct >= 75 ? '#10b981' : attendancePct >= 60 ? '#f59e0b' : '#ef4444';
  const isFiltering = startDate || endDate || selectedSubject !== 'ALL';

  // Preset filter helper
  const applyPreset = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const formatted = format(now, 'yyyy-MM-dd');
      setStartDate(formatted);
      setEndDate(formatted);
    } else if (preset === 'WEEK') {
      setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'MONTH') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === 'CUSTOM') {
      setTempStartDate(startDate || format(now, 'yyyy-MM-dd'));
      setTempEndDate(endDate || format(now, 'yyyy-MM-dd'));
      setShowDateModal(true);
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSelectedSubject('ALL');
    setActivePreset('ALL');
  };

  const saveCustomDates = () => {
    setStartDate(tempStartDate.trim());
    setEndDate(tempEndDate.trim());
    setActivePreset('CUSTOM');
    setShowDateModal(false);
  };

  // Helper for human formatted dates
  const formatRecordDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return format(d, 'dd MMM yyyy');
    } catch {
      return String(dateStr);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <Header
        title="Attendance History"
        subtitle={`Overall: ${overview?.attendanceRate !== undefined ? `${overview.attendanceRate}%` : '—'}`}
        navigation={navigation}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => item._id || String(index)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.student}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* ── Page Section Title ── */}
            <View style={styles.pageTitleRow}>
              <View style={styles.pageTitleIconCircle}>
                <CalendarDays size={18} color="#6366f1" />
              </View>
              <Text style={styles.pageTitleText}>Attendance History</Text>
            </View>

            {/* ── Date & Filter Control Card ── */}
            <View style={[styles.filterPanelCard, shadows.md]}>
              {/* Header inside filter card */}
              <View style={styles.filterCardTopRow}>
                <View style={styles.filterTitleGroup}>
                  <Filter size={15} color="#818cf8" />
                  <Text style={styles.filterCardTitle}>Filters & Date Range</Text>
                </View>

                {isFiltering && (
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={handleReset}
                    activeOpacity={0.7}
                  >
                    <RotateCcw size={12} color="#dc2626" />
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Presets Row */}
              <View style={styles.presetsRow}>
                {[
                  { id: 'ALL', label: 'All Time' },
                  { id: 'TODAY', label: 'Today' },
                  { id: 'WEEK', label: 'Last 7 Days' },
                  { id: 'MONTH', label: 'This Month' },
                  { id: 'CUSTOM', label: 'Custom Range' },
                ].map((p) => {
                  const isActive = activePreset === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.presetChip, isActive && styles.presetChipActive]}
                      onPress={() => applyPreset(p.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Date Inputs Display */}
              <View style={styles.dateInputsRow}>
                <TouchableOpacity
                  style={styles.dateBox}
                  onPress={() => {
                    setTempStartDate(startDate || format(new Date(), 'yyyy-MM-dd'));
                    setTempEndDate(endDate || format(new Date(), 'yyyy-MM-dd'));
                    setShowDateModal(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.dateBoxLabel}>FROM DATE</Text>
                  <View style={styles.dateValueRow}>
                    <Calendar size={13} color={colors.textMuted} />
                    <Text style={styles.dateValueText}>
                      {startDate ? format(parseISO(startDate), 'dd/MM/yyyy') : 'Any Date'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateBox}
                  onPress={() => {
                    setTempStartDate(startDate || format(new Date(), 'yyyy-MM-dd'));
                    setTempEndDate(endDate || format(new Date(), 'yyyy-MM-dd'));
                    setShowDateModal(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.dateBoxLabel}>TO DATE</Text>
                  <View style={styles.dateValueRow}>
                    <Calendar size={13} color={colors.textMuted} />
                    <Text style={styles.dateValueText}>
                      {endDate ? format(parseISO(endDate), 'dd/MM/yyyy') : 'Any Date'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Subject Filter Pill Scroll */}
              <View style={styles.subjectFilterSection}>
                <Text style={styles.subjectFilterLabel}>FILTER BY SUBJECT</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subjectScrollContent}
                >
                  {/* All Subjects Pill */}
                  <TouchableOpacity
                    onPress={() => setSelectedSubject('ALL')}
                    activeOpacity={0.8}
                    style={styles.subjectPillTouchable}
                  >
                    {selectedSubject === 'ALL' ? (
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.subjectPillActive}
                      >
                        <Text style={styles.subjectPillTextActive}>All Subjects</Text>
                        <View style={styles.subjectBadgeActive}>
                          <Text style={styles.subjectBadgeTextActive}>{(history || []).length}</Text>
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.subjectPillInactive}>
                        <Text style={styles.subjectPillTextInactive}>All Subjects</Text>
                        <View style={styles.subjectBadgeInactive}>
                          <Text style={styles.subjectBadgeTextInactive}>{(history || []).length}</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Individual Subjects */}
                  {Object.entries(subjectOptions).map(([name, count]) => {
                    const isSubActive = selectedSubject === name;
                    return (
                      <TouchableOpacity
                        key={name}
                        onPress={() => setSelectedSubject(name)}
                        activeOpacity={0.8}
                        style={styles.subjectPillTouchable}
                      >
                        {isSubActive ? (
                          <LinearGradient
                            colors={['#6366f1', '#8b5cf6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.subjectPillActive}
                          >
                            <Text style={styles.subjectPillTextActive} numberOfLines={1}>
                              {name}
                            </Text>
                            <View style={styles.subjectBadgeActive}>
                              <Text style={styles.subjectBadgeTextActive}>{count}</Text>
                            </View>
                          </LinearGradient>
                        ) : (
                          <View style={styles.subjectPillInactive}>
                            <Text style={styles.subjectPillTextInactive} numberOfLines={1}>
                              {name}
                            </Text>
                            <View style={styles.subjectBadgeInactive}>
                              <Text style={styles.subjectBadgeTextInactive}>{count}</Text>
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* ── Summary & Circular Gauge Pill Row ── */}
              <View style={styles.summaryAnalyticsRow}>
                {/* % Pill Gauge Box */}
                <View
                  style={[
                    styles.gaugePillContainer,
                    {
                      backgroundColor: `${pctColor}15`,
                      borderColor: `${pctColor}40`,
                    },
                  ]}
                >
                  <MiniAttendanceGauge
                    percentage={attendancePct}
                    size={34}
                    stroke={3.5}
                    color={pctColor}
                  />
                  <View style={styles.gaugePillInfo}>
                    <Text style={[styles.gaugePillValue, { color: pctColor }]}>
                      {attendancePct}%
                    </Text>
                    <Text style={styles.gaugePillLabel}>ATTENDANCE</Text>
                  </View>
                </View>

                {/* Metric Summary Chips */}
                <View style={styles.summaryChipsGrid}>
                  <View style={styles.summaryChip}>
                    <Text style={[styles.summaryChipValue, { color: '#818cf8' }]}>
                      {totalFiltered}
                    </Text>
                    <Text style={styles.summaryChipLabel}>Total</Text>
                  </View>

                  <View style={styles.summaryChip}>
                    <Text style={[styles.summaryChipValue, { color: '#16a34a' }]}>
                      {presentFiltered}
                    </Text>
                    <Text style={styles.summaryChipLabel}>Present</Text>
                  </View>

                  <View style={styles.summaryChip}>
                    <Text style={[styles.summaryChipValue, { color: '#dc2626' }]}>
                      {absentFiltered}
                    </Text>
                    <Text style={styles.summaryChipLabel}>Absent</Text>
                  </View>

                  {leaveFiltered > 0 && (
                    <View style={styles.summaryChip}>
                      <Text style={[styles.summaryChipValue, { color: '#8b5cf6' }]}>
                        {leaveFiltered}
                      </Text>
                      <Text style={styles.summaryChipLabel}>Leave</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* ── Active-Filter Notice Banner ── */}
            {isFiltering && (
              <View style={styles.activeFilterNotice}>
                <CalendarDays size={14} color="#818cf8" />
                <Text style={styles.activeFilterNoticeText} numberOfLines={2}>
                  Showing {totalFiltered} record{totalFiltered !== 1 ? 's' : ''}
                  {startDate ? ` from ${format(parseISO(startDate), 'dd MMM yyyy')}` : ''}
                  {endDate ? ` to ${format(parseISO(endDate), 'dd MMM yyyy')}` : ''}
                  {selectedSubject !== 'ALL' ? ` · Subject: ${selectedSubject}` : ''}
                </Text>
              </View>
            )}

            {/* Table / List Header Title */}
            <View style={styles.listSectionHeader}>
              <Text style={styles.listSectionTitle}>Session Verification Logs</Text>
              <Text style={styles.listSectionSubtitle}>
                {totalFiltered} record{totalFiltered !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const status = (item.status || 'present').toLowerCase();
          const isPresent = status === 'present';
          const isAbsent = status === 'absent';
          const isLeave = status === 'leave';

          // Status colors & styles (parity with web)
          const statusStyle = isPresent
            ? {
                bg: 'rgba(22, 163, 74, 0.15)',
                color: '#16a34a',
                border: 'rgba(22, 163, 74, 0.35)',
                label: 'PRESENT',
                Icon: CheckCircle2,
              }
            : isLeave
            ? {
                bg: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: 'rgba(99, 102, 241, 0.35)',
                label: 'ON LEAVE',
                Icon: Clock,
              }
            : {
                bg: 'rgba(220, 38, 38, 0.15)',
                color: '#ef4444',
                border: 'rgba(220, 38, 38, 0.35)',
                label: 'ABSENT',
                Icon: XCircle,
              };

          // Verification method formatting (parity with web)
          const methodLabel =
            item.method === 'auto_absent'
              ? 'Auto-Absent (System)'
              : item.method === 'auto_leave'
              ? 'Auto-Leave (System)'
              : item.method === 'qr'
              ? 'QR Code Scan'
              : item.method === 'rfid'
              ? 'RFID Punch'
              : 'Manual Marking';

          const subjectName = item.subjectId?.subjectName || 'Unknown Subject';
          const timeSlotText = item.timeSlot || item.time || 'Scheduled Session';
          const roomText = item.roomNumber || 'C5-05';
          const teacherText = item.teacherName || 'Instructor';

          return (
            <View style={[styles.historyRecordCard, shadows.sm]}>
              {/* Card Top Row: Date & Status */}
              <View style={styles.recordTopRow}>
                <View style={styles.recordDateGroup}>
                  <Calendar size={13} color={colors.textSecondary} />
                  <Text style={styles.recordDateText}>{formatRecordDate(item.date)}</Text>
                </View>

                {/* Status Capsule Badge */}
                <View
                  style={[
                    styles.statusCapsule,
                    {
                      backgroundColor: statusStyle.bg,
                      borderColor: statusStyle.border,
                    },
                  ]}
                >
                  <statusStyle.Icon size={11} color={statusStyle.color} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusCapsuleText, { color: statusStyle.color }]}>
                    {statusStyle.label}
                  </Text>
                </View>
              </View>

              {/* Card Middle Row: Subject Title & Time Slot Pill */}
              <View style={styles.recordMiddleRow}>
                <Text style={styles.recordSubjectName} numberOfLines={1}>
                  {subjectName}
                </Text>
                <View style={styles.timeSlotPill}>
                  <Clock size={11} color="#818cf8" style={{ marginRight: 4 }} />
                  <Text style={styles.timeSlotText} numberOfLines={1}>
                    {timeSlotText}
                  </Text>
                </View>
              </View>

              {/* Card Bottom Row: Room, Teacher & Method */}
              <View style={styles.recordBottomRow}>
                <View style={styles.roomTeacherRow}>
                  <MapPin size={11} color={colors.textMuted} />
                  <Text style={styles.roomTeacherText} numberOfLines={1}>
                    Room: {roomText} · {teacherText}
                  </Text>
                </View>

                <View style={styles.methodTag}>
                  <Text style={styles.methodTagText} numberOfLines={1}>
                    {methodLabel}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              <CardSkeleton style={{ height: 100 }} />
              <CardSkeleton style={{ height: 100 }} />
              <CardSkeleton style={{ height: 100 }} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <CalendarDays size={42} color={colors.textMuted} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyTitle}>
                {isFiltering ? 'No Records Found' : 'No Attendance Records'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isFiltering
                  ? 'No session records matched your selected date or subject filters.'
                  : 'You do not have any logged attendance sessions yet.'}
              </Text>
              {isFiltering && (
                <TouchableOpacity style={styles.emptyResetBtn} onPress={handleReset}>
                  <RotateCcw size={13} color="#ffffff" />
                  <Text style={styles.emptyResetBtnText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: spacing.xxl * 2 }} />}
      />

      {/* ── Custom Date Range Modal ── */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, shadows.lg]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Custom Date Range</Text>
                <Text style={styles.modalSubtitle}>Filter records between specific dates</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDateModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>FROM DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 2026-09-01"
                  placeholderTextColor={colors.textMuted}
                  value={tempStartDate}
                  onChangeText={setTempStartDate}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>TO DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 2026-09-09"
                  placeholderTextColor={colors.textMuted}
                  value={tempEndDate}
                  onChangeText={setTempEndDate}
                  autoCapitalize="none"
                />
              </View>

              {/* Quick Actions inside Modal */}
              <View style={styles.modalQuickRow}>
                <TouchableOpacity
                  style={styles.modalQuickBtn}
                  onPress={() => {
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    setTempStartDate(todayStr);
                    setTempEndDate(todayStr);
                  }}
                >
                  <Text style={styles.modalQuickBtnText}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalQuickBtn}
                  onPress={() => {
                    setTempStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
                    setTempEndDate(format(new Date(), 'yyyy-MM-dd'));
                  }}
                >
                  <Text style={styles.modalQuickBtnText}>Last 7 Days</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalQuickBtn}
                  onPress={() => {
                    setTempStartDate('');
                    setTempEndDate('');
                  }}
                >
                  <Text style={[styles.modalQuickBtnText, { color: '#ef4444' }]}>Clear</Text>
                </TouchableOpacity>
              </View>

              {/* Apply CTA */}
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={saveCustomDates}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalApplyGradient}
                >
                  <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalApplyText}>Apply Date Filter</Text>
                </LinearGradient>
              </TouchableOpacity>
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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  headerBlock: {
    marginBottom: spacing.sm,
  },

  /* Section Title */
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  pageTitleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#818cf8',
    letterSpacing: -0.3,
  },

  /* Filter Panel Card */
  filterPanelCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },

  /* Presets Row */
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  presetChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: '#818cf8',
    fontWeight: '700',
  },

  /* Date Inputs Row */
  dateInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateBox: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    gap: 2,
  },
  dateBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  /* Subject Filter Section */
  subjectFilterSection: {
    marginTop: 2,
    gap: 5,
  },
  subjectFilterLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  subjectScrollContent: {
    gap: 6,
    paddingVertical: 2,
  },
  subjectPillTouchable: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  subjectPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  subjectPillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
  },
  subjectPillTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  subjectPillTextInactive: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subjectBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  subjectBadgeInactive: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  subjectBadgeTextActive: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  subjectBadgeTextInactive: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },

  /* Card Divider */
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },

  /* Summary & Circular Gauge Pill Row */
  summaryAnalyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gaugePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  gaugePillInfo: {
    justifyContent: 'center',
  },
  gaugePillValue: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 16,
  },
  gaugePillLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  summaryChipsGrid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    flexWrap: 'wrap',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: radius.full,
  },
  summaryChipValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  summaryChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },

  /* Active Filter Notice */
  activeFilterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginTop: spacing.sm,
  },
  activeFilterNoticeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#818cf8',
  },

  /* List Section Title */
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  listSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listSectionSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* History Record Card */
  historyRecordCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs + 2,
    gap: 8,
  },
  recordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusCapsuleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  recordMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  recordSubjectName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  timeSlotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeSlotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818cf8',
  },
  recordBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: spacing.xs,
  },
  roomTeacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  roomTeacherText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  methodTag: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  methodTagText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  emptyResetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalForm: {
    gap: spacing.md,
  },
  modalFieldGroup: {
    gap: 4,
  },
  modalFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  modalQuickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalQuickBtn: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalApplyBtn: {
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  modalApplyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  modalApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default StudentAttendanceHistoryScreen;
