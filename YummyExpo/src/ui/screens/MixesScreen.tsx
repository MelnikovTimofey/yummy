import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  createSession,
  createMix,
  createMixRating,
  getMixRatingSummaries,
  getMixRatings,
  getMixes,
  getTobaccos,
} from '../../data/api/client';
import { ApiUser, AuthTokens, Mix, MixRating, MixRatingSummary, Tobacco } from '../../data/api/types';
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
  tobaccoName: string;
  manufacturerName: string;
  proportion: string;
};

const MixesScreen = ({ auth, onAuthUpdate }: MixesScreenProps) => {
  const [items, setItems] = useState<Mix[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [mixRatings, setMixRatings] = useState<Record<string, MixRating>>({});
  const [mixSummaries, setMixSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [name, setName] = useState('');
  const [components, setComponents] = useState<ComponentDraft[]>([]);
  const [tobaccoQuery, setTobaccoQuery] = useState('');
  const [tobaccoResults, setTobaccoResults] = useState<Tobacco[]>([]);
  const [tobaccoStatus, setTobaccoStatus] = useState<'idle' | 'loading' | 'error'>('idle');
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

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSearch = async () => {
    const query = tobaccoQuery.trim();
    if (!query) {
      setTobaccoResults([]);
      return;
    }
    setTobaccoStatus('loading');
    try {
      const response = await getTobaccos({ search: query });
      setTobaccoResults(response.items);
      setTobaccoStatus('idle');
    } catch {
      setTobaccoStatus('error');
    }
  };

  const addComponentFromTobacco = (tobacco: Tobacco) => {
    setComponents((prev) => [
      ...prev,
      {
        tobaccoId: tobacco.id,
        tobaccoName: tobacco.name,
        manufacturerName: tobacco.manufacturer.name,
        proportion: '',
      },
    ]);
    setTobaccoResults([]);
    setTobaccoQuery('');
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
    setComponents([]);
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
        <Text style={styles.label}>Поиск табака</Text>
        <TextInput
          style={styles.input}
          value={tobaccoQuery}
          onChangeText={setTobaccoQuery}
          onSubmitEditing={handleSearch}
          placeholder="Название или вкус"
          placeholderTextColor={COLORS.textSecondary}
        />
        <PrimaryButton label="Найти табак" onPress={handleSearch} />
        {tobaccoStatus === 'error' ? (
          <Text style={styles.status}>Не удалось загрузить табаки.</Text>
        ) : null}
        {tobaccoResults.length > 0 ? (
          <View style={styles.resultList}>
            {tobaccoResults.slice(0, 6).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultRow}
                onPress={() => addComponentFromTobacco(item)}
              >
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultMeta}>{item.manufacturer.name}</Text>
                </View>
                <Text style={styles.resultAction}>Добавить</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Компоненты и %</Text>
        {components.length === 0 ? (
          <Text style={styles.helper}>Добавьте табак из поиска.</Text>
        ) : (
          components.map((item, index) => (
            <View key={`${item.tobaccoId}-${index}`} style={styles.componentRow}>
              <View style={styles.componentInfo}>
                <Text style={styles.componentName}>{item.tobaccoName}</Text>
                <Text style={styles.componentMeta}>{item.manufacturerName}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputSmall]}
                value={item.proportion}
                onChangeText={(value) => updateComponent(index, 'proportion', value)}
                placeholder="%"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeComponent(index)}
              >
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Итого {total}%</Text>
          <Text style={styles.meta}>Нужно 100%</Text>
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
  inputSmall: {
    width: 80,
  },
  resultList: {
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  resultRow: {
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  resultMeta: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  resultAction: {
    color: COLORS.accentSoft,
    fontFamily: FONTS.body,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  helper: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginBottom: 12,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  componentInfo: {
    flex: 1,
  },
  componentName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  componentMeta: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  removeText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 16,
    lineHeight: 18,
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
