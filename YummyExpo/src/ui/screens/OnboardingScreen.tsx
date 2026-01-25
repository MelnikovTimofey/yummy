import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getManufacturers } from '../../data/api/client';
import { Manufacturer } from '../../data/api/types';
import PrimaryButton from '../components/PrimaryButton';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

type OnboardingScreenProps = {
  onFinish: (payload: { profiles: string[]; disliked: string[]; brands: string[] }) => void;
};

const PROFILE_OPTIONS = [
  { id: 'sweet', label: 'Сладкий' },
  { id: 'sour', label: 'Кислый' },
  { id: 'spicy', label: 'Пряный' },
  { id: 'fresh', label: 'Свежий' },
  { id: 'dessert', label: 'Десертный' },
  { id: 'tobacco', label: 'Табачный' },
];

const OnboardingScreen = ({ onFinish }: OnboardingScreenProps) => {
  const [step, setStep] = useState(0);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);

  useEffect(() => {
    getManufacturers()
      .then((response) => setManufacturers(response.items))
      .catch(() => setManufacturers([]));
  }, []);

  const brandOptions = useMemo(
    () => manufacturers.map((item) => ({ id: item.id, label: item.name })),
    [manufacturers],
  );

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const totalSteps = 3;
  const isLast = step === totalSteps - 1;

  const handleNext = () => {
    if (isLast) {
      onFinish({ profiles, disliked, brands });
      return;
    }
    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Шаг {step + 1} из {totalSteps}</Text>
      {step === 0 ? (
        <View>
          <SectionTitle title="Вкусно" subtitle="Персональные миксы" />
          <Text style={styles.text}>
            Быстро подберём, что сегодня покурить. Учитываем вкусы, историю и оценки.
          </Text>
          <Text style={styles.text}>
            На следующих шагах отметьте вкусовые профили и любимые бренды.
          </Text>
        </View>
      ) : null}

      {step === 1 ? (
        <View>
          <SectionTitle title="Вкусовые профили" subtitle="Выберите несколько" />
          <View style={styles.chips}>
            {PROFILE_OPTIONS.map((option) => {
              const active = profiles.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setProfiles((prev) => toggle(prev, option.id))}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.subheading}>Нелюбимые профили (опционально)</Text>
          <View style={styles.chips}>
            {PROFILE_OPTIONS.map((option) => {
              const active = disliked.includes(option.id);
              return (
                <TouchableOpacity
                  key={`disliked-${option.id}`}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDisliked((prev) => toggle(prev, option.id))}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View>
          <SectionTitle title="Любимые бренды" subtitle="Можно выбрать несколько" />
          <ScrollView style={styles.brandList} contentContainerStyle={styles.brandListContent}>
            {brandOptions.length === 0 ? (
              <Text style={styles.text}>Бренды пока не загружены.</Text>
            ) : (
              brandOptions.map((option) => {
                const active = brands.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.brandRow, active && styles.brandRowActive]}
                    onPress={() => setBrands((prev) => toggle(prev, option.id))}
                  >
                    <Text style={[styles.brandText, active && styles.brandTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.actions}>
        {step > 0 ? (
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.link}>Назад</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <PrimaryButton label={isLast ? 'Начать' : 'Далее'} onPress={handleNext} />
      </View>
      {step < totalSteps - 1 ? (
        <TouchableOpacity onPress={() => onFinish({ profiles, disliked, brands })}>
          <Text style={styles.skip}>Пропустить</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
    paddingTop: 12,
  },
  step: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  text: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  subheading: {
    marginTop: 16,
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
  brandList: {
    maxHeight: 320,
  },
  brandListContent: {
    gap: 10,
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
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  skip: {
    marginTop: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});

export default OnboardingScreen;
