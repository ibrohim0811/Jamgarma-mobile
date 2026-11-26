import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Alert, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { getMe, Me, registerDevice } from '../lib/register-api';
import { logoutCleanup } from '../lib/session';
import { ApiError, clearTokens } from '../lib/auth-api';
import { clearPin } from '../lib/pin';
import {
  Card,
  Tx,
  getCards,
  getTransactions,
  createCard,
  myCardIds,
  directionOf,
  txMeta,
  computeSpending,
  greeting,
  parseDate,
  whenLabel,
} from '../lib/home-api';
import {
  C,
  Header,
  BalanceCard,
  ActionsRow,
  SpendingCard,
  ActivityList,
  ActivityItem,
  Skeleton,
} from '../components/home-ui';
import { AppTabBar } from '../components/app-tabs';
import { MarketPanel, useMarket } from '../components/market-ui';
import { useWeather } from '../lib/weather';
import RonAiAssistant from '../components/ron-ai-assistant';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [me, setMe] = useState<Me | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [creating, setCreating] = useState(false);
  const [marketKey, setMarketKey] = useState(0);
  const market = useMarket(marketKey); // /info/currencies, /info/crypto, /info/stocks

  // Ob-havo push ruxsatidan keyin so'raladi (ikki ruxsat oynasi to'qnashmasligi uchun)
  const [weatherReady, setWeatherReady] = useState(false);
  const weather = useWeather(weatherReady);

  const load = useCallback(async () => {
    try {
      const [m, c, t] = await Promise.all([getMe(), getCards(), getTransactions()]);
      setMe(m);
      setCards(c);
      setTxs(t);
      setError(null);
    } catch (e) {
      // Sessiya tugagan bo'lsa qayta kirish kerak
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

  // Ekran ochilganda va boshqa ekrandan (to'ldirish, to'lov) qaytganda ma'lumot yangilanadi
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Push token: har safar ilova ochilganda serverga yuboriladi (akkaunt almashsa ham to'g'ri biriktiriladi)
  useEffect(() => {
    registerDevice().finally(() => setWeatherReady(true));
    const fallback = setTimeout(() => setWeatherReady(true), 8000);
    return () => clearTimeout(fallback);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setMarketKey((k) => k + 1);
    load();
  };

  /* ----------------------- Hisoblangan qiymatlar ----------------------- */

  const ids = useMemo(() => myCardIds(cards, txs), [cards, txs]);
  const total = useMemo(() => cards.reduce((s, c) => s + (Number(c.balance) || 0), 0), [cards]);
  const spending = useMemo(() => computeSpending(txs, ids), [txs, ids]);

  const activity: ActivityItem[] = useMemo(
    () =>
      txs.slice(0, 4).map((tx) => {
        const dir = directionOf(tx, ids);
        const meta = txMeta(tx, dir);
        return {
          id: tx.id,
          icon: meta.icon,
          title: meta.title,
          subtitle: `${meta.category} · ${whenLabel(parseDate(tx.created_at))}`,
          amount: Number(tx.amount) || 0,
          dir,
          status: tx.status,
        };
      }),
    [txs, ids]
  );

  const initials = me ? `${me.first_name?.[0] ?? ''}${me.last_name?.[0] ?? ''}`.toUpperCase() : '';

  /* ----------------------------- Amallar ----------------------------- */

  const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  // Karta tafsilotlari ekrani
  const openCard = () => {
    if (!cards[0]) return;
    tap();
    router.push({ pathname: '/card', params: { number: String(cards[0].card_number) } });
  };

  // Tezkor amallar: To'ldirish va To'lovlar ishlaydi, qolganlari keyin
  const onAction = (key: string) => {
    tap();
    if (key === 'topup') router.push('/topup');
    else if (key === 'pay') router.push('/pay');
    else if (key === 'send') router.push('/send');
  };

  const onCreateCard = async () => {
    setCreating(true);
    try {
      await createCard();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Karta ochib bo\'lmadi');
    } finally {
      setCreating(false);
    }
  };

  const onLogout = () => {
    Alert.alert('Chiqish', 'Akkauntdan chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish',
        style: 'destructive',
        onPress: async () => {
          await logoutCleanup(); // push tokenni o'chiradi, tokenlar va parolni tozalaydi
          router.replace('/login');
        },
      },
    ]);
  };

  /* ------------------------------ Ko'rinish ------------------------------ */

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
          gap: 22,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.mint} colors={[C.mint]} />
        }
      >
        <Header
          initials={initials}
          greeting={greeting()}
          name={me?.first_name ?? ''}
          onAvatar={onLogout}
          onBell={tap}
        />

        {error ? (
          <Pressable onPress={onRefresh} style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>Qayta urinish</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <>
            <Skeleton height={210} radius={28} />
            <Skeleton height={86} radius={22} />
            <Skeleton height={170} radius={26} />
            <Skeleton height={190} radius={22} />
          </>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(500)}>
              <BalanceCard
                total={total}
                cardNumber={cards[0]?.card_number}
                cardCount={cards.length}
                frozen={!!cards[0]?.is_frozen}
                hidden={hidden}
                onToggleHidden={() => setHidden((v) => !v)}
                onCreateCard={onCreateCard}
                creating={creating}
                onDetails={openCard}
                onPress={openCard}
                weather={weather}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <ActionsRow onPress={onAction} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <SpendingCard spending={spending} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
              <MarketPanel market={market} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
              <ActivityList items={activity} onViewAll={() => router.push('/transactions')} />
            </Animated.View>
          </>
        )}
      </ScrollView>

      <AppTabBar active="home" />

      {/* Ron AI Yordamchi - ekranda suzib yuradi, bosib fullscreen chat ochiladi */}
      <RonAiAssistant />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  error: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,123,123,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,123,123,0.3)',
    gap: 4,
  },
  errorText: { color: C.red, fontSize: 14, fontWeight: '600' },
  errorRetry: { color: C.sub, fontSize: 12 },
});