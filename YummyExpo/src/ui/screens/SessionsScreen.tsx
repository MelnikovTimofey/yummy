import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { createSession, getSessions } from '../../data/api/client';
import { ApiUser, AuthTokens, SmokingSession } from '../../data/api/types';
import PrimaryButton from '../components/PrimaryButton';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

type SessionsScreenProps = {
  auth: AuthTokens;
  onAuthUpdate: (next: { tokens: AuthTokens | null; user: ApiUser | null }) => void;
};

const SessionsScreen = ({ auth, onAuthUpdate }: SessionsScreenProps) => {
  const [items, setItems] = useState<SmokingSession[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [mixId, setMixId] = useState('');
  const [locationType, setLocationType] = useState<'home' | 'lounge'>('home');
  const [locationName, setLocationName] = useState('');

  const load = async () => {
    setStatus('loading');
    try {
      const response = await getSessions(auth, onAuthUpdate);
      setItems(response.items);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!mixId.trim()) return;
    const payload = {
      mixId: mixId.trim(),
      date: new Date().toISOString(),
      locationType,
      locationName: locationType === 'lounge' ? locationName.trim() : undefined,
    };
    await createSession(auth, onAuthUpdate, payload);
    setMixId('');
    setLocationName('');
    load();
  };

  return (
    <View style={styles.container}>
      <SectionTitle title="Sessions" subtitle="Track smoke" />
      <View style={styles.card}>
        <Text style={styles.label}>Mix ID</Text>
        <TextInput
          style={styles.input}
          value={mixId}
          onChangeText={setMixId}
          placeholder="Mix ID"
          placeholderTextColor={COLORS.textSecondary}
        />
        <View style={styles.toggleRow}>
          <PrimaryButton
            label={locationType === 'home' ? 'Home (selected)' : 'Home'}
            onPress={() => setLocationType('home')}
          />
          <PrimaryButton
            label={locationType === 'lounge' ? 'Lounge (selected)' : 'Lounge'}
            onPress={() => setLocationType('lounge')}
          />
        </View>
        {locationType === 'lounge' ? (
          <TextInput
            style={styles.input}
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Lounge name"
            placeholderTextColor={COLORS.textSecondary}
          />
        ) : null}
        <PrimaryButton label="Create session" onPress={handleCreate} />
      </View>
      {status === 'error' ? (
        <Text style={styles.status}>Failed to load sessions.</Text>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.mix.name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.locationType === 'home'
                ? 'Home'
                : `Lounge ${item.locationName ?? ''}`}
            </Text>
            <Text style={styles.meta}>{new Date(item.date).toLocaleString()}</Text>
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
  toggleRow: {
    gap: 10,
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
  meta: {
    color: COLORS.textSecondary,
    marginTop: 8,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: FONTS.body,
  },
});

export default SessionsScreen;
