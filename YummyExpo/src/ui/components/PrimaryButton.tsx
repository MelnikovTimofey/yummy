import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

const PrimaryButton = ({ label, onPress, disabled }: PrimaryButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: SIZES.buttonHeight,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: FONTS.body,
    fontSize: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#1b140f',
  },
});

export default PrimaryButton;
