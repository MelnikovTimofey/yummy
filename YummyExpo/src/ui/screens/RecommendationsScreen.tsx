import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { getRecommendations } from '../../data/api/client';
import { AuthTokens, ApiUser, RecommendationItem } from '../../data/api/types';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

type RecommendationsScreenProps = {
  auth: AuthTokens;
  onAuthUpdate: (next: { tokens: AuthTokens | null; user: ApiUser | null }) => void;
};

const RecommendationsScreen = ({ auth, onAuthUpdate }: RecommendationsScreenProps) => {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const load = async () => {
    setStatus('loading');
    try {
      const response = await getRecommendations(auth, onAuthUpdate);
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
      <SectionTitle title="Recommendations" subtitle="LightFM Curated" />
      {status === 'error' ? (
        <Text style={styles.status}>Failed to load recommendations.</Text>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.mix.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.mix.name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.mix.components
                .map((component) => component.tobacco.manufacturer.name)
                .join(' · ')}
            </Text>
            {item.score !== null ? (
              <Text style={styles.score}>Score {item.score.toFixed(2)}</Text>
            ) : (
              <Text style={styles.score}>Popular pick</Text>
            )}
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
    marginTop: 6,
    fontFamily: FONTS.body,
  },
  score: {
    marginTop: 10,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: COLORS.accentSoft,
    fontFamily: FONTS.body,
  },
});

export default RecommendationsScreen;
