import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../theme/tokens';

type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

const SectionTitle = ({ title, subtitle }: SectionTitleProps) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.accent,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: FONTS.body,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
  },
});

export default SectionTitle;
