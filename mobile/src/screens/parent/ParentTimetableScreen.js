import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ParentTimetableScreen = ({ navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [academicData, setAcademicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDay, setActiveDay] = useState('Monday');

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      const kids = Array.isArray(data) ? data : [];
      setChildren(kids);
      if (kids.length > 0 && !selectedChild) {
        setSelectedChild(kids[0]);
      }
    } catch (err) {
      console.error('Fetch children error:', err);
    }
  };

  const fetchTimetable = async (childId) => {
    if (!childId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/parent/student-academic?studentId=${childId}`);
      setAcademicData(data);
    } catch (err) {
      console.error('Fetch timetable error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchChildren(); }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchTimetable(selectedChild.id);
    }
  }, [selectedChild]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedChild) fetchTimetable(selectedChild.id);
    else fetchChildren();
  }, [selectedChild]);

  const allSlots = academicData?.timetable || [];
  const daySlots = allSlots.filter(s => {
    const d = s.dayOfWeek || s.day_of_week || '';
    return d.toLowerCase() === activeDay.toLowerCase();
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Class Timetable"
        subtitle={selectedChild ? `${selectedChild.name}'s Schedule` : 'Weekly schedule'}
        navigation={navigation}
      />

      {/* Multi-Child selector */}
      {children.length > 1 && (
        <View style={styles.childrenBar}>
          <Text style={styles.childrenBarLabel}>Child:</Text>
          {children.map(child => (
            <TouchableOpacity
              key={child.id}
              style={[styles.childChip, selectedChild?.id === child.id && styles.childChipActive]}
              onPress={() => setSelectedChild(child)}
            >
              <User size={13} color={selectedChild?.id === child.id ? '#fff' : colors.textSecondary} />
              <Text style={[styles.childChipText, selectedChild?.id === child.id && styles.childChipTextActive]}>
                {child.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Day Selector Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
        {DAYS.map(day => (
          <TouchableOpacity
            key={day}
            style={[styles.dayTab, activeDay === day && styles.dayTabActive]}
            onPress={() => setActiveDay(day)}
          >
            <Text style={[styles.dayTabText, activeDay === day && styles.dayTabTextActive]}>
              {day.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={daySlots}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item, index }) => (
            <View style={[styles.slotCard, shadows.sm]}>
              <View style={styles.periodBadge}>
                <Text style={styles.periodNum}>{index + 1}</Text>
              </View>

              <View style={styles.slotInfo}>
                <Text style={styles.subjectName}>{item.subjectName || item.subject_name}</Text>
                {item.teacherName && (
                  <View style={styles.metaRow}>
                    <User size={13} color={colors.textMuted} />
                    <Text style={styles.metaText}>{item.teacherName}</Text>
                  </View>
                )}
                <View style={styles.timeRoomRow}>
                  <View style={styles.metaRow}>
                    <Clock size={13} color={colors.parent} />
                    <Text style={[styles.metaText, { color: colors.parent, fontWeight: '600' }]}>
                      {item.timeSlot || `${item.startTime || '09:00'} - ${item.endTime || '10:00'}`}
                    </Text>
                  </View>
                  {item.roomNumber && (
                    <View style={styles.metaRow}>
                      <MapPin size={13} color={colors.textMuted} />
                      <Text style={styles.metaText}>Room {item.roomNumber}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Calendar size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Classes on {activeDay}</Text>
              <Text style={styles.emptySub}>No periods are scheduled for this day.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  childrenBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  childrenBarLabel: { ...typography.xs, color: colors.textMuted, marginRight: 2 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  childChipActive: { backgroundColor: colors.parent, borderColor: colors.parent },
  childChipText: { ...typography.xs, color: colors.textSecondary },
  childChipTextActive: { color: '#fff', fontWeight: '700' },
  dayScroll: { maxHeight: 50, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayScrollContent: { paddingHorizontal: spacing.md, paddingVertical: 8, gap: spacing.xs },
  dayTab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  dayTabActive: { backgroundColor: colors.parent + '22', borderColor: colors.parent },
  dayTabText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  dayTabTextActive: { color: colors.parent, fontWeight: '700' },
  list: { padding: spacing.md },
  slotCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  periodBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.parent + '18', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  periodNum: { ...typography.sm, ...typography.bold, color: colors.parent },
  slotInfo: { flex: 1 },
  subjectName: { ...typography.base, ...typography.bold, color: colors.textPrimary, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { ...typography.xs, color: colors.textSecondary },
  timeRoomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.base, ...typography.semibold, color: colors.textSecondary },
  emptySub: { ...typography.sm, color: colors.textMuted },
});

export default ParentTimetableScreen;
