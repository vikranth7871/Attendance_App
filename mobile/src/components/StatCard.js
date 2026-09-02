import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadows, typography } from '../styles/theme';

const StatCard = ({ icon: Icon, label, value, color, gradient, style }) => {
  const cardColor = color || colors.primary;
  const gradColors = gradient || [cardColor + 'CC', cardColor + '44'];

  return (
    <View style={[styles.card, shadows.sm, style]}>
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.iconWrapper, { backgroundColor: cardColor + '33' }]}>
          {Icon && <Icon size={22} color={cardColor} />}
        </View>
        <Text style={styles.value} numberOfLines={1}>{value ?? '—'}</Text>
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    flex: 1,
    minWidth: 140,
  },
  gradient: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    ...typography.xl,
    ...typography.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  label: {
    ...typography.sm,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});

export default StatCard;
