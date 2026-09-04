import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  Download,
  Filter,
  Users,
  Search,
  BookOpen,
  School,
  CheckCircle2,
} from 'lucide-react-native';
import Papa from 'papaparse';
import api from '../api/client';
import { exportCsv } from '../utils/fileExporter';
import { colors, spacing, radius, typography, shadows } from '../styles/theme';

const ReportModal = ({ visible, onClose }) => {
  const [filterData, setFilterData] = useState({ classes: [], subjects: [] });
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedClass) params.classId = selectedClass;
      if (selectedSubject) params.subjectId = selectedSubject;

      const { data } = await api.get('/teacher/report', { params });
      if (data) {
        if (data.classes && data.subjects) {
          setFilterData({ classes: data.classes || [], subjects: data.subjects || [] });
        }
        setReport(Array.isArray(data.report) ? data.report : []);
      }
    } catch (err) {
      console.error('Error fetching teacher report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSubject]);

  useEffect(() => {
    if (visible) {
      loadReport();
    }
  }, [visible, loadReport]);

  const handleExportCSV = async () => {
    if (report.length === 0) {
      Alert.alert('No Data', 'No student records to export.');
      return;
    }

    setExporting(true);
    try {
      const rows = report.map((r) => ({
        'Student Name': r.studentName,
        'Roll Number': r.rollNumber || '—',
        'Class': r.className,
        'Subject': r.subjectName,
        'Total Classes': r.total,
        'Present': r.present,
        'Absent': r.absent,
        'Leave': r.leave || 0,
        'Attendance %': `${r.percentage}%`,
      }));

      const csv = Papa.unparse(rows);
      const filename = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
      const ok = await exportCsv(filename, csv);
      if (ok) Alert.alert('✅ Exported', `Attendance report exported: ${filename}`);
    } catch (err) {
      console.error('CSV export error:', err);
      Alert.alert('Export Failed', 'Could not export CSV file.');
    } finally {
      setExporting(false);
    }
  };

  const filtered = report.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.studentName || '').toLowerCase().includes(q) ||
      (r.rollNumber || '').toLowerCase().includes(q) ||
      (r.subjectName || '').toLowerCase().includes(q) ||
      (r.className || '').toLowerCase().includes(q)
    );
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, shadows.lg]}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <Users size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Class Attendance Report</Text>
                <Text style={styles.subtitle}>Filter and preview student attendance turnout</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Filters Row */}
          <View style={styles.filtersContainer}>
            <View style={styles.searchBar}>
              <Search size={14} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search student or roll..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Class filter horizontal chips */}
            {filterData.classes.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <TouchableOpacity
                  style={[styles.chip, !selectedClass && styles.chipActive]}
                  onPress={() => setSelectedClass('')}
                >
                  <Text style={[styles.chipText, !selectedClass && styles.chipTextActive]}>All Classes</Text>
                </TouchableOpacity>
                {filterData.classes.map((cls) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[styles.chip, selectedClass === cls.id && styles.chipActive]}
                    onPress={() => setSelectedClass(cls.id)}
                  >
                    <Text style={[styles.chipText, selectedClass === cls.id && styles.chipTextActive]}>
                      {cls.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Student Records List */}
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>Loading attendance records...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptySub}>No student attendance records match the selected filters.</Text>
            </View>
          ) : (
            <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
              {filtered.map((item, idx) => {
                const pct = parseFloat(item.percentage) || 0;
                const pctColor = pct >= 75 ? colors.success : pct >= 50 ? colors.warning : colors.danger;
                return (
                  <View key={idx} style={styles.recordItem}>
                    <View style={styles.recordLeft}>
                      <Text style={styles.recordName}>{item.studentName}</Text>
                      <Text style={styles.recordMeta}>
                        Roll: {item.rollNumber || '—'} • {item.className}
                      </Text>
                      <Text style={styles.recordSubj}>{item.subjectName}</Text>
                    </View>
                    <View style={styles.recordRight}>
                      <View style={[styles.pctBadge, { backgroundColor: pctColor + '20' }]}>
                        <Text style={[styles.pctText, { color: pctColor }]}>{pct}%</Text>
                      </View>
                      <Text style={styles.countText}>
                        {item.present}/{item.total} sessions
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Modal Footer with Export CSV Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.exportBtn, exporting && styles.btnDisabled]}
              onPress={handleExportCSV}
              disabled={exporting || filtered.length === 0}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Download size={16} color="#fff" />
                  <Text style={styles.exportBtnText}>
                    Download CSV ({filtered.length} Students)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
    display: 'flex',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  closeBtn: {
    padding: 6,
  },
  filtersContainer: {
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '55',
    gap: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...typography.xs,
    color: colors.textPrimary,
    paddingVertical: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  loaderContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loaderText: {
    ...typography.xs,
    color: colors.textMuted,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    ...typography.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: spacing.sm,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '44',
  },
  recordLeft: {
    flex: 1,
  },
  recordName: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  recordMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  recordSubj: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  recordRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '800',
  },
  countText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    ...typography.sm,
    ...typography.bold,
    color: '#fff',
  },
});

export default ReportModal;

