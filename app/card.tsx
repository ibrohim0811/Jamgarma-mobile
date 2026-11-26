import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { ApiError } from '../lib/auth-api';
import {
  Card,
  Tx,
  getCards,
  getTransactions,
  myCardIds,
  directionOf,
  txMeta,
  parseDate,
  whenLabel,
  splitMoney,
} from '../lib/home-api';
import { C, ActivityList, ActivityItem, Skeleton } from '../components/home-ui';
import { CardFace, DESIGNS } from '../components/card-designs';
import { getJson, Currencies } from '../components/market-ui';

const SW = Dimensions.get('window').width;
const CARD_W = Math.min(SW - 64, 360);
const GAP = 14;
const ITEM = CARD_W + GAP;
const SIDE = (SW - ITEM) / 2;

const designKey = (number: number) => `card_design_${number}`;
const pad = (n: number) => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ */
/*  Valyuta kurslari (/info/currencies, UZS asosida)                    */
/* ------------------------------------------------------------------ */

function useRates() {
  const [rates, setRates] = useState<Currencies['rates'] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getJson<Currencies>('/info/currencies?base=UZS')
      .then((d) => setRates(d.rates))
      .catch(() => setFailed(true));
  }, []);

  return { rates, failed };
}

const CONVERT = [
  { code: 'USD', symbol: '$', name: 'Dollar' },
  { code: 'EUR', symbol: '€', name: 'Yevro' },
  { code: 'RUB', symbol: '₽', name: 'Rubl' },
];

/* ------------------------------------------------------------------ */
/*  Dizayn sahifasi (surib almashtiriladi)                              */
/* ------------------------------------------------------------------ */

function DesignItem({
  index,
  scrollX,
  number,
  holder,
}: {
  index: number;
  scrollX: SharedValue<number>;
  number: number;
  holder: string;
}) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * ITEM, index * ITEM, (index + 1) * ITEM];
    return {
      transform: [{ scale: interpolate(scrollX.value, input, [0.9, 1, 0.9], 'clamp') }],
      opacity: interpolate(scrollX.value, input, [0.55, 1, 0.55], 'clamp'),
    };
  });

  return (
    <Animated.View style={[{ width: ITEM, paddingHorizontal: GAP / 2 }, style]}>
      <CardFace design={DESIGNS[index]} width={CARD_W} number={number} holder={holder} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Ekran                                                               */
/* ------------------------------------------------------------------ */

export default function CardDetailScreen() {
  const insets = useSafeAreaInsets();
  const { number } = useLocalSearchParams<{ number?: string }>();

  const [card, setCard] = useState<Card | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);

  const { rates, failed } = useRates();

  const listRef = useRef<any>(null);
  const didScroll = useRef(false);
  const scrollX = useSharedValue(0);

  /* ----------------------------- Ma'lumot ----------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const [cards, t] = await Promise.all([getCards(), getTransactions()]);
        const found = cards.find((c) => String(c.card_number) === number) ?? cards[0] ?? null;
        setCard(found);
        setTxs(t);

        // Tanlangan dizayn qurilmada saqlanadi
        if (found) {
          const saved = await SecureStore.getItemAsync(designKey(found.card_number));
          const i = Math.min(Math.max(parseInt(saved ?? '0', 10) || 0, 0), DESIGNS.length - 1);
          setIndex(i);
          scrollX.value = i * ITEM;
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          router.replace('/login');
          return;
        }
        setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    })();
  }, [number]);

  const ids = useMemo(() => myCardIds(card ? [card] : [], txs), [card, txs]);

  const activity: ActivityItem[] = useMemo(() => {
    // Karta ID si API da bo'lsa, faqat shu kartaning tranzaksiyalari
    const list = card?.id ? txs.filter((t) => t.sender_card_id === card.id || t.receiver_card_id === card.id) : txs;

    return list.slice(0, 6).map((tx) => {
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
    });
  }, [txs, ids, card]);

  /* ----------------------------- Pager ----------------------------- */

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(Math.max(Math.round(e.nativeEvent.contentOffset.x / ITEM), 0), DESIGNS.length - 1);
    if (i === index) return;
    setIndex(i);
    Haptics.selectionAsync().catch(() => {});
    if (card) SecureStore.setItemAsync(designKey(card.card_number), String(i)).catch(() => {});
  };

  const design = DESIGNS[index];

  /* ----------------------------- Ko'rinish ----------------------------- */

  const balance = Number(card?.balance ?? 0) || 0;
  const { int, dec } = splitMoney(balance);
  const created = card ? parseDate(card.created_at) : null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Tanlangan dizayn rangida yumshoq yorug'lik */}
      <Animated.View key={design.key} entering={FadeIn.duration(450)} style={styles.glow} pointerEvents="none">
        <Svg width={SW} height={460}>
          <Defs>
            <LinearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={design.accent} stopOpacity={0.38} />
              <Stop offset="1" stopColor={design.accent} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={SW} height={460} fill="url(#glow)" />
        </Svg>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
      >
        {/* Sarlavha */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Karta tafsilotlari</Text>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: 20, gap: 18, marginTop: 20 }}>
            <Skeleton height={CARD_W / 1.586} radius={20} />
            <Skeleton height={120} radius={24} />
            <Skeleton height={180} radius={24} />
          </View>
        ) : error || !card ? (
          <Text style={styles.error}>{error ?? 'Karta topilmadi'}</Text>
        ) : (
          <>
            {/* Dizaynlar: chapga / o'ngga suriladi */}
            <Animated.FlatList
              ref={listRef}
              data={DESIGNS}
              keyExtractor={(d) => d.key}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={ITEM}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              contentContainerStyle={{ paddingHorizontal: SIDE }}
              style={{ marginTop: 22, flexGrow: 0 }}
              scrollEventThrottle={16}
              onScroll={onScroll}
              onMomentumScrollEnd={onEnd}
              initialNumToRender={4}
              windowSize={5}
              onLayout={() => {
                if (didScroll.current) return;
                didScroll.current = true;
                listRef.current?.scrollToOffset({ offset: index * ITEM, animated: false });
              }}
              getItemLayout={(_, i) => ({ length: ITEM, offset: ITEM * i, index: i })}
              renderItem={({ index: i }) => (
                <DesignItem index={i} scrollX={scrollX} number={card.card_number} holder={card.user_fullname} />
              )}
            />

            <Animated.View key={`label-${design.key}`} entering={FadeIn.duration(250)} style={styles.designInfo}>
              <Text style={styles.designName}>{design.name}</Text>
              <Text style={styles.designCount}>
                {index + 1} / {DESIGNS.length} · dizaynni almashtirish uchun suring
              </Text>
            </Animated.View>

            <View style={{ paddingHorizontal: 20, gap: 18, marginTop: 6 }}>
              {/* Balans */}
              <Animated.View entering={FadeInDown.duration(500)} style={styles.panel}>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>Mavjud balans</Text>
                  <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10}>
                    <Feather name={hidden ? 'eye-off' : 'eye'} size={16} color={C.sub} />
                  </Pressable>
                </View>

                {hidden ? (
                  <Text style={styles.balance}>••••••</Text>
                ) : (
                  <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
                    {int}
                    <Text style={styles.balanceDec}>.{dec}</Text>
                    <Text style={styles.balanceCur}> so'm</Text>
                  </Text>
                )}

                {/* Dollar, yevro, rubldagi qiymati */}
                <View style={styles.tiles}>
                  {CONVERT.map((c) => {
                    const rate = rates?.[c.code];
                    const value = rate ? splitMoney(balance * rate) : null;
                    return (
                      <View key={c.code} style={styles.tile}>
                        <Text style={styles.tileCode}>
                          {c.symbol} {c.code}
                        </Text>
                        {rates ? (
                          <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
                            {hidden ? '••••' : value ? `${value.int}.${value.dec}` : '—'}
                          </Text>
                        ) : failed ? (
                          <Text style={styles.tileMuted}>Kurs yo'q</Text>
                        ) : (
                          <Skeleton height={16} radius={6} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Ma'lumotlar */}
              <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.panel}>
                <Info label="Karta raqami" value={String(card.card_number).replace(/(\d{4})(?=\d)/g, '$1 ')} mono />
                <Info label="Karta egasi" value={card.user_fullname} />
                <Info
                  label="Ochilgan sana"
                  value={created ? `${pad(created.getDate())}.${pad(created.getMonth() + 1)}.${created.getFullYear()}` : '—'}
                />
                <Info label="Valyuta" value="UZS · O'zbek so'mi" />
                <Info
                  label="Holat"
                  value={card.is_frozen ? 'Muzlatilgan' : 'Faol'}
                  color={card.is_frozen ? C.amber : C.mint}
                  last
                />
              </Animated.View>

              {/* So'nggi tranzaksiyalar */}
              <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                <ActivityList items={activity} onViewAll={() => {}} />
              </Animated.View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Info({
  label,
  value,
  color,
  mono,
  last,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.info, !last && styles.infoBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color ? { color } : null, mono && { letterSpacing: 1 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  error: { color: C.red, fontSize: 14, textAlign: 'center', marginTop: 60, paddingHorizontal: 20 },

  designInfo: { alignItems: 'center', marginTop: 16, marginBottom: 14 },
  designName: { color: C.text, fontSize: 17, fontWeight: '800' },
  designCount: { color: C.sub, fontSize: 12, marginTop: 4 },

  panel: {
    borderRadius: 24,
    backgroundColor: 'rgba(15,17,16,0.92)',
    borderWidth: 1,
    borderColor: '#1F2321',
    padding: 18,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.sub, fontSize: 14 },
  balance: { color: C.text, fontSize: 38, fontWeight: '700', letterSpacing: -1.2, marginTop: 6 },
  balanceDec: { color: C.sub, fontSize: 24, fontWeight: '600' },
  balanceCur: { color: C.sub, fontSize: 16, fontWeight: '600' },

  tiles: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tile: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#141716',
    borderWidth: 1,
    borderColor: '#202422',
    gap: 6,
  },
  tileCode: { color: C.sub, fontSize: 12, fontWeight: '600' },
  tileValue: { color: C.text, fontSize: 15, fontWeight: '700' },
  tileMuted: { color: C.sub, fontSize: 12 },

  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, gap: 16 },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: '#1A1D1B' },
  infoLabel: { color: C.sub, fontSize: 14 },
  infoValue: { color: C.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
});