import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';
import { ApiUser, AuthTokens, Manufacturer, PreferenceProfile } from '../../data/api/types';
import {
  getManufacturers,
  getPreferenceProfile,
  upsertPreferenceProfile,
} from '../../data/api/client';

type ProfileScreenProps = {
  user: ApiUser | null;
  onSignOut: () => void;
  auth: AuthTokens;
  onAuthUpdate: (next: { tokens: AuthTokens | null; user: ApiUser | null }) => void;
};

const PROFILE_OPTIONS = [
  { id: 'sweet', label: 'Сладкий' },
  { id: 'sour', label: 'Кислый' },
  { id: 'spicy', label: 'Пряный' },
  { id: 'fresh', label: 'Свежий' },
  { id: 'dessert', label: 'Десертный' },
  { id: 'tobacco', label: 'Табачный' },
];

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

const ProfileScreen = ({ user, onSignOut, auth, onAuthUpdate }: ProfileScreenProps) => {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [dislikedProfiles, setDislikedProfiles] = useState<string[]>([]);
  const [favoriteManufacturerIds, setFavoriteManufacturerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getManufacturers(),
      getPreferenceProfile(auth, onAuthUpdate),
    ])
      .then(([manufacturerResponse, profileResponse]) => {
        if (!mounted) return;
        setManufacturers(manufacturerResponse.items);
        const profile = profileResponse.profile as PreferenceProfile | null;
        setLikedProfiles(profile?.likedProfiles ?? []);
        setDislikedProfiles(profile?.dislikedProfiles ?? []);
        setFavoriteManufacturerIds(profile?.favoriteManufacturerIds ?? []);
      })
      .catch(() => {
        if (mounted) setStatus('Не удалось загрузить предпочтения.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [auth.accessToken]);

  const brandOptions = useMemo(
    () => manufacturers.map((item) => ({ id: item.id, label: item.name })),
    [manufacturers],
  );

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await upsertPreferenceProfile(auth, onAuthUpdate, {
        likedProfiles,
        dislikedProfiles: dislikedProfiles.filter((item) => !likedProfiles.includes(item)),
        favoriteManufacturerIds,
      });
      setStatus('Предпочтения сохранены.');
    } catch {
      setStatus('Не удалось сохранить предпочтения.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SectionTitle title="Профиль" subtitle="Аккаунт" />
      <View style={styles.card}>
        <Text style={styles.label}>Вы вошли как</Text>
        <Text style={styles.value}>{user?.email ?? 'Неизвестно'}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subheading}>Любимые профили</Text>
        <View style={styles.chips}>
          {PROFILE_OPTIONS.map((option) => {
            const active = likedProfiles.includes(option.id);
            return (
              <TouchableOpacity
                key={`liked-${option.id}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setLikedProfiles((prev) => toggle(prev, option.id))}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.subheading}>Нелюбимые профили</Text>
        <View style={styles.chips}>
          {PROFILE_OPTIONS.map((option) => {
            const active = dislikedProfiles.includes(option.id);
            return (
              <TouchableOpacity
                key={`disliked-${option.id}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setDislikedProfiles((prev) => toggle(prev, option.id))}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.subheading}>Любимые бренды</Text>
        <View style={styles.brands}>
          {brandOptions.length === 0 ? (
            <Text style={styles.statusText}>
              {loading ? 'Загрузка брендов...' : 'Бренды не найдены.'}
            </Text>
          ) : (
            brandOptions.map((option) => {
              const active = favoriteManufacturerIds.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.brandRow, active && styles.brandRowActive]}
                  onPress={() =>
                    setFavoriteManufacturerIds((prev) => toggle(prev, option.id))
                  }
                >
                  <Text style={[styles.brandText, active && styles.brandTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {status ? <Text style={styles.statusText}>{status}</Text> : null}
        <PrimaryButton label={saving ? 'Сохранение...' : 'Сохранить'} onPress={handleSave} />
        <View style={styles.divider} />
        <PrimaryButton label="Выйти" onPress={onSignOut} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  value: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    fontSize: 16,
    marginTop: 8,
  },
  subheading: {
    marginTop: 8,
    marginBottom: 10,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentSoft,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  chipTextActive: {
    color: '#1b140f',
  },
  brands: {
    gap: 10,
    marginBottom: 14,
  },
  brandRow: {
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  brandRowActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentSoft,
  },
  brandText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  brandTextActive: {
    color: '#1b140f',
  },
  statusText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
});

export default ProfileScreen;
