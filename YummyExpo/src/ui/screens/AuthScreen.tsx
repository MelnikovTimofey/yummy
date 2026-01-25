import React, { useState } from 'react';
import {
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
    <View style={styles.container}>
      <SectionTitle title="Yummy Club" subtitle="Magic link access" />
      <Text style={styles.description}>
        Enter your email, we will send a secure sign-in link. Paste the token
        from the email if the deep link does not open automatically.
      </Text>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="name@email.com"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <PrimaryButton
        label={sending ? 'Sending...' : 'Send Magic Link'}
        onPress={handleSend}
        disabled={sending}
      />
      <View style={styles.divider} />
      <Text style={styles.label}>Token</Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={setToken}
        placeholder="Paste token"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
      />
      <PrimaryButton
        label={verifying ? 'Verifying...' : 'Verify Token'}
        onPress={handleVerify}
        disabled={verifying}
      />
      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
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
