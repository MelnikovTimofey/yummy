import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { createMix, getMixes } from '../../data/api/client';
import { ApiUser, AuthTokens, Mix } from '../../data/api/types';
import PrimaryButton from '../components/PrimaryButton';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

type MixesScreenProps = {
  auth: AuthTokens;
  onAuthUpdate: (next: { tokens: AuthTokens | null; user: ApiUser | null }) => void;
};

type ComponentDraft = {
  tobaccoId: string;
  proportion: string;
};

const MixesScreen = ({ auth, onAuthUpdate }: MixesScreenProps) => {
  const [items, setItems] = useState<Mix[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [name, setName] = useState('');
  const [components, setComponents] = useState<ComponentDraft[]>([
    { tobaccoId: '', proportion: '' },
  ]);

  const load = async () => {
    setStatus('loading');
    try {
      const response = await getMixes(auth, onAuthUpdate);
      setItems(response.items);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateComponent = (index: number, key: keyof ComponentDraft, value: string) => {
    setComponents((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    );
  };

  const addComponent = () => {
    setComponents((prev) => [...prev, { tobaccoId: '', proportion: '' }]);
  };

  const total = components.reduce((sum, item) => sum + Number(item.proportion || 0), 0);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const payload = components
      .filter((item) => item.tobaccoId.trim())
      .map((item) => ({
        tobaccoId: item.tobaccoId.trim(),
        proportion: Number(item.proportion),
      }));

    if (payload.length === 0) return;

    await createMix(auth, onAuthUpdate, { name: name.trim(), components: payload });
    setName('');
    setComponents([{ tobaccoId: '', proportion: '' }]);
    load();
  };

  return (
    <View style={styles.container}>
      <SectionTitle title="Mixes" subtitle="Create & reuse" />
      <View style={styles.card}>
        <Text style={styles.label}>Mix name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Midnight Citrus"
          placeholderTextColor={COLORS.textSecondary}
        />
        <Text style={styles.label}>Components (tobacco id + %)</Text>
        {components.map((item, index) => (
          <View key={`${index}`} style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputGrow]}
              value={item.tobaccoId}
              onChangeText={(value) => updateComponent(index, 'tobaccoId', value)}
              placeholder="Tobacco ID"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={[styles.input, styles.inputSmall]}
              value={item.proportion}
              onChangeText={(value) => updateComponent(index, 'proportion', value)}
              placeholder="%"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />
          </View>
        ))}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Total {total}%</Text>
          <Text style={styles.meta}>Need 100%</Text>
        </View>
        <View style={styles.actionsRow}>
          <PrimaryButton label="Add component" onPress={addComponent} />
        </View>
        <PrimaryButton label="Create mix" onPress={handleCreate} disabled={total !== 100} />
      </View>

      {status === 'error' ? (
        <Text style={styles.status}>Failed to load mixes.</Text>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.components
                .map((component) => component.tobacco.manufacturer.name)
                .join(' · ')}
            </Text>
            <Text style={styles.meta}>Components {item.components.length}</Text>
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: FONTS.body,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  inputGrow: {
    flex: 1,
  },
  inputSmall: {
    width: 80,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: FONTS.body,
  },
  actionsRow: {
    marginBottom: 12,
  },
  status: {
    color: COLORS.danger,
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    fontSize: 18,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 6,
    fontFamily: FONTS.body,
  },
});

export default MixesScreen;
