import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createMix, getTobaccos } from '../../data/api/client';
import { ApiUser, AuthTokens, Tobacco } from '../../data/api/types';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

type CreateMixScreenProps = {
  visible: boolean;
  auth: AuthTokens;
  onAuthUpdate: (next: { tokens: AuthTokens | null; user: ApiUser | null }) => void;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

type ComponentDraft = {
  tobaccoId: string;
  tobaccoName: string;
  manufacturerName: string;
  proportion: string;
};

const CreateMixScreen = ({
  visible,
  auth,
  onAuthUpdate,
  onClose,
  onCreated,
}: CreateMixScreenProps) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [components, setComponents] = useState<ComponentDraft[]>([]);
  const [tobaccoQuery, setTobaccoQuery] = useState('');
  const [tobaccoResults, setTobaccoResults] = useState<Tobacco[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [isCreating, setIsCreating] = useState(false);

  const total = useMemo(
    () => components.reduce((sum, item) => sum + Number(item.proportion || 0), 0),
    [components],
  );

  const canCreate =
    name.trim().length > 0 &&
    components.length > 0 &&
    components.every((item) => Number(item.proportion) > 0) &&
    total === 100;

  const resetForm = () => {
    setName('');
    setComponents([]);
    setTobaccoQuery('');
    setTobaccoResults([]);
    setStatus('idle');
  };

  const handleSearch = async () => {
    const query = tobaccoQuery.trim();
    if (!query) {
      setTobaccoResults([]);
      return;
    }
    setStatus('loading');
    try {
      const response = await getTobaccos({ search: query });
      setTobaccoResults(response.items);
      setStatus('idle');
    } catch {
      setStatus('error');
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

  const updateComponent = (index: number, value: string) => {
    setComponents((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, proportion: value } : item)),
    );
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreate = async () => {
    if (!canCreate || isCreating) return;

    setIsCreating(true);
    try {
      const payload = components.map((item) => ({
        tobaccoId: item.tobaccoId,
        proportion: Number(item.proportion),
      }));

      await createMix(auth, onAuthUpdate, { name: name.trim(), components: payload });
      await onCreated();
      resetForm();
      onClose();
    } catch {
      setStatus('error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleClose} hitSlop={8}>
            <Text style={styles.back}>Назад</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Создать микс</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={8}>
            <Text style={styles.close}>Закрыть</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

          {status === 'error' ? <Text style={styles.status}>Не удалось загрузить табаки.</Text> : null}

          {tobaccoResults.length > 0 ? (
            <View style={styles.resultList}>
              {tobaccoResults.slice(0, 8).map((item) => (
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
                  onChangeText={(value) => updateComponent(index, value)}
                  placeholder="%"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.removeButton} onPress={() => removeComponent(index)}>
                  <Text style={styles.removeText}>×</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={styles.metaRow}>
            <Text style={styles.meta}>Итого {total}%</Text>
            <Text style={styles.meta}>Нужно 100%</Text>
          </View>

          <PrimaryButton
            label={isCreating ? 'Создание...' : 'Создать микс'}
            onPress={handleCreate}
            disabled={!canCreate || isCreating}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    fontSize: 26,
  },
  back: {
    color: COLORS.accentSoft,
    fontFamily: FONTS.body,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  close: {
    color: COLORS.accentSoft,
    fontFamily: FONTS.body,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  label: {
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 8,
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
    marginBottom: 12,
    gap: 10,
  },
  resultRow: {
    borderRadius: SIZES.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
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
    marginTop: 4,
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
    marginTop: 10,
  },
});

export default CreateMixScreen;
