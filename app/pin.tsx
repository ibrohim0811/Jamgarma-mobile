import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  interpolateColor,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  savePin,
  verifyPin,
  biometricKind,
  biometricLabel,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticateBiometric,
  BiometricKind,
} from '../lib/pin';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

type Phase = 'create' | 'confirm' | 'unlock';

/* --------------------------- Nuqta (to'lib boradi) --------------------------- */

function Dot({ filled }: { filled: boolean }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withSpring(filled ? 1 : 0, { damping: 12, stiffness: 260 });
  }, [filled]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ['#FFFFFF', '#000000']),
    transform: [{ scale: 1 + 0.25 * p.value }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

/* ------------------------------ Klaviatura tugmasi ------------------------------ */

function Key({
  onPress,
  children,
  plain,
}: {
  onPress: () => void;
  children?: React.ReactNode;
  plain?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        plain ? null : styles.keyFilled,
        pressed && !plain && styles.keyPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

/* ----------------------------------- Ekran ----------------------------------- */

export default function PinScreen() {
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isUnlock = mode === 'unlock';

  const [phase, setPhase] = useState<Phase>(isUnlock ? 'unlock' : 'create');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState<{ kind: BiometricKind | null; enabled: boolean }>({
    kind: null,
    enabled: false,
  });

  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const goHome = () => router.replace('/home');

  // Qulfni ochish rejimida: biometrikani tekshirib, avtomatik so'raymiz
  useEffect(() => {
    if (!isUnlock) return;
    (async () => {
      const [kind, enabled] = await Promise.all([biometricKind(), isBiometricEnabled()]);
      setBio({ kind, enabled });
      if (kind && enabled) tryBiometric();
    })();
  }, []);

  const tryBiometric = async () => {
    if (await authenticateBiometric()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      goHome();
    }
  };

  const fail = (message: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setError(message);
    setPin('');
    shake.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withRepeat(withTiming(12, { duration: 100 }), 4, true),
      withTiming(0, { duration: 50 })
    );
  };

  // Parol o'rnatilgach Face ID / barmoq izini yoqishni taklif qilamiz
  const offerBiometric = async () => {
    const kind = await biometricKind();
    if (!kind) return;
    const label = biometricLabel(kind);

    await new Promise<void>((resolve) => {
      Alert.alert(
        `${label} bilan kirish`,
        `Ilovaga ${label} orqali tezroq kirishni yoqasizmi?`,
        [
          { text: "Yo'q", style: 'cancel', onPress: () => resolve() },
          {
            text: 'Ha',
            onPress: async () => {
              const ok = await authenticateBiometric();
              await setBiometricEnabled(ok);
              resolve();
            },
          },
        ],
        { cancelable: false }
      );
    });
  };

  const onComplete = async (value: string) => {
    if (phase === 'create') {
      setFirstPin(value);
      setPhase('confirm');
      setPin('');
      return;
    }

    if (phase === 'confirm') {
      if (value !== firstPin) {
        setFirstPin('');
        setPhase('create');
        fail("Parollar mos kelmadi. Qaytadan o'rnating");
        return;
      }
      setBusy(true);
      await savePin(value);
      await offerBiometric();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      goHome();
      return;
    }

    // unlock
    setBusy(true);
    const ok = await verifyPin(value);
    setBusy(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      goHome();
    } else {
      fail("Parol noto'g'ri");
    }
  };

  const onKey = (k: string) => {
    if (busy) return;

    if (k === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (k === 'bio') {
      tryBiometric();
      return;
    }

    Haptics.selectionAsync().catch(() => {});
    setError(null);
    const next = (pin + k).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) setTimeout(() => onComplete(next), 120);
  };

  const title =
    phase === 'create' ? "Parol o'rnating" : phase === 'confirm' ? 'Parolni tasdiqlang' : 'Parolni kiriting';
  const subtitle =
    phase === 'create'
      ? 'Ilovaga kirish uchun 4 xonali parol o\'ylab toping'
      : phase === 'confirm'
      ? 'Parolni qaytadan kiriting'
      : 'Ilovaga kirish uchun';

  const showBio = isUnlock && !!bio.kind && bio.enabled;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.head}>
        <View style={styles.lock}>
          <Ionicons name="lock-closed" size={26} color="#fff" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>

      <Animated.View style={[styles.dots, shakeStyle]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <Dot key={i} filled={i < pin.length} />
        ))}
      </Animated.View>

      <Text style={styles.error}>{error ?? ' '}</Text>

      <View style={styles.pad}>
        {KEYS.map((k) => {
          if (k === 'bio') {
            return showBio ? (
              <Key key={k} plain onPress={() => onKey('bio')}>
                <Ionicons
                  name={bio.kind === 'face' ? 'scan-outline' : 'finger-print'}
                  size={30}
                  color="#000"
                />
              </Key>
            ) : (
              <View key={k} style={styles.key} />
            );
          }
          if (k === 'del') {
            return pin.length > 0 ? (
              <Key key={k} plain onPress={() => onKey('del')}>
                <Ionicons name="backspace-outline" size={30} color="#000" />
              </Key>
            ) : (
              <View key={k} style={styles.key} />
            );
          }
          return (
            <Key key={k} onPress={() => onKey(k)}>
              <Text style={styles.keyText}>{k}</Text>
            </Key>
          );
        })}
      </View>
    </View>
  );
}

const KEY = 78;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'space-between' },
  head: { alignItems: 'center', paddingHorizontal: 32 },
  lock: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#000', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 15, color: '#6B7280', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 22, marginTop: 8 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#000' },
  error: { height: 20, fontSize: 14, fontWeight: '600', color: '#DC2626', textAlign: 'center' },
  pad: {
    width: KEY * 3 + 24 * 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  key: { width: KEY, height: KEY, borderRadius: KEY / 2, alignItems: 'center', justifyContent: 'center' },
  keyFilled: { backgroundColor: '#F4F4F5' },
  keyPressed: { backgroundColor: '#E5E7EB' },
  keyText: { fontSize: 32, fontWeight: '500', color: '#000' },
});