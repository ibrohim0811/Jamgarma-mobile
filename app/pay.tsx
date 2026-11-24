import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ApiError } from '../lib/auth-api';
import { Card, Tx, getCards, getTransactions, money } from '../lib/home-api';
import {
  COMMUNAL,
  TELECOM,
  PayService,
  resolveCardId,
  payCommunal,
  payTelecom,
  NO_CARD_ID_MESSAGE,
} from '../lib/pay-api';
import { C, Skeleton } from '../components/home-ui';
import { AppTabBar } from '../components/app-tabs';
import { formatUz, cleanPhoneDigits } from '../components/auth-ui';
import { ScreenHeader, DarkField, MintButton, SuccessView, fmtAmount, cleanAmount } from '../components/dark-ui';

type IconName = React.ComponentProps<typeof Feather>['name'];

const COLUMNS = 3;
const QUICK = [10000, 20000, 50000, 100000];

type Done = { rows: { label: string; value: string }[] };

export default function PayScreen() {
  const insets = useSafeAreaInsets();

  const [cards, setCards] = useState<Card[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  const [service, setService] = useState<PayService | null>(null);
  const [provider, setProvider] = useState('');
  const [account, setAccount] = useState('');
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([getCards(), getTransactions()]);
        setCards(c);
        setTxs(t);
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
  }, []);

  const card = cards[0];
  const cardId = useMemo(() => resolveCardId(cards, txs), [cards, txs]);
  const balance = Number(card?.balance ?? 0) || 0;
  const amount = Number(digits) || 0;

  const open = (s: PayService) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setService(s);
    setProvider(s.provider ?? '');
    setAccount('');
    setPhone('');
    setDigits('');
    setError(null);
  };

  const valid =
    amount > 0 &&
    (service?.kind === 'telecom' ? phone.length === 9 : provider.trim().length >= 2 && account.trim().length >= 1);

  const onSubmit = async () => {
    if (!service || !valid || submitting) return;

    if (!card) {
      setError("Avval karta oching (bosh ekrandagi \"Karta ochish\" tugmasi).");
      return;
    }
    if (!cardId) {
      setError(NO_CARD_ID_MESSAGE);
      return;
    }
    if (amount > balance) {
      setError("Kartada mablag' yetarli emas. Avval kartani to'ldiring.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let txId: string;
      let target: { label: string; value: string };

      if (service.kind === 'communal') {
        const r = await payCommunal({
          card_id: cardId,
          service_type: service.key,
          provider_name: provider.trim(),
          account_number: account.trim(),
          amount,
        });
        txId = r.transaction_id;
        target = { label: 'Hisob raqami', value: account.trim() };
      } else {
        const r = await payTelecom({
          card_id: cardId,
          provider: service.key,
          recipient_phone: `+998${phone}`,
          amount,
        });
        txId = r.transaction_id;
        target = { label: 'Telefon', value: `+998 ${formatUz(phone)}` };
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone({
        rows: [
          { label: 'Xizmat', value: service.label },
          target,
          { label: 'Summa', value: `${money(amount)} so'm` },
          { label: 'Tranzaksiya', value: txId.slice(0, 8).toUpperCase() },
        ],
      });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------ Muvaffaqiyat ------------------------------ */

  if (done) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={{ paddingTop: insets.top + 8 }}>
          <ScreenHeader title="To'lov" onBack={() => router.dismissTo('/home')} />
        </View>
        <SuccessView
          title="To'lov amalga oshirildi"
          subtitle="Mablag' kartangizdan yechildi"
          rows={done.rows}
          onDone={() => router.dismissTo('/home')}
        />
      </View>
    );
  }

  /* ------------------------------ To'lov formasi ------------------------------ */

  if (service) {
    const telecom = service.kind === 'telecom';
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar style="light" />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
        >
          <ScreenHeader title={service.label} onBack={() => setService(null)} />

          <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 20, marginTop: 20, gap: 16 }}>
            <View style={styles.cardInfo}>
              <Feather name="credit-card" size={18} color={C.mint} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardInfoTitle}>
                  {card ? `•••• ${String(card.card_number).slice(-4)}` : 'Karta yo\'q'}
                </Text>
                <Text style={styles.cardInfoSub}>Balans: {money(balance)} so'm</Text>
              </View>
            </View>

            {telecom ? (
              <DarkField
                label="Telefon raqam"
                prefix="+998"
                keyboardType="phone-pad"
                placeholder="90 123 45 67"
                value={formatUz(phone)}
                onChangeText={(v) => {
                  setPhone(cleanPhoneDigits(v));
                  setError(null);
                }}
                maxLength={13}
              />
            ) : (
              <>
                <DarkField
                  label="Xizmat ko'rsatuvchi"
                  placeholder="Masalan: Hududgaz"
                  value={provider}
                  onChangeText={(v) => {
                    setProvider(v);
                    setError(null);
                  }}
                  maxLength={150}
                />
                <DarkField
                  label="Shaxsiy hisob raqami"
                  keyboardType="number-pad"
                  placeholder="1234567890"
                  value={account}
                  onChangeText={(v) => {
                    setAccount(v.replace(/\D/g, '').slice(0, 50));
                    setError(null);
                  }}
                />
              </>
            )}

            <DarkField
              label="Summa"
              suffix="so'm"
              error={!!error}
              keyboardType="number-pad"
              placeholder="0"
              value={fmtAmount(digits)}
              onChangeText={(v) => {
                setDigits(cleanAmount(v));
                setError(null);
              }}
              style={{ fontSize: 20, fontWeight: '800' }}
            />

            <View style={styles.quickRow}>
              {QUICK.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => {
                    setDigits(String(q));
                    setError(null);
                  }}
                  style={[styles.quick, amount === q && styles.quickOn]}
                >
                  <Text style={[styles.quickText, amount === q && { color: '#000' }]}>{fmtAmount(String(q))}</Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <MintButton
              title={amount > 0 ? `To'lash · ${fmtAmount(String(amount))} so'm` : "To'lash"}
              onPress={onSubmit}
              disabled={!valid}
              loading={submitting}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ------------------------------ Xizmatlar ro'yxati ------------------------------ */

  const chunk = (list: PayService[], size: number) => {
    const rows: PayService[][] = [];
    for (let i = 0; i < list.length; i += size) rows.push(list.slice(i, i + size));
    return rows;
  };

  const renderGroup = (title: string, list: PayService[], delay: number) => (
    <Animated.View entering={FadeInDown.delay(delay).duration(450)}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.grid}>
        {chunk(list, COLUMNS).map((row, i) => (
          <View key={i} style={styles.gridRow}>
            {row.map((s) => (
              <Pressable key={s.key} onPress={() => open(s)} style={styles.tile}>
                <View style={styles.tileIcon}>
                  <Feather name={s.icon as IconName} size={22} color={C.mint} />
                </View>
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
            {Array.from({ length: COLUMNS - row.length }).map((_, k) => (
              <View key={`empty-${k}`} style={styles.tileEmpty} />
            ))}
          </View>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }}
      >
        <ScreenHeader title="To'lov" onBack={() => router.back()} />

        <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 24 }}>
          {loading ? (
            <Skeleton height={64} radius={20} />
          ) : (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.cardInfo}>
              <Feather name="credit-card" size={18} color={C.mint} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardInfoTitle}>
                  {card ? `To'lov kartasi •••• ${String(card.card_number).slice(-4)}` : 'Karta ochilmagan'}
                </Text>
                <Text style={styles.cardInfoSub}>
                  {card ? `Balans: ${money(balance)} so'm` : 'Bosh ekranda "Karta ochish" tugmasini bosing'}
                </Text>
              </View>
            </Animated.View>
          )}

          {renderGroup('Kommunal xizmatlar', COMMUNAL, 80)}
          {renderGroup('Mobil aloqa va internet', TELECOM, 160)}
        </View>
      </ScrollView>

      <AppTabBar active="pay" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#1F2321',
  },
  cardInfoTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  cardInfoSub: { color: C.sub, fontSize: 12, marginTop: 3 },
  groupTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  grid: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  tileEmpty: { flex: 1 },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 10,
    borderRadius: 20,
    backgroundColor: '#0F1110',
    borderWidth: 1,
    borderColor: '#1F2321',
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#12281C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { color: C.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quick: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#121413',
    borderWidth: 1,
    borderColor: '#242826',
  },
  quickOn: { backgroundColor: C.mint, borderColor: C.mint },
  quickText: { color: C.text, fontSize: 13, fontWeight: '600' },
  error: { color: C.red, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});