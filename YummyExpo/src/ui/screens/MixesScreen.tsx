import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  createSession,
  createMix,
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
  const [mixRatings, setMixRatings] = useState<Record<string, MixRating>>({});
  const [mixSummaries, setMixSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [name, setName] = useState('');
  const [components, setComponents] = useState<ComponentDraft[]>([
    { tobaccoId: '', proportion: '' },
  ]);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  return (
    <View style={styles.container}>
      <SectionTitle title="Миксы" subtitle="Список и оценки" />
      <View style={styles.card}>
        <Text style={styles.label}>Название микса</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Цитрусовая ночь"
          placeholderTextColor={COLORS.textSecondary}
        />
        <Text style={styles.label}>Состав (ID табака + %)</Text>
        {components.map((item, index) => (
          <View key={`${index}`} style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputGrow]}
              value={item.tobaccoId}
              onChangeText={(value) => updateComponent(index, 'tobaccoId', value)}
              placeholder="ID табака"
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
          <Text style={styles.meta}>Итого {total}%</Text>
          <Text style={styles.meta}>Нужно 100%</Text>
        </View>
        <View style={styles.actionsRow}>
          <PrimaryButton label="Добавить компонент" onPress={addComponent} />
        </View>
        <PrimaryButton label="Создать микс" onPress={handleCreate} disabled={total !== 100} />
      </View>

      {status === 'error' ? (
        <Text style={styles.status}>Не удалось загрузить миксы.</Text>
      ) : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <TouchableOpacity style={styles.quickButton} onPress={() => handleQuickSession(item.id)}>
                <Text style={styles.quickButtonText}>В сессию</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardSubtitle}>
              {item.components
                .map((component) => component.tobacco.manufacturer.name)
                .join(' · ')}
            </Text>
            <Text style={styles.meta}>Компоненты {item.components.length}</Text>
            <View style={styles.ratingBlock}>
              <Text style={styles.ratingLabel}>Моя оценка</Text>
              <RatingStars
                value={mixRatings[item.id]?.rating ?? null}
                onSelect={(score) => handleRateMix(item.id, score)}
              />
              <Text style={styles.average}>
                Средняя: {mixSummaries[item.id]?.avgRating !== null &&
                mixSummaries[item.id]?.avgRating !== undefined
                  ? mixSummaries[item.id]!.avgRating!.toFixed(1)
                  : 'нет'}
                {mixSummaries[item.id]?.count
                  ? ` (${mixSummaries[item.id]!.count})`
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
});

export default MixesScreen;
