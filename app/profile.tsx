import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ApiError } from '../lib/auth-api';
import { Card, getCards, money, setCardFrozen } from '../lib/home-api';
import { Me, getMe } from '../lib/register-api';
import {
  BiometricKind,
  biometricKind,
  biometricLabel,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticateBiometric,
  clearPin,
} from '../lib/pin';
import { clearTokens } from '../lib/auth-api';
import { logoutCleanup } from '../lib/session';
import { C, Skeleton } from '../components/home-ui';
import { AppTabBar } from '../components/app-tabs';
import { ScreenHeader } from '../components/dark-ui';

type IconName = React.ComponentProps<typeof Feather>['name'];

/** "+998901234567" → "+998 90 123 45 67" */
const fmtPhone = (p: string) => {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(p ?? '');
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
};

/** 1008123456789012 → "1008 1234 5678 9012" */
const fmtCard = (n: number | string) => String(n).replace(/(\d{4})(?=\d)/g, '$1 ');

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/* ------------------------------------------------------------------ */
/*  Kichik komponentlar                                                 */
/* ------------------------------------------------------------------ */

function Row({
  icon,
  label,
  value,
  right,
  onPress,
  danger,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowIcon, danger && { backgroundColor: '#2A1414' }]}>
        <Feather name={icon} size={18} color={danger ? C.red : C.mint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && { color: C.red }]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

/* ------------------------------------------------------------------ */
/*  Ekran                                                               */
/* ------------------------------------------------------------------ */

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  const [me, setMe] = useState<Me | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bioKind, setBioKind] = useState<BiometricKind | null>(null);
  const [bioOn, setBioOn] = useState(false);
  const [freezing, setFreezing] = useState(false);

  const card = cards[0];

  const load = useCallback(async () => {
    try {
      const [m, c, kind, enabled] = await Promise.all([
        getMe(),
        getCards(),
        biometricKind(),
        isBiometricEnabled(),
      ]);
      setMe(m);
      setCards(c);
      setBioKind(kind);
      setBioOn(enabled && !!kind);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await clearTokens();
        await clearPin();
        router.replace('/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const tap = () => Haptics.selectionAsync().catch(() => {});

  /* ------------------------------ Amallar ------------------------------ */

  const onToggleFreeze = () => {
    if (!card || freezing) return;
    const willFreeze = !card.is_frozen;

    const run = async () => {
      setFreezing(true);
      try {
        const updated = await setCardFrozen(card.card_number, willFreeze);
        setCards((list) => list.map((c, i) => (i === 0 ? { ...c, ...updated } : c)));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert('Xatolik', e instanceof Error ? e.message : 'Xatolik yuz berdi');
      } finally {
        setFreezing(false);
      }
    };

    if (willFreeze) {
      Alert.alert(
        'Kartani muzlatish',
        "Muzlatilgan kartadan to'lov va o'tkazma qilib bo'lmaydi, unga pul ham o'tkazib bo'lmaydi.",
        [
          { text: 'Bekor qilish', style: 'cancel' },
          { text: 'Muzlatish', style: 'destructive', onPress: run },
        ]
      );
    } else {
      run();
    }
  };

  const onToggleBio = async (next: boolean) => {
    if (!bioKind) return;
    if (next) {
      // Yoqishdan oldin shaxsni tasdiqlatamiz
      const ok = await authenticateBiometric();
      if (!ok) return;
    }
    await setBiometricEnabled(next);
    setBioOn(next);
    tap();
  };

  const onLogout = () => {
    Alert.alert('Chiqish', 'Akkauntdan chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish',
        style: 'destructive',
        onPress: async () => {
          await logoutCleanup();
          router.replace('/login');
        },
      },
    ]);
  };

  const initials = me ? `${me.first_name?.[0] ?? ''}${me.last_name?.[0] ?? ''}`.toUpperCase() : '';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  /* ------------------------------ Ko'rinish ------------------------------ */

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={C.mint}
            colors={[C.mint]}
          />
        }
      >
        <ScreenHeader title="Profil" onBack={() => router.dismissTo('/home')} />

        <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 20 }}>
          {error ? (
            <Pressable
              onPress={() => {
                setRefreshing(true);
                load();
              }}
              style={styles.error}
            >
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.errorRetry}>Qayta urinish</Text>
            </Pressable>
          ) : null}

          {loading ? (
            <>
              <Skeleton height={170} radius={28} />
              <Skeleton height={150} radius={22} />
              <Skeleton height={130} radius={22} />
            </>
          ) : (
            <>
              {/* Foydalanuvchi */}
              <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials || '··'}</Text>
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {me ? `${me.first_name} ${me.last_name}` : ''}
                </Text>
                <Text style={styles.phone}>{me ? fmtPhone(me.phone_number) : ''}</Text>
                {me ? (
                  <View style={[styles.badge, !me.is_active && styles.badgeOff]}>
                    <View style={[styles.dot, { backgroundColor: me.is_active ? C.mint : C.red }]} />
                    <Text style={[styles.badgeText, !me.is_active && { color: C.red }]}>
                      {me.is_active ? 'Faol akkaunt' : 'Bloklangan'}
                    </Text>
                  </View>
                ) : null}
              </Animated.View>

              {/* Karta */}
              <Animated.View entering={FadeInDown.delay(80).duration(450)}>
                <Text style={styles.groupTitle}>Karta</Text>
                <View style={styles.group}>
                  {card ? (
                    <>
                      <Row
                        icon="credit-card"
                        label="Karta raqami"
                        value={fmtCard(card.card_number)}
                      />
                      <Row
                        icon="dollar-sign"
                        label="Balans"
                        value={`${money(Number(card.balance) || 0)} so'm`}
                      />
                      <Row
                        icon="calendar"
                        label="Ochilgan sana"
                        value={fmtDate(card.created_at)}
                      />
                      <Row
                        icon={card.is_frozen ? 'unlock' : 'lock'}
                        label={card.is_frozen ? 'Kartani muzdan chiqarish' : 'Kartani muzlatish'}
                        value={card.is_frozen ? 'Karta hozir muzlatilgan' : 'Vaqtincha bloklash'}
                        onPress={onToggleFreeze}
                        right={
                          freezing ? undefined : (
                            <Feather name="chevron-right" size={18} color={C.sub} />
                          )
                        }
                        last
                      />
                    </>
                  ) : (
                    <Row
                      icon="credit-card"
                      label="Karta ochilmagan"
                      value={'Bosh ekranda "Karta ochish" tugmasini bosing'}
                      last
                    />
                  )}
                </View>
              </Animated.View>

              {/* Xavfsizlik */}
              <Animated.View entering={FadeInDown.delay(160).duration(450)}>
                <Text style={styles.groupTitle}>Xavfsizlik</Text>
                <View style={styles.group}>
                  {bioKind ? (
                    <Row
                      icon={bioKind === 'face' ? 'smile' : 'unlock'}
                      label={biometricLabel(bioKind)}
                      value="Ilovaga tez kirish"
                      right={
                        <Switch
                          value={bioOn}
                          onValueChange={onToggleBio}
                          trackColor={{ false: '#242826', true: C.mint }}
                          thumbColor="#fff"
                        />
                      }
                      last
                    />
                  ) : (
                    <Row
                      icon="shield"
                      label="Biometrik kirish"
                      value="Qurilmada Face ID / barmoq izi sozlanmagan"
                      last
                    />
                  )}
                </View>
              </Animated.View>

              {/* Chiqish */}
              <Animated.View entering={FadeInDown.delay(240).duration(450)}>
                <View style={styles.group}>
                  <Row icon="log-out" label="Akkauntdan chiqish" onPress={onLogout} danger last />
                </View>
                <Text style={styles.version}>Jamg'arma · v{version}</Text>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>

      <AppTabBar active="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#1F2321',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: C.mintDark,
    borderWidth: 1,
    borderColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.mint, fontSize: 30, fontWeight: '800' },
  name: { color: C.text, fontSize: 20, fontWeight: '800', marginTop: 14 },
  phone: { color: C.sub, fontSize: 14, marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.mintDark,
  },
  badgeOff: { backgroundColor: '#2A1414' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { color: C.mint, fontSize: 12, fontWeight: '700' },

  groupTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  group: {
    borderRadius: 22,
    backgroundColor: '#0F1110',
    borderWidth: 1,
    borderColor: '#1F2321',
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#1A1D1B' },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.mintDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { color: C.text, fontSize: 15, fontWeight: '600' },
  rowValue: { color: C.sub, fontSize: 12, marginTop: 3 },

  version: { color: C.sub, fontSize: 12, textAlign: 'center', marginTop: 16 },

  error: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#1F1111',
    borderWidth: 1,
    borderColor: '#3A1B1B',
    gap: 4,
  },
  errorText: { color: C.red, fontSize: 13, fontWeight: '600' },
  errorRetry: { color: C.sub, fontSize: 12 },
});