import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity, Shield, UserCheck, Clock, FileText, CheckCircle,
  AlertTriangle, Key
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ACTION_ICONS = {
  login: { icon: Key, color: colors.primary },
  attendance: { icon: Clock, color: colors.success },
  leave: { icon: FileText, color: colors.warning },
  user: { icon: UserCheck, color: colors.student },
  security: { icon: Shield, color: colors.danger },
  default: { icon: Activity, color: colors.textSecondary },
};

const SystemActivityScreen = ({ navigation }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchActivity = async () => {
    try {
      const { data } = await api.get('/admin/activity');
      setActivities(Array.isArray(data) ? data : data?.activities || []);
    } catch (err) {
      console.error('Fetch activity error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchActivity(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchActivity(); }, []);

  const FILTERS = [
    { key: 'all', label: 'All Events' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'leave', label: 'Leaves' },
    { key: 'user', label: 'User Changes' },
    { key: 'login', label: 'Logins' },
  ];

  const filtered = activities.filter(a => {
    if (filter === 'all') return true;
    const type = (a.type || a.action || '').toLowerCase();
    return type.includes(filter);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="System Activity & Audit"
        subtitle="Real-time institutional activity logs"
        navigation={navigation}
      />

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={item => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
        />
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => {
            const actType = (item.type || item.action || 'default').toLowerCase();
            const config = ACTION_ICONS[actType] || ACTION_ICONS.default;
            const IconComponent = config.icon;
            return (
              <View style={[styles.card, shadows.sm]}>
                <View style={[styles.iconBox, { backgroundColor: config.color + '22' }]}>
                  <IconComponent size={18} color={config.color} />
                </View>
                <View style={styles.body}>
                  <View style={styles.topRow}>
                    <Text style={styles.actorName}>{item.actor_name || item.user_name || 'System Admin'}</Text>
                    <Text style={styles.timeText}>
                      {item.timestamp || item.created_at ? new Date(item.timestamp || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </Text>
                  </View>
                  <Text style={styles.actionText}>{item.description || item.message || item.action || 'Activity recorded'}</Text>
                  {item.role && (
                    <View style={[styles.roleBadge, { backgroundColor: colors.bgElevated }]}>
                      <Text style={styles.roleText}>{item.role}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Activity size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Activity Logs</Text>
              <Text style={styles.emptySub}>Events will appear here in real-time</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  filterRow: { borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bgCard, marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  filterChipText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: colors.primary },
  list: { padding: spacing.md },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  iconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  actorName: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  timeText: { ...typography.xs, color: colors.textMuted },
  actionText: { ...typography.xs, color: colors.textSecondary, lineHeight: 18 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, marginTop: 4 },
  roleText: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.base, ...typography.semibold, color: colors.textSecondary },
  emptySub: { ...typography.sm, color: colors.textMuted },
});

export default SystemActivityScreen;
