import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createMixRating,
  createSessionRating,
} from '../../data/api/client';
import { ApiUser, AuthTokens } from '../../data/api/types';
import PrimaryButton from '../components/PrimaryButton';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

type RatingsScreenProps = {
  auth: AuthTokens;
  onAuthUpdate: (next: { tokens: AuthTokens | null; user: ApiUser | null }) => void;
};

const RatingButtons = ({ value, onChange }: { value: number; onChange: (val: number) => void }) => {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((score) => (
        <PrimaryButton
          key={score}
          label={value === score ? `${score}★` : `${score}`}
          onPress={() => onChange(score)}
        />
      ))}
    </View>
  );
};

const RatingsScreen = ({ auth, onAuthUpdate }: RatingsScreenProps) => {
  const [sessionId, setSessionId] = useState('');
  const [mixId, setMixId] = useState('');
  const [sessionRating, setSessionRating] = useState(5);
  const [mixRating, setMixRating] = useState(5);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const submitSessionRating = async () => {
    if (!sessionId.trim()) return;
    try {
      await createSessionRating(auth, onAuthUpdate, {
        sessionId: sessionId.trim(),
        rating: sessionRating,
      });
      setStatusMessage('Session rating saved.');
    } catch {
      setStatusMessage('Failed to save session rating.');
    }
  };

  const submitMixRating = async () => {
    if (!mixId.trim()) return;
    try {
      await createMixRating(auth, onAuthUpdate, {
        mixId: mixId.trim(),
        rating: mixRating,
      });
      setStatusMessage('Mix rating saved.');
    } catch {
      setStatusMessage('Failed to save mix rating.');
    }
  };

  return (
    <View style={styles.container}>
      <SectionTitle title="Ratings" subtitle="Tune taste" />
      <View style={styles.card}>
        <Text style={styles.label}>Session rating</Text>
        <TextInput
          style={styles.input}
          value={sessionId}
          onChangeText={setSessionId}
          placeholder="Session ID"
          placeholderTextColor={COLORS.textSecondary}
        />
        <RatingButtons value={sessionRating} onChange={setSessionRating} />
        <PrimaryButton label="Rate session" onPress={submitSessionRating} />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Mix rating</Text>
        <TextInput
          style={styles.input}
          value={mixId}
          onChangeText={setMixId}
          placeholder="Mix ID"
          placeholderTextColor={COLORS.textSecondary}
        />
        <RatingButtons value={mixRating} onChange={setMixRating} />
        <PrimaryButton label="Rate mix" onPress={submitMixRating} />
      </View>
      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
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
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  status: {
    color: COLORS.accentSoft,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
});

export default RatingsScreen;
