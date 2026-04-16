import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, BorderRadius, Spacing } from '../constants/theme';

export default function Input({
  label, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, error,
  icon, multiline, numberOfLines, editable = true,
  style, inputStyle,
}) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.container,
        focused && styles.focused,
        error   && styles.errorBorder,
        !editable && styles.disabled,
      ]}>
        {icon && (
          <View style={styles.iconLeft}>
            <Ionicons name={icon} size={18} color={focused ? Colors.primary : Colors.textMuted} />
          </View>
        )}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secureTextEntry && !showPass}
          keyboardType={keyboardType || 'default'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
        />
        {secureTextEntry && (
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { marginBottom: Spacing.md },
  label:      { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  container:  {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    minHeight: 50,
    paddingHorizontal: Spacing.md,
  },
  focused:    { borderColor: Colors.primary, backgroundColor: '#FAFFFA' },
  errorBorder:{ borderColor: Colors.error },
  disabled:   { backgroundColor: Colors.surfaceAlt, opacity: 0.7 },
  input:      { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, paddingVertical: Spacing.sm },
  inputWithIcon: { paddingLeft: Spacing.xs },
  iconLeft:   { marginRight: Spacing.sm },
  eyeBtn:     { padding: Spacing.xs },
  errorText:  { fontSize: FontSize.xs, color: Colors.error, marginTop: 4 },
});
