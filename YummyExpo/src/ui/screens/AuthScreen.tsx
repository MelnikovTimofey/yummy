import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import SectionTitle from '../components/SectionTitle';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, FONTS, SIZES } from '../theme/tokens';

type AuthScreenProps = {
  onSendLink: (email: string) => Promise<void>;
  onVerify: (token: string) => Promise<void>;
  statusMessage?: string | null;
};

const AuthScreen = ({ onSendLink, onVerify, statusMessage }: AuthScreenProps) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      await onSendLink(email.trim());
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!token.trim()) return;
    setVerifying(true);
    try {
      await onVerify(token.trim());
    } finally {
      setVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <SectionTitle title="Клуб Вкусно" subtitle="Вход по ссылке" />
          <Text style={styles.description}>
            Укажите почту — мы отправим безопасную ссылку для входа. Вставьте токен
            из письма, если ссылка не открылась автоматически.
          </Text>
          <Text style={styles.label}>Почта</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="name@mail.com"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <PrimaryButton
            label={sending ? 'Отправка...' : 'Отправить ссылку'}
            onPress={handleSend}
            disabled={sending}
          />
          <View style={styles.divider} />
          <Text style={styles.label}>Токен</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="Вставьте токен"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
          />
          <PrimaryButton
            label={verifying ? 'Проверка...' : 'Подтвердить токен'}
            onPress={handleVerify}
            disabled={verifying}
          />
          {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  description: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: FONTS.body,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },
  status: {
    marginTop: 12,
    color: COLORS.accentSoft,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
});

export default AuthScreen;
