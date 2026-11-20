import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getMe } from '../lib/register-api';
import { ApiError, clearTokens } from '../lib/auth-api';
import { clearPin } from '../lib/pin';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setName(me.first_name);
      } catch (e) {
        // Sessiya tugagan bo'lsa qayta kirish kerak
        if (e instanceof ApiError && e.status === 401) {
          await clearTokens();
          router.replace('/login');
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onLogout = async () => {
    await clearTokens();
    await clearPin();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Animated.View entering={FadeInDown.duration(600)} style={styles.welcome}>
            <Animated.Image
              source={require('../assets/coin.png')}
              resizeMode="contain"
              style={styles.coin}
            />
            <Text style={styles.small}>Xush kelibsiz,</Text>
            <Text style={styles.name}>{name ? `${name}!` : ''}</Text>
          </Animated.View>
        )}
      </View>

      <Pressable onPress={onLogout} style={styles.logout}>
        <Text style={styles.logoutText}>Chiqish</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  welcome: { alignItems: 'center' },
  coin: { width: 96, height: 96, marginBottom: 20 },
  small: { fontSize: 18, color: '#6B7280', fontWeight: '600' },
  name: { marginTop: 4, fontSize: 38, fontWeight: '900', color: '#000', letterSpacing: -1 },
  logout: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#000' },
});