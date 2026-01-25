import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import SectionTitle from '../components/SectionTitle';
import { COLORS, FONTS, SIZES } from '../theme/tokens';
import { ApiUser } from '../../data/api/types';

type ProfileScreenProps = {
  user: ApiUser | null;
  onSignOut: () => void;
};

const ProfileScreen = ({ user, onSignOut }: ProfileScreenProps) => {
  return (
    <View style={styles.container}>
      <SectionTitle title="Profile" subtitle="Session" />
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email ?? 'Unknown'}</Text>
      </View>
      <PrimaryButton label="Sign out" onPress={onSignOut} />
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
});

export default ProfileScreen;
