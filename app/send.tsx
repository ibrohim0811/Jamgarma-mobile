/**
 * Pul yuborish ekrani  (P2P O'tkazma)
 *
 * Oqim:
 *  1. Karta raqamini kiriting  → "Tekshirish" tugmasi
 *  2. GET /cards/search/{card_number} — egasi ismi + muzlatilgan-emasligi
 *  3. Summa & izoh maydonlari chiqadi
 *  4. POST /p2p/transfer → SuccessView
 *
 * API talablari (hujjatdan):
 *  - sender_card_id  : UUID  (GET /cards/ javobidan yoki tranzaksiyalardan topiladi)
 *  - receiver_card_number : 16 xonali butun son
 *  - amount          : > 0
 *  - description     : ixtiyoriy, max 255
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { ApiError } from '../lib/auth-api';
import { Card, Tx, getCards, getTransactions, money, splitMoney } from '../lib/home-api';
import {
  resolveCardId,
  searchCard,
  p2pTransfer,
  CardSearchResult,
  P2PResult,
  NO_CARD_ID_MESSAGE,
} from '../lib/pay-api';
import { C, Skeleton } from '../components/home-ui';
import { ScreenHeader, MintButton, SuccessView, fmtAmount, cleanAmount } from '../components/dark-ui';
import { CardSelector } from '../components/card-selector';

const QUICK = [10000, 50000, 100000, 200000];
const CARD_NUMBER_LENGTH = 16;

/* ------------------------------------------------------------------ */
/*  Karta raqami formatlash: 1008 1234 5678 9012                       */
/* ------------------------------------------------------------------ */
function formatCardNum(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CARD_NUMBER_LENGTH).replace(/(.{4})/g, '$1 ').trim();
}
function cleanCardNum(formatted: string): string {
  return formatted.replace(/\s/g, '');
}

/* ------------------------------------------------------------------ */
/*  Receiver Card qutisi                                               */
/* ------------------------------------------------------------------ */
function ReceiverCard({ result, loading }: { result: CardSearchResult | null; loading: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (result) {
      Animated.spring(fadeAnim, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [result, fadeAnim]);

  if (!result && !loading) return null;

  return (
    <Animated.View style={[s.receiverCard, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
      {loading ? (
        <View style={s.receiverLoading}>
          <ActivityIndicator color={C.mint} size="small" />
          <Text style={s.receiverLoadingText}>Karta tekshirilmoqda…</Text>
        </View>
      ) : result ? (
        <View style={s.receiverInfo}>
          {/* Avatar */}
          <View style={[s.receiverAvatar, result.is_frozen && s.receiverAvatarFrozen]}>
            <Text style={s.receiverAvatarText}>
              {result.user_fullname
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0] ?? '')
                .join('')
                .toUpperCase()}
            </Text>
          </View>
          <View style={s.receiverMeta}>
            <Text style={s.receiverName}>{result.user_fullname}</Text>
            <View style={s.receiverBadgeRow}>
              <View style={[s.badge, result.is_frozen ? s.badgeFrozen : s.badgeActive]}>
                <View style={[s.badgeDot, { backgroundColor: result.is_frozen ? C.amber : C.mint }]} />
                <Text style={[s.badgeText, { color: result.is_frozen ? C.amber : C.mint }]}>
                  {result.is_frozen ? 'Muzlatilgan' : 'Faol karta'}
                </Text>
              </View>
              <Text style={s.receiverCardNum}>
                •••• {String(result.card_number).slice(-4)}
              </Text>
            </View>
          </View>
          {!result.is_frozen && (
            <View style={s.checkIcon}>
              <Feather name="check-circle" size={22} color={C.mint} />
            </View>
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Asosiy ekran                                                       */
/* ------------------------------------------------------------------ */
export default function SendScreen() {
  const insets = useSafeAreaInsets();
  const { card_number: initialCardNumber } = useLocalSearchParams<{ card_number?: string }>();

  // ---- Ma'lumotlar ----
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // ---- Qabul qiluvchi karta ----
  const [cardNumInput, setCardNumInput] = useState(''); // formatlangan ko'rinish
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<CardSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ---- Summa & izoh ----
  const [digits, setDigits] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [result, setResult] = useState<P2PResult | null>(null);

  const cardNumRef = useRef<any>(null);

  // Karta UUID si
  const myCard = selectedCard ?? cards[0];
  const senderCardId = useMemo(() => resolveCardId(cards, txs, myCard), [cards, txs, myCard]);
  const myBalance = Number(myCard?.balance ?? 0) || 0;
  const { int: balInt, dec: balDec } = splitMoney(myBalance);

  const amount = Number(digits) || 0;
  const cleanNum = cleanCardNum(cardNumInput);
  const isNumComplete = cleanNum.length === CARD_NUMBER_LENGTH;
  const receiverNum = isNumComplete ? Number(cleanNum) : 0;

  const canSend =
    !!searchResult &&
    !searchResult.is_frozen &&
    amount > 0 &&
    amount <= myBalance &&
    !!senderCardId;

  // ---- Sahifani yuklash ----
  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([getCards(), getTransactions()]);
        setCards(c);
        setTxs(t);
        if (c.length > 0) {
          const match = initialCardNumber ? c.find((item) => String(item.card_number) === initialCardNumber) : null;
          setSelectedCard(match ?? c[0]);
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          router.replace('/login');
          return;
        }
      } finally {
        setPageLoading(false);
      }
    })();
  }, []);

  // ---- Karta raqam o'zgarganda natijani tiklash va 16 xonali bo'lsa avtomatik tekshirish ----
  const handleCardNumChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, CARD_NUMBER_LENGTH);
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    setCardNumInput(formatted);
    setSearchResult(null);
    setSearchError(null);
    setDigits('');
    setTxError(null);

    if (cleaned.length === CARD_NUMBER_LENGTH) {
      if (myCard && Number(cleaned) === myCard.card_number) {
        setSearchError("O'z kartangizga pul o'tkaza olmaysiz.");
        return;
      }
      doSearch(cleaned);
    }
  };

  // ---- Karta qidirish logikasi ----
  const doSearch = async (numToSearch: string) => {
    if (numToSearch.length !== CARD_NUMBER_LENGTH || searching) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSearching(true);
    setSearchResult(null);
    setSearchError(null);
    try {
      const res = await searchCard(numToSearch);
      if (res.is_frozen) {
        setSearchError('Bu karta muzlatilgan. Pul o\'tkazib bo\'lmaydi.');
      }
      setSearchResult(res);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Karta topilmadi';
      setSearchError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = () => {
    if (myCard && Number(cleanNum) === myCard.card_number) {
      setSearchError("O'z kartangizga pul o'tkaza olmaysiz.");
      return;
    }
    doSearch(cleanNum);
  };

  // ---- P2P yuborish ----
  const handleSend = async () => {
    if (!canSend || submitting) return;
    if (!senderCardId) {
      setTxError(NO_CARD_ID_MESSAGE);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSubmitting(true);
    setTxError(null);
    try {
      const r = await p2pTransfer({
        sender_card_id: senderCardId,
        receiver_card_number: receiverNum,
        amount,
        description: desc.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult(r);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setTxError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  /* ======================== RENDER ======================== */

  if (result) {
    return (
      <View style={s.container}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}>
          <ScreenHeader title="Pul yuborish" onBack={() => router.back()} />
          <SuccessView
            title="O'tkazma amalga oshdi!"
            subtitle={`${searchResult?.user_fullname ?? ''} ga pul o'tkazildi`}
            rows={[
              { label: 'Summa', value: `-${money(amount)} so'm` },
              { label: 'Qabul qiluvchi', value: searchResult?.user_fullname ?? '' },
              { label: 'Karta', value: `•••• ${cleanNum.slice(-4)}` },
              { label: 'Tranzaksiya', value: result.transaction_id.slice(0, 8).toUpperCase() },
            ]}
            onDone={() => router.back()}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 60,
        }}
      >
        <ScreenHeader title="Pul yuborish" onBack={() => router.back()} />

        {pageLoading ? (
          <View style={{ padding: 20, gap: 16 }}>
            <Skeleton height={70} radius={18} />
            <Skeleton height={70} radius={18} />
          </View>
        ) : !myCard ? (
          <View style={s.centerBox}>
            <Feather name="credit-card" size={40} color={C.sub} style={{ marginBottom: 14 }} />
            <Text style={s.noCard}>
              Avval karta oching.{'\n'}Bosh ekrandagi "Karta ochish" tugmasini bosing.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 20 }}>

            {/* ── Karta tanlash (agar 1 dan ortiq bo'lsa) ── */}
            <CardSelector
              cards={cards}
              selectedCard={myCard}
              onSelect={(chosen) => {
                setSelectedCard(chosen);
                setDigits('');
                setTxError(null);
              }}
              label="Yuboruvchi karta"
            />

            {/* ── Karta raqami qidirish ── */}
            <View style={{ gap: 10 }}>
              <Text style={s.fieldLabel}>Qabul qiluvchi karta raqami</Text>
              <View style={[s.cardNumRow, searchError ? s.cardNumRowError : searchResult && !searchResult.is_frozen ? s.cardNumRowOk : null]}>
                <Feather name="credit-card" size={18} color={C.sub} style={{ marginLeft: 14 }} />
                <TextInput
                  ref={cardNumRef}
                  style={s.cardNumInput}
                  value={cardNumInput}
                  onChangeText={handleCardNumChange}
                  placeholder="1008 0000 0000 0000"
                  placeholderTextColor="#4E5452"
                  keyboardType="number-pad"
                  maxLength={19} // 16 raqam + 3 bo'sh joy
                  selectionColor={C.mint}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                {/* Tozalash tugmasi */}
                {cardNumInput.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setCardNumInput('');
                      setSearchResult(null);
                      setSearchError(null);
                      setDigits('');
                      cardNumRef.current?.focus();
                    }}
                    hitSlop={8}
                    style={{ marginRight: 6 }}
                  >
                    <Feather name="x-circle" size={16} color={C.sub} />
                  </Pressable>
                )}
                {/* Tekshirish tugmasi */}
                <Pressable
                  onPress={handleSearch}
                  disabled={!isNumComplete || searching}
                  style={[s.searchBtn, (!isNumComplete || searching) && s.searchBtnOff]}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={s.searchBtnText}>Tekshirish</Text>
                  )}
                </Pressable>
              </View>

              {/* Xato xabari */}
              {searchError && (
                <View style={s.errorRow}>
                  <Feather name="alert-circle" size={14} color={C.red} />
                  <Text style={s.errorText}>{searchError}</Text>
                </View>
              )}

              {/* Qabul qiluvchi kartasi */}
              <ReceiverCard result={searchResult} loading={searching} />
            </View>

            {/* ── Summa & izoh (faqat karta topilganda ko'rsatiladi) ── */}
            {searchResult && !searchResult.is_frozen && (
              <View style={{ gap: 16 }}>
                {/* Summa maydoni */}
                <View style={{ gap: 10 }}>
                  <Text style={s.fieldLabel}>Summa</Text>
                  <View style={[s.amountRow, txError && amount > 0 ? s.amountRowError : null]}>
                    <TextInput
                      style={s.amountInput}
                      value={fmtAmount(digits)}
                      onChangeText={(v) => {
                        setDigits(cleanAmount(v));
                        setTxError(null);
                      }}
                      placeholder="0"
                      placeholderTextColor="#4E5452"
                      keyboardType="number-pad"
                      selectionColor={C.mint}
                    />
                    <Text style={s.amountSuffix}>so'm</Text>
                  </View>

                  {/* Balans yetarli emasligini ko'rsatish */}
                  {amount > myBalance && (
                    <View style={s.errorRow}>
                      <Feather name="alert-circle" size={14} color={C.amber} />
                      <Text style={[s.errorText, { color: C.amber }]}>
                        Balans yetarli emas (mavjud: {money(myBalance)} so'm)
                      </Text>
                    </View>
                  )}
                </View>

                {/* Tezkor summa tugmalari */}
                <View style={s.quickRow}>
                  {QUICK.filter((q) => q <= myBalance).map((q) => (
                    <Pressable
                      key={q}
                      onPress={() => {
                        setDigits(String(q));
                        setTxError(null);
                      }}
                      style={[s.quickChip, amount === q && s.quickChipOn]}
                    >
                      <Text style={[s.quickText, amount === q && s.quickTextOn]}>
                        {fmtAmount(String(q))}
                      </Text>
                    </Pressable>
                  ))}
                  {/* "Hammasini yuborish" */}
                  {myBalance > 0 && (
                    <Pressable
                      onPress={() => {
                        setDigits(String(Math.floor(myBalance)));
                        setTxError(null);
                      }}
                      style={[s.quickChip, amount === Math.floor(myBalance) && s.quickChipOn]}
                    >
                      <Text style={[s.quickText, amount === Math.floor(myBalance) && s.quickTextOn]}>
                        Hammasi
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Izoh maydoni */}
                <View style={{ gap: 8 }}>
                  <Text style={s.fieldLabel}>Izoh (ixtiyoriy)</Text>
                  <View style={s.descRow}>
                    <TextInput
                      style={s.descInput}
                      value={desc}
                      onChangeText={setDesc}
                      placeholder="Masalan: Tushlik uchun"
                      placeholderTextColor="#4E5452"
                      maxLength={255}
                      selectionColor={C.mint}
                    />
                  </View>
                </View>

                {/* Tranzaksiya xatosi */}
                {txError && (
                  <View style={s.errorRow}>
                    <Feather name="alert-circle" size={14} color={C.red} />
                    <Text style={s.errorText}>{txError}</Text>
                  </View>
                )}

                {/* Yuborish tugmasi */}
                <View style={{ gap: 10 }}>
                  {/* Xulosa qatori */}
                  {amount > 0 && amount <= myBalance && (
                    <View style={s.summaryBox}>
                      <Feather name="arrow-up-right" size={15} color={C.mint} />
                      <Text style={s.summaryText}>
                        <Text style={{ color: C.text, fontWeight: '700' }}>
                          {money(amount)} so'm
                        </Text>
                        {' → '}
                        <Text style={{ color: C.text }}>
                          {searchResult.user_fullname.split(' ')[0]}
                        </Text>
                      </Text>
                    </View>
                  )}

                  <MintButton
                    title={
                      submitting
                        ? 'Yuborilmoqda…'
                        : amount > 0
                        ? `Yuborish · ${fmtAmount(String(amount))} so'm`
                        : 'Yuborish'
                    }
                    onPress={handleSend}
                    disabled={!canSend}
                    loading={submitting}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const { width: SW } = Dimensions.get('window');

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centerBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  noCard: { color: C.sub, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  /* Balans qutisi */
  balanceBox: {
    backgroundColor: '#0D0F0E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E2321',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 4,
  },
  balanceLabel: { color: C.sub, fontSize: 13 },
  balanceValue: { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  balanceDec: { color: C.sub, fontSize: 18, fontWeight: '600' },

  /* Maydon labeli */
  fieldLabel: { color: C.sub, fontSize: 13, marginLeft: 2 },

  /* Karta raqam qidirish */
  cardNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 18,
    backgroundColor: '#121413',
    borderWidth: 1.5,
    borderColor: '#242826',
    gap: 6,
    overflow: 'hidden',
  },
  cardNumRowError: { borderColor: C.red },
  cardNumRowOk: { borderColor: C.mint },
  cardNumInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 1,
  },
  searchBtn: {
    height: '100%',
    paddingHorizontal: 16,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  searchBtnOff: { backgroundColor: '#1E2320', opacity: 0.5 },
  searchBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },

  /* Qabul qiluvchi karta qutisi */
  receiverCard: {
    borderRadius: 18,
    backgroundColor: '#0E1210',
    borderWidth: 1,
    borderColor: '#1E2621',
    overflow: 'hidden',
  },
  receiverLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
  },
  receiverLoadingText: { color: C.sub, fontSize: 14 },
  receiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  receiverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A2D22',
    borderWidth: 2,
    borderColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiverAvatarFrozen: {
    borderColor: C.amber,
    backgroundColor: '#2D241A',
  },
  receiverAvatarText: {
    color: C.mint,
    fontSize: 15,
    fontWeight: '800',
  },
  receiverMeta: { flex: 1, gap: 5 },
  receiverName: { color: C.text, fontSize: 16, fontWeight: '700' },
  receiverBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeActive: { backgroundColor: 'rgba(0,229,153,0.1)' },
  badgeFrozen: { backgroundColor: 'rgba(245,185,95,0.1)' },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  receiverCardNum: { color: C.sub, fontSize: 12 },
  checkIcon: { marginLeft: 'auto' as any },

  /* Summa maydoni */
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 68,
    borderRadius: 18,
    backgroundColor: '#121413',
    borderWidth: 1.5,
    borderColor: '#242826',
    paddingHorizontal: 16,
  },
  amountRowError: { borderColor: C.red },
  amountInput: {
    flex: 1,
    height: '100%',
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  amountSuffix: { color: C.sub, fontSize: 16, fontWeight: '600' },

  /* Tezkor summa */
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#121413',
    borderWidth: 1,
    borderColor: '#242826',
  },
  quickChipOn: { backgroundColor: C.mint, borderColor: C.mint },
  quickText: { color: C.text, fontSize: 13, fontWeight: '600' },
  quickTextOn: { color: '#000' },

  /* Izoh */
  descRow: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#121413',
    borderWidth: 1.5,
    borderColor: '#242826',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  descInput: { color: C.text, fontSize: 15, fontWeight: '500' },

  /* Xatolik */
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: { color: C.red, fontSize: 13, fontWeight: '500', flex: 1 },

  /* Xulosa */
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,229,153,0.07)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(0,229,153,0.15)',
  },
  summaryText: { color: C.sub, fontSize: 14 },
});
