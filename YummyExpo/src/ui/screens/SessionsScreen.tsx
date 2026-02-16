import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createSession,
  createSessionRating,
  getMixRatingSummaries,
  getMixes,
  getSessionRatings,
  getSessions,
} from '../../data/api/client';
import {
  ApiUser,
  AuthTokens,
  Mix,
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
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [mixSearch, setMixSearch] = useState('');
  const [selectedMixId, setSelectedMixId] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<'home' | 'lounge'>('home');
  const [locationName, setLocationName] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

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
      const [sessionResponse, mixResponse] = await Promise.all([
        getSessions(auth, onAuthUpdate),
        getMixes(auth, onAuthUpdate),
        loadRatings(),
      ]);
      setItems(sessionResponse.items);
      setMixes(mixResponse.items);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredMixes = useMemo(() => {
    const query = mixSearch.trim().toLowerCase();
    if (!query) return mixes.slice(0, 30);
    return mixes.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 30);
  }, [mixSearch, mixes]);

  const selectedMix = mixes.find((item) => item.id === selectedMixId) ?? null;
  const canCreate = Boolean(selectedMixId) && (locationType === 'home' || locationName.trim().length > 0);

  const handleCreate = async () => {
    if (!canCreate) return;
    const payload = {
      mixId: selectedMixId!,
      date: new Date().toISOString(),
      locationType,
      locationName: locationType === 'lounge' ? locationName.trim() : undefined,
    };
    await createSession(auth, onAuthUpdate, payload);
    setSelectedMixId(null);
    setLocationName('');
    await load();
  };

  const handleRateSession = async (sessionId: string, rating: number) => {
    await createSessionRating(auth, onAuthUpdate, { sessionId, rating });
    await loadRatings();
  };

  const handleSelectMix = (mixId: string) => {
    setSelectedMixId(mixId);
    setPickerVisible(false);
  };

  return (
    <View style={styles.container}>
      <SectionTitle title="Сессии" subtitle="История курения" />

      <View style={styles.card}>
        <Text style={styles.label}>Выбранный микс</Text>
        {selectedMix ? (
          <View style={styles.selectedMix}>
            <Text style={styles.selectedMixName}>{selectedMix.name}</Text>
            <Text style={styles.selectedMixMeta}>Компоненты {selectedMix.components.length}</Text>
          </View>
        ) : (
          <Text style={styles.helper}>Микс пока не выбран.</Text>
        )}
        <PrimaryButton label="Выбрать микс" onPress={() => setPickerVisible(true)} />

        <Text style={styles.label}>Локация</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleItem}>
            <PrimaryButton
              label={locationType === 'home' ? 'Дом (выбран)' : 'Дом'}
              onPress={() => setLocationType('home')}
            />
          </View>
          <View style={styles.toggleItem}>
            <PrimaryButton
              label={locationType === 'lounge' ? 'Лаунж (выбран)' : 'Лаунж'}
              onPress={() => setLocationType('lounge')}
            />
          </View>
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

        <PrimaryButton label="Создать сессию" onPress={handleCreate} disabled={!canCreate} />
      </View>

      {status === 'error' ? <Text style={styles.status}>Не удалось загрузить сессии.</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.mix.name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.locationType === 'home' ? 'Дом' : `Лаунж ${item.locationName ?? ''}`}
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
                {mixSummaries[item.mix.id]?.count ? ` (${mixSummaries[item.mix.id]!.count})` : ''}
              </Text>
            </View>
          </View>
        )}
      />

      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Выбор микса</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalClose}>Закрыть</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              value={mixSearch}
              onChangeText={setMixSearch}
              placeholder="Поиск микса"
              placeholderTextColor={COLORS.textSecondary}
            />

            <FlatList
              data={filteredMixes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.mixRow, selectedMixId === item.id && styles.mixRowActive]}
                  onPress={() => handleSelectMix(item.id)}
                >
                  <Text style={[styles.mixName, selectedMixId === item.id && styles.mixNameActive]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.mixMeta, selectedMixId === item.id && styles.mixNameActive]}>
                    Компоненты {item.components.length}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.helper}>Миксы не найдены.</Text>}
            />
          </View>
        </SafeAreaView>
      </Modal>
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
    marginBottom: 8,
    marginTop: 6,
  },
  selectedMix: {
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    marginBottom: 12,
  },
  selectedMixName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 18,
  },
  selectedMixMeta: {
    marginTop: 4,
    color: COLORS.textSecondary,
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
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  toggleItem: {
    flex: 1,
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
  listContent: {
    paddingBottom: 24,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 12,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    fontSize: 28,
  },
  modalClose: {
    color: COLORS.accentSoft,
    fontFamily: FONTS.body,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.padding,
  },
  modalList: {
    paddingBottom: 20,
    gap: 10,
  },
  mixRow: {
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mixRowActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentSoft,
  },
  mixName: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 18,
  },
  mixMeta: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  mixNameActive: {
    color: '#1b140f',
  },
});

export default SessionsScreen;
