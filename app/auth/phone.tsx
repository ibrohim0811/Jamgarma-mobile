import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BackButton, PrimaryButton, formatUz } from '../../components/auth-ui';

const cleanDigits = (v: string) => {
  let d = v.replace(/\D/g, '');
  if (d.startsWith('998') && d.length > 9) d = d.slice(3); // +998 bilan qo'yilgan bo'lsa
  return d.slice(0, 9);
};

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const { error, phone, t } = useLocalSearchParams<{ error?: string; phone?: string; t?: string }>();

  const [digits, setDigits] = useState(cleanDigits(phone ?? ''));
  const [errMsg, setErrMsg] = useState<string | null>(error ?? null);
  const shake = useSharedValue(0);

  // Parol ekranidan xato bilan qaytilganda
  useEffect(() => {
    if (!error) return;
    setErrMsg(error);
    setDigits(cleanDigits(phone ?? ''));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withRepeat(withTiming(10, { duration: 100 }), 4, true),
      withTiming(0, { duration: 50 })
    );
  }, [error, t]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const onNext = () => {
    if (digits.length !== 9) return;
    router.push({ pathname: '/auth/password', params: { phone: digits } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
        <BackButton />

        <Animated.View entering={FadeInDown.duration(500)} style={styles.head}>
          <Text style={styles.title}>Telefon raqamingiz</Text>
          <Text style={styles.subtitle}>Kirish uchun telefon raqamingizni kiriting</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(500)}
          style={[styles.inputRow, errMsg ? styles.inputRowError : null, shakeStyle]}
        >
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+998</Text>
          </View>
          <TextInput
            autoFocus
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="90 123 45 67"
            placeholderTextColor="#C4C4CC"
            value={formatUz(digits)}
            onChangeText={(v) => {
              setDigits(cleanDigits(v));
              if (errMsg) setErrMsg(null);
            }}
            onSubmitEditing={onNext}
            maxLength={13}
          />
        </Animated.View>

        {errMsg ? <Text style={styles.error}>{errMsg}</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton title="Keyingisi" onPress={onNext} disabled={digits.length !== 9} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 20 },
  head: { marginTop: 28, marginBottom: 28 },
  title: { fontSize: 30, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  subtitle: { marginTop: 8, fontSize: 15, color: '#6B7280' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F4F4F5',
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  inputRowError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  prefix: {
    height: '100%',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  prefixText: { fontSize: 20, fontWeight: '800', color: '#000' },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  error: { marginTop: 12, fontSize: 14, color: '#DC2626', fontWeight: '600' },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
});