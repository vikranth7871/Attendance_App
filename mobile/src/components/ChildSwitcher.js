import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TouchableWithoutFeedback, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Check, Users, User, GraduationCap, Hash } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '../styles/theme';

const getChildId = (child) => child ? String(child.studentId || child.id || child._id || '') : '';
const getChildName = (child) => child?.name || 'Student';
const getChildClass = (child) => child?.classInfo?.className || child?.classInfo?.name || child?.className || 'Class Student';
const getChildSection = (child) => child?.section || 'A';
const getChildRoll = (child) => child?.rollNumber || child?.roll_number || '—';

const ChildSwitcher = ({ childrenList = [], selectedChildId, onSelectChild, style }) => {
  const [modalVisible, setModalVisible] = useState(false);

  if (!childrenList || childrenList.length === 0) {
    return null;
  }

  const activeChild = childrenList.find(c => getChildId(c) === String(selectedChildId)) || childrenList[0];
  const isMultiple = childrenList.length > 1;

  const handleSelect = (child) => {
    const id = getChildId(child);
    if (onSelectChild) {
      onSelectChild(id, child);
    }
    setModalVisible(false);
  };

  // Single child display
  if (!isMultiple) {
    return (
      <View style={[styles.singleContainer, style]}>
        <LinearGradient
          colors={colors.gradientPrimary || ['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{getChildName(activeChild).charAt(0).toUpperCase()}</Text>
        </LinearGradient>
        <View style={styles.childInfo}>
          <Text style={styles.childName} numberOfLines={1}>{getChildName(activeChild)}</Text>
          <Text style={styles.childMeta} numberOfLines={1}>
            {getChildClass(activeChild)} • Sec {getChildSection(activeChild)}
          </Text>
        </View>
        <View style={styles.singleBadge}>
          <Text style={styles.singleBadgeText}>Student</Text>
        </View>
      </View>
    );
  }

  // Multi-child switcher
  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.switcherButton, shadows.sm]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors.gradientPrimary || ['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{getChildName(activeChild).charAt(0).toUpperCase()}</Text>
        </LinearGradient>

        <View style={styles.childInfo}>
          <Text style={styles.childName} numberOfLines={1}>{getChildName(activeChild)}</Text>
          <Text style={styles.childMeta} numberOfLines={1}>
            {getChildClass(activeChild)} • Sec {getChildSection(activeChild)}
          </Text>
        </View>

        <View style={styles.switchPill}>
          <Text style={styles.switchPillText}>Switch</Text>
          <ChevronDown size={14} color={colors.primaryLight} />
        </View>
      </TouchableOpacity>

      {/* Selector Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Users size={18} color={colors.primaryLight} />
                    <Text style={styles.modalTitle}>Select Child / Ward</Text>
                  </View>
                  <Text style={styles.modalCount}>{childrenList.length} Linked</Text>
                </View>

                <FlatList
                  data={childrenList}
                  keyExtractor={(item, index) => getChildId(item) || String(index)}
                  renderItem={({ item }) => {
                    const isSelected = getChildId(item) === getChildId(activeChild);
                    return (
                      <TouchableOpacity
                        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={isSelected ? (colors.gradientPrimary || ['#6366f1', '#8b5cf6']) : ['#334155', '#475569']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.modalItemAvatar}
                        >
                          <Text style={styles.modalItemAvatarText}>{getChildName(item).charAt(0).toUpperCase()}</Text>
                        </LinearGradient>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalItemName, isSelected && { color: colors.primaryLight }]}>
                            {getChildName(item)}
                          </Text>
                          <Text style={styles.modalItemMeta}>
                            {getChildClass(item)} • Sec {getChildSection(item)} · Roll: {getChildRoll(item)}
                          </Text>
                        </View>

                        {isSelected && (
                          <View style={styles.checkCircle}>
                            <Check size={14} color="#fff" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  singleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: spacing.md,
  },
  switcherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    gap: 12,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  childMeta: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  switchPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  singleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
  },
  singleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  modalCount: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    gap: 12,
    backgroundColor: colors.bgSecondary,
  },
  modalItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  modalItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalItemName: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  modalItemMeta: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 8,
  },
});

export default ChildSwitcher;
