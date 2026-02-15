import React, { useEffect, useState } from 'react';
import {
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { verifyMagicLink, sendMagicLink, upsertPreferenceProfile } from '../data/api/client';
import { AuthTokens, ApiUser } from '../data/api/types';
import AuthScreen from './screens/AuthScreen';
import CatalogScreen from './screens/CatalogScreen';
import MixesScreen from './screens/MixesScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import RecommendationsScreen from './screens/RecommendationsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SessionsScreen from './screens/SessionsScreen';
import { COLORS, FONTS, SIZES } from './theme/tokens';

const AUTH_TABS = ['mixes', 'sessions', 'catalog', 'recommend', 'profile'] as const;
const GUEST_TABS = ['catalog', 'auth'] as const;

const parseTokenFromUrl = (url: string | null) => {
  if (!url) return null;
  const match = url.match(/[?&]token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const getTabLabel = (tab: string) => {
  if (tab === 'catalog') return 'Каталог';
  if (tab === 'mixes') return 'Миксы';
  if (tab === 'sessions') return 'Сессии';
  if (tab === 'recommend') return 'Подборка';
  if (tab === 'auth') return 'Вход';
  return 'Профиль';
};

const App = () => {
  const [authTokens, setAuthTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('catalog');
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const handleVerify = async (token: string) => {
    try {
      const response = await verifyMagicLink(token);
      setAuthTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      setUser(response.user);
      setStatusMessage('Ссылка подтверждена.');
      setActiveTab('mixes');
    } catch (error) {
      setStatusMessage('Не удалось подтвердить токен.');
    }
  };

  const handleSend = async (email: string) => {
    try {
      await sendMagicLink(email);
      setStatusMessage('Ссылка отправлена. Проверьте почту.');
    } catch (error) {
      setStatusMessage('Не удалось отправить ссылку.');
    }
  };

  const handleSignOut = () => {
    setAuthTokens(null);
    setUser(null);
    setActiveTab('catalog');
  };

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const token = parseTokenFromUrl(event.url);
      if (token) {
        handleVerify(token);
      }
    };

    Linking.getInitialURL().then((url) => {
      const token = parseTokenFromUrl(url);
      if (token) {
        handleVerify(token);
      }
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('onboarding:completed')
      .then((value) => {
        setOnboardingComplete(value === 'true');
      })
      .finally(() => setOnboardingReady(true));
  }, []);

  const handleOnboardingFinish = async (payload: {
    profiles: string[];
    disliked: string[];
    brands: string[];
  }) => {
    await AsyncStorage.multiSet([
      ['onboarding:completed', 'true'],
      ['onboarding:profiles', JSON.stringify(payload.profiles)],
      ['onboarding:disliked', JSON.stringify(payload.disliked)],
      ['onboarding:brands', JSON.stringify(payload.brands)],
      ['onboarding:synced', 'false'],
    ]);
    setOnboardingComplete(true);
    setActiveTab(authTokens ? 'mixes' : 'auth');
  };

  useEffect(() => {
    if (!authTokens) return;

    AsyncStorage.multiGet([
      'onboarding:profiles',
      'onboarding:disliked',
      'onboarding:brands',
      'onboarding:synced',
    ])
      .then(async (entries) => {
        const map = new Map(entries);
        if (map.get('onboarding:synced') === 'true') return;

        const profiles = JSON.parse(map.get('onboarding:profiles') || '[]') as string[];
        const disliked = JSON.parse(map.get('onboarding:disliked') || '[]') as string[];
        const brands = JSON.parse(map.get('onboarding:brands') || '[]') as string[];

        await upsertPreferenceProfile(authTokens, handleAuthUpdate, {
          likedProfiles: profiles,
          dislikedProfiles: disliked,
          favoriteManufacturerIds: brands,
        });
        await AsyncStorage.setItem('onboarding:synced', 'true');
      })
      .catch(() => null);
  }, [authTokens]);

  const handleAuthUpdate = (next: { tokens: AuthTokens | null; user: ApiUser | null }) => {
    setAuthTokens(next.tokens);
    setUser(next.user);
  };

  const content = () => {
    if (!onboardingReady) {
      return (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      );
    }

    if (!onboardingComplete) {
      return <OnboardingScreen onFinish={handleOnboardingFinish} />;
    }

    if (activeTab === 'catalog') {
      return <CatalogScreen />;
    }

    if (activeTab === 'auth' || !authTokens) {
      return (
        <AuthScreen onSendLink={handleSend} onVerify={handleVerify} statusMessage={statusMessage} />
      );
    }

    if (activeTab === 'mixes') {
      return <MixesScreen auth={authTokens} onAuthUpdate={handleAuthUpdate} />;
    }

    if (activeTab === 'sessions') {
      return <SessionsScreen auth={authTokens} onAuthUpdate={handleAuthUpdate} />;
    }

    if (activeTab === 'recommend') {
      return <RecommendationsScreen auth={authTokens} onAuthUpdate={handleAuthUpdate} />;
    }

    return (
      <ProfileScreen
        user={user}
        onSignOut={handleSignOut}
        auth={authTokens}
        onAuthUpdate={handleAuthUpdate}
      />
    );
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={styles.background}>
        <View style={styles.haloTop} />
        <View style={styles.haloBottom} />
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.brand}>ВКУСНО</Text>
              <Text style={styles.tagline}>АРОМА АТЕЛЬЕ</Text>
            </View>

            <View style={styles.content}>{content()}</View>
          </View>
        </SafeAreaView>

        {onboardingReady && onboardingComplete ? (
          <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
            <View style={styles.tabBar}>
              {(authTokens ? AUTH_TABS : GUEST_TABS).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}
                  >
                    {getTabLabel(tab)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeTop: {
    flex: 1,
  },
  haloTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#3b2e22',
    opacity: 0.5,
  },
  haloBottom: {
    position: 'absolute',
    bottom: -160,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: '#2b1f17',
    opacity: 0.6,
  },
  container: {
    flex: 1,
    paddingTop: 8,
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: SIZES.padding,
  },
  brand: {
    fontFamily: FONTS.display,
    fontSize: 36,
    letterSpacing: 6,
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },
  tagline: {
    marginTop: 6,
    fontFamily: FONTS.body,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 12,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.padding,
    paddingTop: 10,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentSoft,
  },
  tabLabel: {
    fontFamily: FONTS.body,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  tabLabelActive: {
    color: '#1b140f',
  },
});

export default App;
