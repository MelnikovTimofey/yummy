import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createSession,
  createSessionRating,
  getMixRatingSummaries,
  getSessionRatings,
  getSessions,
} from '../../data/api/client';
import {
  ApiUser,
  AuthTokens,
  MixRatingSummary,
  SessionRating,
  SmokingSession,
} from '../../data/api/types';
import PrimaryButton from '../components/PrimaryButton';
import RatingStars from '../components/RatingStars';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

type SessionsScreenProps = {
  auth: AuthTokens;
  onAuthUpdate: (next: { tokens: AuthTokens | null; user: ApiUser | null }) => void;
};

const SessionsScreen = ({ auth, onAuthUpdate }: SessionsScreenProps) => {
  const [items, setItems] = useState<SmokingSession[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [sessionRatings, setSessionRatings] = useState<Record<string, SessionRating>>({});
  const [mixSummaries, setMixSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [mixId, setMixId] = useState('');
  const [locationType, setLocationType] = useState<'home' | 'lounge'>('home');
  const [locationName, setLocationName] = useState('');

  const loadRatings = async () => {
    const [sessionRatingsResponse, mixSummaryResponse] = await Promise.all([
      getSessionRatings(auth, onAuthUpdate),
      getMixRatingSummaries(auth, onAuthUpdate),
    ]);

    setSessionRatings(
      sessionRatingsResponse.items.reduce<Record<string, SessionRating>>((acc, item) => {
        acc[item.sessionId] = item;
        return acc;
      }, {}),
    );
    setMixSummaries(
      mixSummaryResponse.items.reduce<Record<string, MixRatingSummary>>((acc, item) => {
        acc[item.mixId] = item;
        return acc;
      }, {}),
    );
  };

  const load = async () => {
    setStatus('loading');
    try {
      const [response] = await Promise.all([getSessions(auth, onAuthUpdate), loadRatings()]);
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

  const handleRateSession = async (sessionId: string, rating: number) => {
    await createSessionRating(auth, onAuthUpdate, { sessionId, rating });
    await loadRatings();
  };

  return (
    <View style={styles.container}>
      <SectionTitle title="Сессии" subtitle="История курения" />
      <View style={styles.card}>
        <Text style={styles.label}>ID микса</Text>
        <TextInput
          style={styles.input}
          value={mixId}
          onChangeText={setMixId}
          placeholder="ID микса"
          placeholderTextColor={COLORS.textSecondary}
        />
        <View style={styles.toggleRow}>
          <PrimaryButton
            label={locationType === 'home' ? 'Дом (выбран)' : 'Дом'}
            onPress={() => setLocationType('home')}
          />
          <PrimaryButton
            label={locationType === 'lounge' ? 'Лаунж (выбран)' : 'Лаунж'}
            onPress={() => setLocationType('lounge')}
          />
        </View>
        {locationType === 'lounge' ? (
          <TextInput
            style={styles.input}
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Название лаунжа"
            placeholderTextColor={COLORS.textSecondary}
          />
        ) : null}
        <PrimaryButton label="Создать сессию" onPress={handleCreate} />
      </View>
      {status === 'error' ? (
        <Text style={styles.status}>Не удалось загрузить сессии.</Text>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.mix.name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.locationType === 'home'
                ? 'Дом'
                : `Лаунж ${item.locationName ?? ''}`}
            </Text>
            <Text style={styles.meta}>{new Date(item.date).toLocaleString()}</Text>
            <View style={styles.ratingBlock}>
              <Text style={styles.ratingLabel}>Оценка сессии</Text>
              <RatingStars
                value={sessionRatings[item.id]?.rating ?? null}
                onSelect={(score) => handleRateSession(item.id, score)}
              />
              <Text style={styles.average}>
                Средняя оценка микса:{' '}
                {mixSummaries[item.mix.id]?.avgRating !== null &&
                mixSummaries[item.mix.id]?.avgRating !== undefined
                  ? mixSummaries[item.mix.id]!.avgRating!.toFixed(1)
                  : 'нет'}
                {mixSummaries[item.mix.id]?.count
                  ? ` (${mixSummaries[item.mix.id]!.count})`
                  : ''}
              </Text>
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
  ratingBlock: {
    marginTop: 12,
    gap: 8,
  },
  ratingLabel: {
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  average: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
});

export default SessionsScreen;
