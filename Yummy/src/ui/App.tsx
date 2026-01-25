import React, { useEffect, useState } from 'react';
import {
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { verifyMagicLink, sendMagicLink } from '../data/api/client';
import { AuthTokens, ApiUser } from '../data/api/types';
import AuthScreen from './screens/AuthScreen';
import CatalogScreen from './screens/CatalogScreen';
import MixesScreen from './screens/MixesScreen';
import RecommendationsScreen from './screens/RecommendationsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SessionsScreen from './screens/SessionsScreen';
import RatingsScreen from './screens/RatingsScreen';
import { COLORS, FONTS, SIZES, SHADOW } from './theme/tokens';

const AUTH_TABS = ['catalog', 'mixes', 'sessions', 'ratings', 'recommend', 'profile'] as const;
const GUEST_TABS = ['catalog', 'auth'] as const;

const parseTokenFromUrl = (url: string | null) => {
  if (!url) return null;
  const match = url.match(/[?&]token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const App = () => {
  const [authTokens, setAuthTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('catalog');

  const handleVerify = async (token: string) => {
    try {
      const response = await verifyMagicLink(token);
      setAuthTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      setUser(response.user);
      setStatusMessage('Magic link verified.');
    } catch (error) {
      setStatusMessage('Failed to verify token.');
    }
  };

  const handleSend = async (email: string) => {
    try {
      await sendMagicLink(email);
      setStatusMessage('Magic link sent. Check your email.');
    } catch (error) {
      setStatusMessage('Unable to send magic link.');
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

  const handleAuthUpdate = (next: { tokens: AuthTokens | null; user: ApiUser | null }) => {
    setAuthTokens(next.tokens);
    setUser(next.user);
  };

  const content = () => {
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

    if (activeTab === 'ratings') {
      return <RatingsScreen auth={authTokens} onAuthUpdate={handleAuthUpdate} />;
    }

    if (activeTab === 'recommend') {
      return <RecommendationsScreen auth={authTokens} onAuthUpdate={handleAuthUpdate} />;
    }

    return <ProfileScreen user={user} onSignOut={handleSignOut} />;
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={styles.background}>
        <View style={styles.haloTop} />
        <View style={styles.haloBottom} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.brand}>YUMMY</Text>
            <Text style={styles.tagline}>Aroma Atelier</Text>
          </View>

          <View style={styles.contentCard}>{content()}</View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBar}
          >
            {(authTokens ? AUTH_TABS : GUEST_TABS).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                  {tab === 'catalog'
                    ? 'Catalog'
                    : tab === 'mixes'
                    ? 'Mixes'
                    : tab === 'sessions'
                    ? 'Sessions'
                    : tab === 'ratings'
                    ? 'Ratings'
                    : tab === 'recommend'
                    ? 'Recommend'
                    : tab === 'auth'
                    ? 'Sign in'
                  : 'Profile'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding + 10,
    paddingBottom: SIZES.padding,
  },
  header: {
    marginBottom: 20,
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
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius + 6,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 6,
    paddingRight: 6,
  },
  tab: {
    minWidth: 110,
    borderRadius: SIZES.radius,
    paddingVertical: 12,
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
    letterSpacing: 1.2,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  tabLabelActive: {
    color: '#1b140f',
  },
});

export default App;
