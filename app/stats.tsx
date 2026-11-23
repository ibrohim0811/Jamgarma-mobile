import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ApiError } from '../lib/auth-api';
import { Card, Tx, getCards, getTransactions, myCardIds, money } from '../lib/home-api';
import { computeStats, contribution, CATEGORIES, DayPoint, WEEKDAYS_SHORT } from '../lib/stats-calc';
import { C, Skeleton } from '../components/home-ui';
import { AppTabBar } from '../components/app-tabs';
import { ScreenHeader, Chip } from '../components/dark-ui';
import { ContributionGraph } from '../components/contribution-graph';

const PERIODS = [
  { days: 7, label: '7 kun' },
  { days: 30, label: '30 kun' },
  { days: 90, label: '90 kun' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const ddmm = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;

type IconName = React.ComponentProps<typeof Feather>['name'];

/* ------------------------------------------------------------------ */
/*  Kunlik kirim / chiqim ustunlari                                     */
/* ------------------------------------------------------------------ */

function DailyBars({ daily }: { daily: DayPoint[] }) {
  const H = 120;
  const max = Math.max(1, ...daily.flatMap((d) => [d.income, d.expense]));
  const has = daily.some((d) => d.income > 0 || d.expense > 0);
  const gap = daily.length > 31 ? 1 : daily.length > 7 ? 3 : 8;

  if (!has) return <Text style={s.empty}>Bu davrda operatsiyalar yo'q</Text>;

  return (
    <View>
      <View style={{ height: H, flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {daily.map((d, i) => (
          <View key={i} style={{ flex: 1, height: H, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
            <View
              style={{
                flex: 1,
                height: d.income > 0 ? Math.max(3, (d.income / max) * H) : 0,
                backgroundColor: C.mint,
                borderRadius: 2,
              }}
            />
            <View
              style={{
                flex: 1,
                height: d.expense > 0 ? Math.max(3, (d.expense / max) * H) : 0,
                backgroundColor: '#9AA09C',
                borderRadius: 2,
              }}
            />
          </View>
        ))}
      </View>

      {daily.length <= 7 ? (
        <View style={{ flexDirection: 'row', gap, marginTop: 8 }}>
          {daily.map((d, i) => (
            <Text key={i} style={[s.axis, { flex: 1, textAlign: 'center' }]}>
              {WEEKDAYS_SHORT[(d.date.getDay() + 6) % 7]}
            </Text>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={s.axis}>{ddmm(daily[0].date)}</Text>
          <Text style={s.axis}>{ddmm(daily[Math.floor(daily.length / 2)].date)}</Text>
          <Text style={s.axis}>{ddmm(daily[daily.length - 1].date)}</Text>
        </View>
      )}

      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: C.mint }]} />
          <Text style={s.legendText}>Kirim</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: '#9AA09C' }]} />
          <Text style={s.legendText}>Chiqim</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Ekran                                                               */
/* ------------------------------------------------------------------ */

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([getTransactions(), getCards()]);
      setTxs(t);
      setCards(c);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
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

  const ids = useMemo(() => myCardIds(cards, txs), [cards, txs]);
  const stats = useMemo(() => computeStats(txs, ids, days), [txs, ids, days]);
  const graph = useMemo(() => contribution(txs, ids), [txs, ids]);

  const catTotal = stats.categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
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
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }}
      >
        <ScreenHeader title="Statistika" onBack={() => router.back()} />

        {loading ? (
          <View style={{ padding: 20, gap: 16 }}>
            <Skeleton height={44} radius={14} />
            <Skeleton height={110} radius={22} />
            <Skeleton height={230} radius={24} />
            <Skeleton height={200} radius={24} />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 18, marginTop: 18 }}>
            {error ? <Text style={s.error}>{error}</Text> : null}

            {/* Davr */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PERIODS.map((p) => (
                <Chip key={p.days} label={p.label} active={days === p.days} onPress={() => setDays(p.days)} />
              ))}
            </View>

            {/* Kirim / chiqim */}
            <Animated.View entering={FadeInDown.duration(450)} style={styles.panel}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <View style={s.rowCenter}>
                    <Feather name="arrow-down-left" size={14} color={C.mint} />
                    <Text style={s.label}>Kirim</Text>
                  </View>
                  <Text style={[s.big, { color: C.mint }]} numberOfLines={1} adjustsFontSizeToFit>
                    +{money(stats.income)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.rowCenter}>
                    <Feather name="arrow-up-right" size={14} color={C.text} />
                    <Text style={s.label}>Chiqim</Text>
                  </View>
                  <Text style={s.big} numberOfLines={1} adjustsFontSizeToFit>
                    −{money(stats.expense)}
                  </Text>
                </View>
              </View>

              <View style={styles.hr} />

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Sof o'zgarish</Text>
                  <Text style={[s.mid, { color: stats.net >= 0 ? C.mint : C.red }]} numberOfLines={1} adjustsFontSizeToFit>
                    {stats.net >= 0 ? '+' : '−'}
                    {money(Math.abs(stats.net))}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Kunlik o'rtacha chiqim</Text>
                  <Text style={s.mid} numberOfLines={1} adjustsFontSizeToFit>
                    {money(Math.round(stats.avgDaily))}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Kunlik ustunlar */}
            <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.panel}>
              <Text style={s.title}>Kunlik harakat</Text>
              <View style={{ marginTop: 16 }}>
                <DailyBars daily={stats.daily} />
              </View>
            </Animated.View>

            {/* Chiqim kategoriyalari */}
            <Animated.View entering={FadeInDown.delay(180).duration(450)} style={styles.panel}>
              <Text style={s.title}>Chiqim turlari</Text>

              {catTotal === 0 ? (
                <Text style={s.empty}>Bu davrda chiqim yo'q</Text>
              ) : (
                <View style={{ gap: 16, marginTop: 16 }}>
                  {stats.categories
                    .filter((c) => c.amount > 0)
                    .sort((a, b) => b.amount - a.amount)
                    .map((c) => {
                      const meta = CATEGORIES[c.key];
                      const pct = (c.amount / catTotal) * 100;
                      return (
                        <View key={c.key}>
                          <View style={s.rowBetween}>
                            <View style={s.rowCenter}>
                              <View style={[s.dot, { backgroundColor: meta.color }]} />
                              <Text style={s.catName}>{meta.label}</Text>
                            </View>
                            <Text style={s.catAmount}>{money(c.amount)} so'm</Text>
                          </View>
                          <View style={s.track}>
                            <View style={[s.fill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                          </View>
                          <Text style={s.catMeta}>
                            {pct.toFixed(0)}% · {c.count} ta operatsiya
                          </Text>
                        </View>
                      );
                    })}
                </View>
              )}
            </Animated.View>

            {/* Eng ko'p xarajat qilingan xizmatlar */}
            {stats.items.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(240).duration(450)} style={styles.panel}>
                <Text style={s.title}>Eng ko'p xarajatlar</Text>
                <View style={{ marginTop: 8 }}>
                  {stats.items.map((it, i) => (
                    <View key={it.key} style={[s.itemRow, i < stats.items.length - 1 && s.itemBorder]}>
                      <View style={s.itemIcon}>
                        <Feather name={it.icon as IconName} size={18} color={C.text} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.catName}>{it.title}</Text>
                        <Text style={s.catMeta}>{it.count} ta operatsiya</Text>
                      </View>
                      <Text style={s.catAmount}>{money(it.amount)} so'm</Text>
                    </View>
                  ))}
                </View>

                {stats.biggest ? (
                  <Text style={s.biggest}>
                    Eng katta chiqim: {stats.biggest.title}, {money(stats.biggest.amount)} so'm ({ddmm(stats.biggest.date)})
                  </Text>
                ) : null}
              </Animated.View>
            ) : null}

            {/* Contribution graph */}
            <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.panel}>
              <Text style={s.title}>Kirimlar faolligi</Text>
              <Text style={s.sub}>
                Oxirgi 12 oy · {graph.count} ta kirim · jami {money(graph.total)} so'm
              </Text>
              <View style={{ marginTop: 16 }}>
                <ContributionGraph data={graph} />
              </View>
            </Animated.View>

            {stats.unknown > 0 ? (
              <Text style={s.note}>
                {stats.unknown} ta P2P o'tkazmaning yo'nalishi (kirim yoki chiqim) aniqlanmadi, shuning uchun hisobga
                olinmadi. Backendda /cards/ javobiga karta `id` qo'shilsa, ular ham hisoblanadi.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <AppTabBar active="stats" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  panel: {
    borderRadius: 24,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#1F2321',
    padding: 18,
  },
  hr: { height: 1, backgroundColor: '#1A1D1B', marginVertical: 16 },
});

const s = StyleSheet.create({
  title: { color: C.text, fontSize: 16, fontWeight: '700' },
  sub: { color: C.sub, fontSize: 12, marginTop: 4 },
  label: { color: C.sub, fontSize: 12 },
  big: { color: C.text, fontSize: 24, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  mid: { color: C.text, fontSize: 17, fontWeight: '700', marginTop: 6 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  axis: { color: C.sub, fontSize: 10 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { color: C.sub, fontSize: 12 },
  empty: { color: C.sub, fontSize: 14, textAlign: 'center', paddingVertical: 28 },
  error: { color: C.red, fontSize: 13, fontWeight: '600' },

  catName: { color: C.text, fontSize: 14, fontWeight: '600' },
  catAmount: { color: C.text, fontSize: 14, fontWeight: '700' },
  catMeta: { color: C.sub, fontSize: 11, marginTop: 4 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#1C1F1D', marginTop: 10, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#1A1D1B' },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#121413',
    borderWidth: 1,
    borderColor: '#242826',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biggest: { color: C.sub, fontSize: 12, marginTop: 10, lineHeight: 18 },
  note: { color: '#6B716D', fontSize: 11, lineHeight: 16, paddingHorizontal: 4 },
});