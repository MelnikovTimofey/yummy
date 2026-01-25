import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { getTobaccos } from '../../data/api/client';
import { Tobacco } from '../../data/api/types';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

const CatalogScreen = () => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Tobacco[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const load = async (search?: string) => {
    setStatus('loading');
    try {
      const response = await getTobaccos({ search });
      setItems(response.items);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <SectionTitle title="Catalog" subtitle="Tobaccos" />
      <TextInput
        style={styles.search}
        placeholder="Search flavor or name"
        placeholderTextColor={COLORS.textSecondary}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load(query)}
      />
      {status === 'error' ? (
        <Text style={styles.status}>Failed to load catalog.</Text>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.manufacturer.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>Strength {item.strength}/10</Text>
              <Text style={styles.meta}>Profiles {item.flavorProfiles.join(', ')}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  search: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: FONTS.body,
  },
  status: {
    color: COLORS.danger,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    fontSize: 18,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontFamily: FONTS.body,
  },
  metaRow: {
    marginTop: 10,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
});

export default CatalogScreen;
