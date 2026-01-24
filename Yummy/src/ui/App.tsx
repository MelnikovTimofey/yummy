import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { tobaccoColorHex } from '../domain/color';
import { FlavorProfile } from '../domain/models';

const sampleProfiles: FlavorProfile[] = ['sweet', 'dessert'];
const sampleColor = tobaccoColorHex(sampleProfiles);

// Basic UI tokens for the initial placeholder screen.
const UI_COLORS = {
  background: '#f9f6f1',
  title: '#2d1b12',
  subtitle: '#5b4a40',
  text: '#3b2a22',
} as const;

const UI_SIZES = {
  title: 32,
  subtitle: 16,
  text: 14,
  swatch: 48,
  swatchRadius: 12,
  paddingHorizontal: 20,
  paddingTop: 24,
  previewSpacing: 12,
  previewMarginTop: 24,
} as const;

const App = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Yummy</Text>
        <Text style={styles.subtitle}>Hookah mix recommendations</Text>
        <View style={styles.previewRow}>
          <View style={[styles.colorSwatch, { backgroundColor: sampleColor }]} />
          <Text style={styles.previewText}>
            Sample color for {sampleProfiles.join(' + ')}
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: UI_SIZES.paddingHorizontal,
    paddingTop: UI_SIZES.paddingTop,
    backgroundColor: UI_COLORS.background,
  },
  title: {
    fontSize: UI_SIZES.title,
    fontWeight: '700',
    color: UI_COLORS.title,
  },
  subtitle: {
    marginTop: 8,
    fontSize: UI_SIZES.subtitle,
    color: UI_COLORS.subtitle,
  },
  previewRow: {
    marginTop: UI_SIZES.previewMarginTop,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSwatch: {
    width: UI_SIZES.swatch,
    height: UI_SIZES.swatch,
    borderRadius: UI_SIZES.swatchRadius,
    marginRight: UI_SIZES.previewSpacing,
  },
  previewText: {
    fontSize: UI_SIZES.text,
    color: UI_COLORS.text,
  },
});

export default App;
