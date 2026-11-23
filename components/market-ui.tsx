import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { API_URL } from '../lib/auth-api';
import { money, splitMoney } from '../lib/home-api';
import { C, Skeleton } from './home-ui';

/* ------------------------------------------------------------------ */
/*  Turlar (API hujjatidagi /info/* javoblari)                          */
/* ------------------------------------------------------------------ */

export type Currencies = { base: string; provider: string; rates: Record<string, number> };

type Crypto = {
  BTC: {
    pair: string;
    price_usdt: number;
    price_change_pct_24h: number;
    high_24h: number;
    low_24h: number;
    volume_24h_btc: number;
  };
  USDT: {
    price_usd: number;
    price_change_pct_24h: number;
    volume_24h_usd: number;
  };
};

type StockRow = {
  current_price?: number;
  change?: number;
  change_pct?: number;
  prev_close?: number;
  error?: string;
};
type Stocks = { provider?: string; note?: string; stocks: Record<string, StockRow> };

type Section<T> = { data: T | null; loading: boolean; error: string | null };
const initial = <T,>(): Section<T> => ({ data: null, loading: true, error: null });

/* ------------------------------------------------------------------ */
/*  So'rovlar (auth kerak emas)                                         */
/* ------------------------------------------------------------------ */

export async function getJson<T>(path: string, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'Xatolik yuz berdi');
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Server javob bermadi');
    if (e instanceof TypeError) throw new Error("Serverga ulanib bo'lmadi");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Uchala /info endpointini bir-biriga bog'liq bo'lmagan holda yuklaydi */
export function useMarket(refreshKey = 0) {
  const [fx, setFx] = useState<Section<Currencies>>(initial());
  const [crypto, setCrypto] = useState<Section<Crypto>>(initial());
  const [stocks, setStocks] = useState<Section<Stocks>>(initial());

  const run = useCallback(
    async <T,>(set: React.Dispatch<React.SetStateAction<Section<T>>>, fetcher: () => Promise<T>) => {
      set((p) => ({ ...p, loading: true, error: null }));
      try {
        const data = await fetcher();
        set({ data, loading: false, error: null });
      } catch (e) {
        // Eski ma'lumot saqlanib qoladi, faqat xato belgilanadi
        set((p) => ({ ...p, loading: false, error: e instanceof Error ? e.message : 'Xatolik' }));
      }
    },
    []
  );

  const load = useCallback(() => {
    run(setFx, () => getJson<Currencies>('/info/currencies?base=UZS'));
    run(setCrypto, () => getJson<Crypto>('/info/crypto'));
    run(setStocks, () => getJson<Stocks>('/info/stocks', 25000));
  }, [run]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return { fx, crypto, stocks, reload: load };
}

export type Market = ReturnType<typeof useMarket>;

/* ------------------------------------------------------------------ */
/*  Formatlar                                                           */
/* ------------------------------------------------------------------ */

const usd = (n: number) => {
  const { int, dec } = splitMoney(n);
  return `$${int}.${dec}`;
};

const uzs = (n: number) => (n >= 1000 ? money(Math.round(n)) : n.toFixed(2));

const compact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)} mlrd` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} mln` : money(Math.round(n));

/* ------------------------------------------------------------------ */
/*  Qator                                                               */
/* ------------------------------------------------------------------ */

function ChangePill({ value }: { value: number }) {
  const up = value >= 0;
  const color = up ? C.mint : C.red;
  return (
    <View style={[s.pill, { backgroundColor: up ? 'rgba(189,247,214,0.1)' : 'rgba(255,123,123,0.1)' }]}>
      <Feather name={up ? 'trending-up' : 'trending-down'} size={12} color={color} />
      <Text style={[s.pillText, { color }]}>
        {up ? '+' : ''}
        {value.toFixed(2)}%
      </Text>
    </View>
  );
}

function Row({
  badge,
  title,
  subtitle,
  value,
  change,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  value: string;
  change?: number | null;
}) {
  return (
    <View style={s.row}>
      <View style={s.badge}>
        <Text style={s.badgeText}>{badge}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? (
          <Text style={s.rowSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Text style={s.rowValue}>{value}</Text>
        {change != null ? <ChangePill value={change} /> : null}
      </View>
    </View>
  );
}

function Loading() {
  return (
    <View style={{ gap: 10, paddingTop: 6 }}>
      <Skeleton height={48} radius={14} />
      <Skeleton height={48} radius={14} />
      <Skeleton height={48} radius={14} />
    </View>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Pressable onPress={onRetry} style={s.errorBox}>
      <Feather name="wifi-off" size={18} color={C.sub} />
      <Text style={s.errorText}>{message}</Text>
      <Text style={s.retry}>Qayta urinish</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Tablar: Valyuta | Kripto | Aksiyalar                                */
/* ------------------------------------------------------------------ */

const FX_LIST = [
  { code: 'USD', name: 'AQSH dollari', symbol: '$' },
  { code: 'EUR', name: 'Yevro', symbol: '€' },
  { code: 'RUB', name: 'Rossiya rubli', symbol: '₽' },
];

type TabKey = 'fx' | 'crypto' | 'stocks';

export function MarketPanel({ market }: { market: Market }) {
  const { fx, crypto, stocks, reload } = market;
  const [tab, setTab] = useState<TabKey>('fx');

  const stockEntries = Object.entries(stocks.data?.stocks ?? {});
  // Finnhub kaliti yo'q bo'lsa aksiyalar bo'sh keladi, shunda tabni yashiramiz
  const showStocks = stocks.loading || !!stocks.error || stockEntries.length > 0;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'fx', label: 'Valyuta' },
    { key: 'crypto', label: 'Kripto' },
    ...(showStocks ? [{ key: 'stocks' as TabKey, label: 'Aksiyalar' }] : []),
  ];

  const active: TabKey = tabs.some((t) => t.key === tab) ? tab : 'fx';

  /* --------------------------- Tab mazmuni --------------------------- */

  let body: React.ReactNode;
  let source = '';

  if (active === 'fx') {
    source = fx.data?.provider ?? 'open.er-api.com';
    if (fx.loading && !fx.data) body = <Loading />;
    else if (!fx.data) body = <ErrorBox message={fx.error ?? "Kurslarni olib bo'lmadi"} onRetry={reload} />;
    else {
      const rows = FX_LIST.filter((c) => fx.data!.rates[c.code] > 0);
      body = rows.length ? (
        rows.map((c) => (
          <Row
            key={c.code}
            badge={c.symbol}
            title={c.code}
            subtitle={c.name}
            value={`${uzs(1 / fx.data!.rates[c.code])} so'm`}
          />
        ))
      ) : (
        <Text style={s.empty}>Kurslar hozircha mavjud emas</Text>
      );
    }
  } else if (active === 'crypto') {
    source = 'Binance · CoinGecko';
    if (crypto.loading && !crypto.data) body = <Loading />;
    else if (!crypto.data) body = <ErrorBox message={crypto.error ?? "Ma'lumotni olib bo'lmadi"} onRetry={reload} />;
    else {
      const { BTC, USDT } = crypto.data;
      body = (
        <>
          <Row
            badge="₿"
            title="Bitcoin"
            subtitle={`24s: ${usd(BTC.low_24h)} – ${usd(BTC.high_24h)}`}
            value={usd(BTC.price_usdt)}
            change={BTC.price_change_pct_24h}
          />
          <Row
            badge="₮"
            title="Tether"
            subtitle={`Hajm: ${compact(USDT.volume_24h_usd)} $`}
            value={usd(USDT.price_usd)}
            change={USDT.price_change_pct_24h}
          />
        </>
      );
    }
  } else {
    source = stocks.data?.provider ?? 'finnhub.io';
    if (stocks.loading && !stocks.data) body = <Loading />;
    else if (!stocks.data) body = <ErrorBox message={stocks.error ?? "Ma'lumotni olib bo'lmadi"} onRetry={reload} />;
    else {
      body = stockEntries.map(([symbol, st]) =>
        st.current_price != null ? (
          <Row
            key={symbol}
            badge={symbol[0]}
            title={symbol}
            subtitle={st.prev_close != null ? `Oldingi yopilish: ${usd(st.prev_close)}` : undefined}
            value={usd(st.current_price)}
            change={st.change_pct ?? null}
          />
        ) : (
          <Row key={symbol} badge={symbol[0]} title={symbol} subtitle="Ma'lumot mavjud emas" value="—" />
        )
      );
    }
  }

  return (
    <View style={s.panel}>
      <View style={s.head}>
        <Text style={s.title}>Bozor</Text>
        <Pressable onPress={reload} hitSlop={10} style={s.reload}>
          <Feather name="refresh-cw" size={14} color={C.sub} />
        </Pressable>
      </View>

      <View style={s.tabs}>
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[s.tab, on && s.tabOn]}>
              <Text style={[s.tabText, on && s.tabTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View key={active} entering={FadeIn.duration(250)} style={{ marginTop: 8 }}>
        {body}
      </Animated.View>

      <Text style={s.source}>Manba: {source}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    borderRadius: 26,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#1F2321',
    padding: 18,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.text, fontSize: 16, fontWeight: '700' },
  reload: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#151816',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 14,
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#141716',
    gap: 4,
  },
  tab: { flex: 1, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: '#242A26' },
  tabText: { color: C.sub, fontSize: 13, fontWeight: '600' },
  tabTextOn: { color: C.text },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#121413',
    borderWidth: 1,
    borderColor: '#242826',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: C.mint, fontSize: 18, fontWeight: '800' },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  rowSub: { color: C.sub, fontSize: 12, marginTop: 2 },
  rowValue: { color: C.text, fontSize: 15, fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
  },
  pillText: { fontSize: 11, fontWeight: '700' },

  empty: { color: C.sub, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  errorBox: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  errorText: { color: C.sub, fontSize: 13, textAlign: 'center' },
  retry: { color: C.mint, fontSize: 13, fontWeight: '700' },
  source: { color: '#5E6360', fontSize: 11, marginTop: 6 },
});