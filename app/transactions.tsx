import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, RefreshControl, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ApiError } from '../lib/auth-api';
import { Card, Tx, getCards, getTransactions, myCardIds, money } from '../lib/home-api';
import { buildActivity, dayLabel, ActivityRowData } from '../lib/activity';
import { C, Skeleton } from '../components/home-ui';
import { AppTabBar } from '../components/app-tabs';
import { TxRow } from '../components/tx-row';
import { ScreenHeader, Chip } from '../components/dark-ui';

type Filter = 'all' | 'in' | 'out';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Barchasi' },
  { key: 'in', label: 'Kirim' },
  { key: 'out', label: 'Chiqim' },
];

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

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
  const rows = useMemo(() => buildActivity(txs, ids), [txs, ids]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    rows.forEach((r) => {
      if (r.status === 'failed') return;
      if (r.dir === 'in') income += r.amount;
      if (r.dir === 'out') expense += r.amount;
    });
    return { income, expense };
  }, [rows]);

  // Kunlar bo'yicha guruhlash
  const sections = useMemo(() => {
    const filtered = rows.filter((r) => filter === 'all' || r.dir === filter);
    const map = new Map<string, { title: string; data: ActivityRowData[] }>();
    filtered.forEach((r) => {
      const key = `${r.date.getFullYear()}-${r.date.getMonth()}-${r.date.getDate()}`;
      if (!map.has(key)) map.set(key, { title: dayLabel(r.date), data: [] });
      map.get(key)!.data.push(r);
    });
    return [...map.values()];
  }, [rows, filter]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={{ paddingTop: insets.top + 8 }}>
        <ScreenHeader title="Tranzaksiyalar" onBack={() => router.back()} />
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={76} radius={20} />
          <Skeleton height={64} radius={16} />
          <Skeleton height={64} radius={16} />
          <Skeleton height={64} radius={16} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.id}
          stickySectionHeadersEnabled={false}
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
          ListHeaderComponent={
            <View style={{ paddingTop: 18, paddingBottom: 6, gap: 16 }}>
              <View style={styles.summary}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sumLabel}>Kirim</Text>
                  <Text style={[styles.sumValue, { color: C.mint }]} numberOfLines={1} adjustsFontSizeToFit>
                    +{money(totals.income)}
                  </Text>
                </View>
                <View style={styles.sumDivider} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sumLabel}>Chiqim</Text>
                  <Text style={styles.sumValue} numberOfLines={1} adjustsFontSizeToFit>
                    −{money(totals.expense)}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FILTERS.map((f) => (
                  <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
                ))}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          }
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item }) => <TxRow item={item} />}
          ListEmptyComponent={<Text style={styles.empty}>Hozircha tranzaksiyalar yo'q</Text>}
        />
      )}

      <AppTabBar active="transactions" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#1F2321',
    gap: 16,
  },
  sumLabel: { color: C.sub, fontSize: 12 },
  sumValue: { color: C.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  sumDivider: { width: 1, height: 36, backgroundColor: '#1F2321' },
  sectionTitle: { color: C.sub, fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 2 },
  empty: { color: C.sub, fontSize: 14, textAlign: 'center', paddingVertical: 50 },
  error: { color: C.red, fontSize: 13, fontWeight: '600' },
});