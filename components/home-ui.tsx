import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { splitMoney, money, MONTHS, Spending, Direction } from '../lib/home-api';
import { WeatherInfo, weatherTint, weatherIcon } from '../lib/weather';
import { WeatherBackground } from './weather-bg';

export const C = {
  bg: '#050505',
  card: '#0F1110',
  cardAlt: '#131514',
  border: '#1F2321',
  text: '#FFFFFF',
  sub: '#8C918E',
  mint: '#BDF7D6',
  mintDark: '#12281C',
  red: '#FF7B7B',
  amber: '#F5B95F',
};

type IconName = React.ComponentProps<typeof Feather>['name'];

/* ------------------------------------------------------------------ */
/*  Skeleton (yuklanayotganda)                                          */
/* ------------------------------------------------------------------ */

export function Skeleton({ height, radius = 24, style }: { height: number; radius?: number; style?: ViewStyle }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const a = useAnimatedStyle(() => ({ opacity: 0.35 + 0.35 * p.value }));

  return <Animated.View style={[{ height, borderRadius: radius, backgroundColor: '#1A1D1B' }, style, a]} />;
}

/* ------------------------------------------------------------------ */
/*  Sarlavha: avatar + salomlashish + qo'ng'iroq                        */
/* ------------------------------------------------------------------ */

export function Header({
  initials,
  greeting,
  name,
  onAvatar,
  onBell,
}: {
  initials: string;
  greeting: string;
  name: string;
  onAvatar: () => void;
  onBell: () => void;
}) {
  return (
    <View style={h.row}>
      <Pressable onPress={onAvatar} style={h.avatar}>
        <Text style={h.avatarText}>{initials || '··'}</Text>
      </Pressable>

      <View style={h.texts}>
        <Text style={h.greet} numberOfLines={1}>
          {greeting}
          {name ? `, ${name}` : ''}
        </Text>
        <Text style={h.title}>Hayotga joy qoldiring.</Text>
      </View>

      <Pressable onPress={onBell} style={h.bell}>
        <Feather name="bell" size={20} color={C.text} />
      </Pressable>
    </View>
  );
}

const h = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#161816',
    borderWidth: 1,
    borderColor: '#2A2E2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.text, fontSize: 15, fontWeight: '700' },
  texts: { flex: 1 },
  greet: { color: C.sub, fontSize: 13 },
  title: { color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 1 },
  bell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#161816',
    borderWidth: 1,
    borderColor: '#2A2E2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/* ------------------------------------------------------------------ */
/*  Gul barglari (kartaning o'ng tomoni, kod bilan chizilgan)           */
/* ------------------------------------------------------------------ */

const FLOWERS = [
  { x: 128, y: 40, s: 1.3 },
  { x: 78, y: 20, s: 0.75 },
  { x: 150, y: 104, s: 1.5 },
  { x: 100, y: 116, s: 0.9 },
  { x: 48, y: 76, s: 0.6 },
  { x: 132, y: 168, s: 1.0 },
];

const PETALS = [
  { x: 30, y: 130, r: 30, o: 0.45 },
  { x: 60, y: 160, r: -40, o: 0.35 },
  { x: 14, y: 60, r: 70, o: 0.3 },
  { x: 90, y: 70, r: 15, o: 0.55 },
  { x: 160, y: 60, r: -25, o: 0.7 },
  { x: 70, y: 190, r: 55, o: 0.4 },
  { x: 120, y: 8, r: -60, o: 0.6 },
];

function Flower({ x, y, s }: { x: number; y: number; s: number }) {
  const W = 17 * s;
  const H = 11 * s;

  return (
    <View style={{ position: 'absolute', left: x, top: y }}>
      {[0, 72, 144, 216, 288].map((a, i) => (
        <View
          key={a}
          style={{
            position: 'absolute',
            left: -W / 2,
            top: -H / 2,
            width: W,
            height: H,
            borderRadius: H / 2,
            backgroundColor: i % 2 === 0 ? '#F8CBD9' : '#F1A8C0',
            opacity: 0.92,
            transform: [{ rotate: `${a}deg` }, { translateX: W * 0.55 }],
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: -3 * s,
          top: -3 * s,
          width: 6 * s,
          height: 6 * s,
          borderRadius: 3 * s,
          backgroundColor: '#F8E3A0',
        }}
      />
    </View>
  );
}

function Blossoms() {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const sway = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 + 6 * p.value }, { rotate: `${-1.5 + 3 * p.value}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.blossoms, sway]}>
      {PETALS.map((pt, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: pt.x,
            top: pt.y,
            width: 12,
            height: 8,
            backgroundColor: '#F4B6C8',
            opacity: pt.o,
            borderTopLeftRadius: 8,
            borderBottomRightRadius: 8,
            borderTopRightRadius: 2,
            borderBottomLeftRadius: 2,
            transform: [{ rotate: `${pt.r}deg` }],
          }}
        />
      ))}
      {FLOWERS.map((f, i) => (
        <Flower key={i} {...f} />
      ))}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Balans kartasi                                                      */
/* ------------------------------------------------------------------ */

export function BalanceCard({
  total,
  cardNumber,
  cardCount,
  frozen,
  hidden,
  onToggleHidden,
  onCreateCard,
  creating,
  onDetails,
  weather,
  onPress,
}: {
  total: number;
  cardNumber?: number;
  cardCount: number;
  frozen: boolean;
  hidden: boolean;
  onToggleHidden: () => void;
  onCreateCard: () => void;
  creating: boolean;
  onDetails: () => void;
  weather?: WeatherInfo | null;
  onPress?: () => void;
}) {
  const { int, dec } = splitMoney(total);
  const last4 = cardNumber ? String(cardNumber).slice(-4) : null;
  const tint = weather ? weatherTint(weather.kind) : '#0E1210';

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: tint }]}>
      {/* Ob-havoga mos animatsiya (bahorda ochiq kunda gullar) */}
      {weather?.kind === 'blossom' ? <Blossoms /> : <WeatherBackground kind={weather?.kind ?? null} />}

      <View style={styles.cardTop}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>jamgarma</Text>
          <View style={styles.vDivider} />
          <Text style={styles.account}>ASOSIY HISOB</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {weather ? (
            <View style={[styles.currency, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
              <Feather name={weatherIcon(weather.kind) as any} size={13} color={C.text} />
              <Text style={styles.currencyText}>{Math.round(weather.temp)}°</Text>
            </View>
          ) : null}
          <View style={styles.currency}>
            <Text style={styles.currencyText}>UZS</Text>
          </View>
        </View>
      </View>

      <View style={styles.labelRow}>
        <Text style={styles.label}>Mavjud balans</Text>
        <Pressable onPress={onToggleHidden} hitSlop={10}>
          <Feather name={hidden ? 'eye-off' : 'eye'} size={15} color={C.sub} />
        </Pressable>
      </View>

      {hidden ? (
        <Text style={styles.balanceHidden}>••••••</Text>
      ) : (
        <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
          {int}
          <Text style={styles.balanceDec}>.{dec}</Text>
        </Text>
      )}

      <View style={styles.cardBottom}>
        {cardNumber ? (
          <View style={styles.dotsRow}>
            <Text style={styles.last4}>•••• {last4}</Text>
            {cardCount > 1 ? <Text style={styles.more}>+{cardCount - 1} karta</Text> : null}
            {frozen ? (
              <View style={styles.frozen}>
                <Feather name="slash" size={11} color={C.amber} />
                <Text style={styles.frozenText}>Muzlatilgan</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable onPress={onCreateCard} disabled={creating} style={styles.createBtn}>
            <Feather name="plus" size={14} color="#000" />
            <Text style={styles.createText}>{creating ? 'Ochilmoqda...' : 'Karta ochish'}</Text>
          </Pressable>
        )}

        {cardNumber ? (
          <Pressable onPress={onDetails} style={styles.details} hitSlop={8}>
            <Text style={styles.detailsText}>Karta tafsilotlari</Text>
            <Feather name="arrow-up-right" size={14} color={C.text} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Tezkor amallar                                                      */
/* ------------------------------------------------------------------ */

const ACTIONS: { key: string; icon: IconName; label: string }[] = [
  { key: 'send', icon: 'arrow-up-right', label: 'Yuborish' },
  { key: 'topup', icon: 'plus', label: "To'ldirish" },
  { key: 'pay', icon: 'file-text', label: "To'lovlar" },
];

export function ActionsRow({ onPress }: { onPress: (key: string) => void }) {
  return (
    <View style={styles.actions}>
      {/* Yuborish - gorizontal cho'zilgan asosiy tugma */}
      <Pressable onPress={() => onPress('send')} style={styles.actionSend}>
        <View style={styles.actionSendBtn}>
          <Feather name="arrow-up-right" size={24} color="#000" />
        </View>
        <Text style={[styles.actionLabel, styles.actionSendLabel]}>Yuborish</Text>
      </Pressable>

      {/* To'ldirish */}
      <Pressable onPress={() => onPress('topup')} style={styles.action}>
        <View style={styles.actionBtn}>
          <Feather name="plus" size={22} color={C.text} />
        </View>
        <Text style={styles.actionLabel}>To'ldirish</Text>
      </Pressable>

      {/* To'lovlar */}
      <Pressable onPress={() => onPress('pay')} style={styles.action}>
        <View style={styles.actionBtn}>
          <Feather name="file-text" size={22} color={C.text} />
        </View>
        <Text style={styles.actionLabel}>To'lovlar</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Oylik xarajat                                                       */
/* ------------------------------------------------------------------ */

function Bar({ value, max, index, active }: { value: number; max: number; index: number; active: boolean }) {
  const target = value > 0 ? Math.max(8, (value / max) * 56) : 6;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(index * 45, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [target]);

  const style = useAnimatedStyle(() => ({ height: p.value * target }));

  return (
    <Animated.View
      style={[
        { width: 6, borderRadius: 3, backgroundColor: active ? C.mint : '#2B2F2C' },
        style,
      ]}
    />
  );
}

function Progress({ pct }: { pct: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [pct]);

  const style = useAnimatedStyle(() => ({ width: `${p.value * 100}%` as any }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, style]} />
    </View>
  );
}

export function SpendingCard({ spending, now = new Date() }: { spending: Spending; now?: Date }) {
  const { month, prevMonth, days } = spending;
  const max = Math.max(...days, 1);
  const { int } = splitMoney(month);

  let trend: React.ReactNode;
  if (prevMonth > 0) {
    const diff = Math.round(((month - prevMonth) / prevMonth) * 100);
    const less = diff <= 0;
    trend = (
      <View style={styles.trendRow}>
        <Feather name={less ? 'trending-down' : 'trending-up'} size={14} color={less ? C.mint : C.amber} />
        <Text style={[styles.trendText, { color: less ? C.mint : C.amber }]}>
          O'tgan oydan {Math.abs(diff)}% {less ? 'kam' : "ko'p"}
        </Text>
      </View>
    );
  } else {
    trend = <Text style={styles.trendMuted}>O'tgan oyda xarajat bo'lmagan</Text>;
  }

  const pct = prevMonth > 0 ? Math.min(month / prevMonth, 1) : month > 0 ? 1 : 0;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle}>Oylik xarajat</Text>
        <View style={styles.monthPill}>
          <Text style={styles.monthText}>{MONTHS[now.getMonth()]}</Text>
          <Feather name="chevron-down" size={14} color={C.sub} />
        </View>
      </View>

      <View style={styles.spendRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.spendAmount} numberOfLines={1} adjustsFontSizeToFit>
            {int}
            <Text style={styles.spendSuffix}> so'm</Text>
          </Text>
          {trend}
        </View>

        <View style={styles.bars}>
          {days.map((v, i) => (
            <Bar key={i} value={v} max={max} index={i} active={i === days.length - 1} />
          ))}
        </View>
      </View>

      <Progress pct={pct} />

      <View style={styles.spendFoot}>
        <Text style={styles.footText}>Bu oy: {money(month)}</Text>
        <Text style={styles.footText}>O'tgan oy: {money(prevMonth)}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  So'nggi operatsiyalar                                               */
/* ------------------------------------------------------------------ */

export type ActivityItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  amount: number;
  dir: Direction;
  status: 'pending' | 'success' | 'failed';
};

const STATUS = {
  success: { text: 'Bajarildi', color: C.sub },
  pending: { text: 'Kutilmoqda', color: C.amber },
  failed: { text: 'Bekor bo\'ldi', color: C.red },
} as const;

export function ActivityList({ items, onViewAll }: { items: ActivityItem[]; onViewAll: () => void }) {
  return (
    <View>
      <View style={styles.activityHead}>
        <Text style={styles.activityTitle}>So'nggi operatsiyalar</Text>
        <Pressable onPress={onViewAll} hitSlop={8}>
          <Text style={styles.viewAll}>Hammasi</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>Hozircha operatsiyalar yo'q</Text>
      ) : (
        items.map((it) => {
          const st = STATUS[it.status] ?? STATUS.success;
          const sign = it.dir === 'out' ? '−' : it.dir === 'in' ? '+' : '';
          const color = it.dir === 'in' ? C.mint : it.dir === 'out' ? C.text : C.sub;

          return (
            <View key={it.id} style={styles.item}>
              <View style={styles.itemIcon}>
                <Feather name={it.icon as IconName} size={20} color={C.text} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {it.title}
                </Text>
                <Text style={styles.itemSub} numberOfLines={1}>
                  {it.subtitle}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.itemAmount, { color }]}>
                  {sign}
                  {money(it.amount)} so'm
                </Text>
                <Text style={[styles.itemStatus, { color: st.color }]}>{st.text}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Pastki tab bar                                                      */
/* ------------------------------------------------------------------ */

const TABS: { key: string; icon: IconName; label: string }[] = [
  { key: 'home', icon: 'home', label: 'Asosiy' },
  { key: 'pay', icon: 'credit-card', label: "To'lov" },
  { key: 'transactions', icon: 'repeat', label: 'Tranzaksiya' },
  { key: 'stats', icon: 'bar-chart-2', label: 'Statistika' },
  { key: 'profile', icon: 'user', label: 'Profil' },
];

export function TabBar({
  active = 'home',
  bottomInset,
  onPress,
}: {
  active?: string;
  bottomInset: number;
  onPress: (key: string) => void;
}) {
  return (
    <View style={[styles.tabBar, { paddingBottom: bottomInset + 8 }]}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} onPress={() => onPress(t.key)} style={styles.tab}>
            <View style={[styles.tabIcon, on && styles.tabIconOn]}>
              <Feather name={t.icon} size={20} color={on ? C.mint : C.sub} />
            </View>
            <Text style={[styles.tabLabel, { color: on ? C.mint : C.sub }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  /* karta */
  card: {
    height: 210,
    borderRadius: 28,
    backgroundColor: '#0E1210',
    borderWidth: 1,
    borderColor: '#242A26',
    padding: 20,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  blossoms: { position: 'absolute', right: 0, top: 0, width: 190, height: 210 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  vDivider: { width: 1, height: 14, backgroundColor: '#3A3F3C' },
  account: { color: C.sub, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  currency: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: '#2E332F',
  },
  currencyText: { color: C.text, fontSize: 13, fontWeight: '700' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: -6 },
  label: { color: C.sub, fontSize: 14 },
  balance: { color: C.text, fontSize: 44, fontWeight: '700', letterSpacing: -1.5 },
  balanceDec: { color: C.sub, fontSize: 28, fontWeight: '600' },
  balanceHidden: { color: C.text, fontSize: 44, fontWeight: '700', letterSpacing: 4 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  last4: { color: C.sub, fontSize: 13, letterSpacing: 1 },
  more: { color: C.sub, fontSize: 12 },
  frozen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(245,185,95,0.12)',
  },
  frozenText: { color: C.amber, fontSize: 11, fontWeight: '700' },
  details: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsText: { color: C.text, fontSize: 13, fontWeight: '600' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: C.mint,
  },
  createText: { color: '#000', fontSize: 13, fontWeight: '800' },

  /* tezkor amallar */
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  action: { alignItems: 'center', gap: 8, width: 72 },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#121413',
    borderWidth: 1,
    borderColor: '#242826',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSend: { alignItems: 'center', gap: 8, width: 116 },
  actionSendBtn: {
    width: 116,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.mint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  actionSendLabel: { color: C.text, fontWeight: '700' },
  actionPrimary: { backgroundColor: C.mint, borderColor: C.mint },
  actionLabel: { color: C.text, fontSize: 13, fontWeight: '500' },

  /* oylik xarajat */
  panel: {
    borderRadius: 26,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#1F2321',
    padding: 18,
  },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  monthPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthText: { color: C.sub, fontSize: 13 },
  spendRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, gap: 12 },
  spendAmount: { color: C.text, fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  spendSuffix: { color: C.sub, fontSize: 15, fontWeight: '600' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  trendText: { fontSize: 12, fontWeight: '600' },
  trendMuted: { color: C.sub, fontSize: 12, marginTop: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 56 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#1C1F1D', marginTop: 16, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.mint },
  spendFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  footText: { color: C.sub, fontSize: 12 },

  /* operatsiyalar */
  activityHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  activityTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  viewAll: { color: C.sub, fontSize: 13, fontWeight: '600' },
  empty: { color: C.sub, fontSize: 14, textAlign: 'center', paddingVertical: 28 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#121413',
    borderWidth: 1,
    borderColor: '#242826',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { color: C.text, fontSize: 16, fontWeight: '600' },
  itemSub: { color: C.sub, fontSize: 12, marginTop: 3 },
  itemAmount: { fontSize: 15, fontWeight: '700' },
  itemStatus: { fontSize: 11, marginTop: 3 },

  /* tab bar */
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: '#080A09',
    borderTopWidth: 1,
    borderTopColor: '#161918',
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabIcon: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabIconOn: { backgroundColor: C.mintDark },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});