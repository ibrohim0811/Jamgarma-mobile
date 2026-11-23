import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AuthLayout, FieldError, formatUz } from '../../components/auth-ui';
import {
  getDraft,
  clearDraft,
  register,
  confirmOtp,
} from '../../lib/register-api';
import { ApiError, NetworkError } from '../../lib/auth-api';

const CODE_LENGTH = 6;
const OTP_SECONDS = 180;

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function RegisterOtp() {
  const phone = getDraft().phone;
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(OTP_SECONDS);

  // Teskari sanoq
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  // 6 ta raqam to'lganda avtomatik tasdiqlash
  useEffect(() => {
    if (code.length === CODE_LENGTH) onConfirm();
  }, [code]);

  const onConfirm = async () => {
    if (code.length !== CODE_LENGTH || loading) return;
    setLoading(true);
    setError(null);

    try {
      await confirmOtp(phone, code); // tokenlar shu yerda saqlanadi
      clearDraft(); // parol xotiradan o'chadi
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/pin');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setCode('');
      setError(
        e instanceof ApiError || e instanceof NetworkError ? e.message : 'Kutilmagan xatolik yuz berdi'
      );
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (left > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await register(getDraft());
      setCode('');
      setLeft(OTP_SECONDS);
    } catch (e) {
      setError(
        e instanceof ApiError || e instanceof NetworkError ? e.message : 'Kutilmagan xatolik yuz berdi'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      step={4}
      title="Tasdiqlash kodi"
      subtitle={`+998 ${formatUz(phone)} raqami uchun 6 xonali kod Authenticator ilovasiga yuborildi`}
      buttonTitle="Tasdiqlash"
      onSubmit={onConfirm}
      disabled={code.length !== CODE_LENGTH}
      loading={loading}
    >
      <Pressable onPress={() => inputRef.current?.focus()}>
        <View style={styles.boxes}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.box,
                i === code.length && styles.boxActive,
                !!error && styles.boxError,
              ]}
            >
              <Text style={styles.boxText}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </View>
      </Pressable>

      {/* Ko'rinmas haqiqiy input */}
      <TextInput
        ref={inputRef}
        autoFocus
        value={code}
        onChangeText={(v) => {
          setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH));
          if (error) setError(null);
        }}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        style={styles.hidden}
      />

      <FieldError message={error} />

      <View style={styles.resendRow}>
        {left > 0 ? (
          <Text style={styles.timer}>Kod {mmss(left)} gacha amal qiladi</Text>
        ) : (
          <Pressable onPress={onResend} disabled={resending} hitSlop={10}>
            <Text style={styles.resend}>{resending ? 'Yuborilmoqda...' : 'Kodni qayta yuborish'}</Text>
          </Pressable>
        )}
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: '#000', backgroundColor: '#fff' },
  boxError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  boxText: { fontSize: 26, fontWeight: '800', color: '#000' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  resendRow: { marginTop: 20, alignItems: 'center' },
  timer: { fontSize: 14, color: '#6B7280' },
  resend: { fontSize: 15, fontWeight: '700', color: '#000', textDecorationLine: 'underline' },
});