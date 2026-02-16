import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  createSession,
  createMixRating,
  getMixRatingSummaries,
  getMixRatings,
  getMixes,
} from '../../data/api/client';
import { ApiUser, AuthTokens, Mix, MixRating, MixRatingSummary } from '../../data/api/types';
import PrimaryButton from '../components/PrimaryButton';
import RatingStars from '../components/RatingStars';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';
import CreateMixScreen from './CreateMixScreen';

type MixesScreenProps = {
  auth: AuthTokens;
  onAuthUpdate: (next: { tokens: AuthTokens | null; user: ApiUser | null }) => void;
};

const MixesScreen = ({ auth, onAuthUpdate }: MixesScreenProps) => {
  const [items, setItems] = useState<Mix[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [mixRatings, setMixRatings] = useState<Record<string, MixRating>>({});
  const [mixSummaries, setMixSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadRatings = async () => {
    const [ratingResponse, summaryResponse] = await Promise.all([
      getMixRatings(auth, onAuthUpdate),
      getMixRatingSummaries(auth, onAuthUpdate),
    ]);

    setMixRatings(
      ratingResponse.items.reduce<Record<string, MixRating>>((acc, item) => {
        acc[item.mixId] = item;
        return acc;
      }, {}),
    );
    setMixSummaries(
      summaryResponse.items.reduce<Record<string, MixRatingSummary>>((acc, item) => {
        acc[item.mixId] = item;
        return acc;
      }, {}),
    );
  };

  const load = async () => {
    setStatus('loading');
    try {
      const [response] = await Promise.all([getMixes(auth, onAuthUpdate), loadRatings()]);
      setItems(response.items);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRateMix = async (mixId: string, rating: number) => {
    await createMixRating(auth, onAuthUpdate, { mixId, rating });
    await loadRatings();
  };

  const handleQuickSession = async (mixId: string) => {
    await createSession(auth, onAuthUpdate, {
      mixId,
      date: new Date().toISOString(),
      locationType: 'home',
    });
    setFeedback('Микс добавлен в сессию.');
  };

  const handleCreated = async () => {
    setFeedback('Микс создан.');
    await load();
  };

  return (
    <View style={styles.container}>
      <SectionTitle title="Миксы" subtitle="Список и оценки" />

      <View style={styles.actionCard}>
        <PrimaryButton label="Создать микс" onPress={() => setIsCreateOpen(true)} />
      </View>

      {status === 'error' ? <Text style={styles.status}>Не удалось загрузить миксы.</Text> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <TouchableOpacity style={styles.quickButton} onPress={() => handleQuickSession(item.id)}>
                <Text style={styles.quickButtonText}>В сессию</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardSubtitle}>
              {item.components.map((component) => component.tobacco.manufacturer.name).join(' · ')}
            </Text>
            <Text style={styles.meta}>Компоненты {item.components.length}</Text>
            <View style={styles.ratingBlock}>
              <Text style={styles.ratingLabel}>Моя оценка</Text>
              <RatingStars
                value={mixRatings[item.id]?.rating ?? null}
                onSelect={(score) => handleRateMix(item.id, score)}
              />
              <Text style={styles.average}>
                Средняя:{' '}
                {mixSummaries[item.id]?.avgRating !== null &&
                mixSummaries[item.id]?.avgRating !== undefined
                  ? mixSummaries[item.id]!.avgRating!.toFixed(1)
                  : 'нет'}
                {mixSummaries[item.id]?.count ? ` (${mixSummaries[item.id]!.count})` : ''}
              </Text>
            </View>
          </View>
        )}
      />

      <CreateMixScreen
        visible={isCreateOpen}
        auth={auth}
        onAuthUpdate={onAuthUpdate}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: FONTS.body,
  },
  status: {
    color: COLORS.danger,
    marginBottom: 12,
  },
  feedback: {
    color: COLORS.accentSoft,
    marginBottom: 12,
    fontFamily: FONTS.body,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    fontSize: 18,
    flex: 1,
  },
  quickButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceAlt,
  },
  quickButtonText: {
    color: COLORS.accentSoft,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 6,
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
  listContent: {
    paddingBottom: 24,
  },
});

export default MixesScreen;
