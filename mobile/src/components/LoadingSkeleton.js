import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, radius } from '../styles/theme';

export const SkeletonBox = ({ width, height, style }) => (
  <View style={[{ width, height: height || 16, borderRadius: radius.sm, backgroundColor: colors.bgElevated }, style]} />
);

export const CardSkeleton = ({ style }) => (
  <View style={[styles.card, style]}>
    <View style={styles.skeletonHeader}>
      <SkeletonBox width={40} height={40} style={{ borderRadius: radius.full }} />
      <View style={{ flex: 1, gap: 8, marginLeft: spacing.sm }}>
        <SkeletonBox width="60%" height={14} />
        <SkeletonBox width="40%" height={12} />
      </View>
    </View>
    <SkeletonBox width="100%" height={12} style={{ marginTop: spacing.sm }} />
    <SkeletonBox width="80%" height={12} style={{ marginTop: 8 }} />
  </View>
);

export const FullPageLoader = ({ message }) => (
  <View style={styles.fullLoader}>
    <ActivityIndicator size="large" color={colors.primary} />
    {message && <Text style={styles.loaderText}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    gap: spacing.md,
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
});
