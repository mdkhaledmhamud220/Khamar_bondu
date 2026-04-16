import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors, FontSize, BorderRadius, Shadow, Spacing } from '../constants/theme';

export default function Button({
  title, onPress, loading = false, disabled = false,
  variant = 'primary', icon, style, textStyle,
}) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    variant === 'primary'   && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'outline'   && styles.outline,
    variant === 'ghost'     && styles.ghost,
    isDisabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    variant === 'primary'   && styles.labelPrimary,
    variant === 'secondary' && styles.labelSecondary,
    variant === 'outline'   && styles.labelOutline,
    variant === 'ghost'     && styles.labelGhost,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} size="small" />
      ) : (
        <View style={styles.row}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={labelStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    margin:5,
  },
  primary: {
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },
  secondary: {
    backgroundColor: Colors.accentPale,
    borderWidth: 1.5,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: { marginRight: 4 },
  label: {
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelPrimary:   { color: Colors.white },
  labelSecondary: { color: Colors.primary },
  labelOutline:   { color: Colors.primary },
  labelGhost:     { color: Colors.primary },
});
