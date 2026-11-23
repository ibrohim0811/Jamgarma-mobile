import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ApiError } from '../lib/auth-api';
import { Card, Tx, getCards, getTransactions, splitMoney, money } from '../lib/home-api';
import { resolveCardId, topUp, TopUpResult, NO_CARD_ID_MESSAGE } from '../lib/pay-api';
import { C, Skeleton } from '../components/home-ui';
import { CardFace, DESIGNS } from '../components/card-designs';
import { ScreenHeader, DarkField, MintButton, SuccessView, fmtAmount, cleanAmount } from '../components/dark-ui';

const QUICK = [50000, 100000, 200000, 500000];
const CARD_W = Math.min(Dimensions.get('window').width - 80, 300);

export default function TopUpScreen() {
  const insets = useSafeAreaInsets();

  const [cards, setCards] = useState<Card[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [design, setDesign] = useState(0);
  const [loading, setLoading] = useState(true);

  const [digits, setDigits] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopUpResult | null>(null);

  const card = cards[0];
  const cardId = useMemo(() => resolveCardId(cards, txs), [cards, txs]);
  const amount = Number(digits) || 0;

  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([getCards(), getTransactions()]);
        setCards(c);
        setTxs(t);

        if (c[0]) {
          const saved = await SecureStore.getItemAsync(`card_design_${c[0].card_number}`);
          setDesign(Math.min(Math.max(parseInt(saved ?? '0', 10) || 0, 0), DESIGNS.length - 1));
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
  }, []);

  const onSubmit = async () => {
    if (amount <= 0 || submitting) return;
    if (!cardId) {
      setError(NO_CARD_ID_MESSAGE);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const r = await topUp(cardId, amount, desc.trim() || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult(r);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const balance = Number(card?.balance ?? 0) || 0;
  const { int, dec } = splitMoney(balance);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
      >
        <ScreenHeader title="Kartani to'ldirish" onBack={() => router.back()} />

        {result ? (
          <SuccessView
            title="Karta to'ldirildi"
            subtitle="Mablag' kartangiz balansiga qo'shildi"
            rows={[
              { label: "To'ldirilgan summa", value: `+${money(Number(result.amount))} so'm` },
              { label: 'Yangi balans', value: `${money(Number(result.new_balance))} so'm` },
              { label: 'Tranzaksiya', value: result.transaction_id.slice(0, 8).toUpperCase() },
            ]}
            onDone={() => router.back()}
          />
        ) : loading ? (
          <View style={{ padding: 20, gap: 16, alignItems: 'center' }}>
            <Skeleton height={CARD_W / 1.586} radius={20} style={{ width: CARD_W }} />
            <Skeleton height={58} radius={18} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : !card ? (
          <View style={styles.centerBox}>
            <Text style={styles.noCard}>{error ?? "Avval karta oching. Bosh ekrandagi \"Karta ochish\" tugmasini bosing."}</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 20 }}>
            <Animated.View entering={FadeInDown.duration(450)} style={{ alignItems: 'center', gap: 14 }}>
              <CardFace design={DESIGNS[design]} width={CARD_W} number={card.card_number} holder={card.user_fullname} />
              <Text style={styles.balanceLine}>
                Joriy balans:{' '}
                <Text style={styles.balanceValue}>
                  {int}.{dec} so'm
                </Text>
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(450)} style={{ gap: 14 }}>
              <DarkField
                label="Summa"
                suffix="so'm"
                error={!!error}
                keyboardType="number-pad"
                placeholder="0"
                value={fmtAmount(digits)}
                onChangeText={(v) => {
                  setDigits(cleanAmount(v));
                  if (error) setError(null);
                }}
                style={{ fontSize: 22, fontWeight: '800' }}
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

              <DarkField label="Izoh (ixtiyoriy)" placeholder="Masalan: Maosh" value={desc} onChangeText={setDesc} maxLength={255} />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <MintButton
                title={amount > 0 ? `To'ldirish · ${fmtAmount(String(amount))} so'm` : "To'ldirish"}
                onPress={onSubmit}
                disabled={amount <= 0}
                loading={submitting}
              />
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centerBox: { padding: 30, marginTop: 40 },
  noCard: { color: C.sub, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  balanceLine: { color: C.sub, fontSize: 14 },
  balanceValue: { color: C.text, fontWeight: '700' },
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