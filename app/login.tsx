import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const SHEET_H = 440;

/* ------------------------------------------------------------------ */
/*  Orqa fon animatsiyasi: suzib yuruvchi tangalar + pulsatsiya halqalar */
/* ------------------------------------------------------------------ */

type FloatingCoinProps = {
  left: number;
  top: number;
  size: number;
  amp: number;
  duration: number;
  delay: number;
  opacity: number;
  rotate: number;
};

function FloatingCoin({ left, top, size, amp, duration, delay, opacity, rotate }: FloatingCoinProps) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(p.value, [0, 1], [-amp, amp]) },
      { translateX: interpolate(p.value, [0, 1], [amp * 0.3, -amp * 0.3]) },
      { rotate: `${interpolate(p.value, [0, 1], [-rotate, rotate])}deg` },
    ],
  }));

  return (
    <Animated.Image
      source={require('../assets/coin.png')}
      resizeMode="contain"
      style={[
        { position: 'absolute', left, top, width: size, height: size, opacity },
        style,
      ]}
    />
  );
}

function Ring({ delay, size }: { delay: number; size: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 3600, easing: Easing.out(Easing.quad) }), -1, false)
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.2, 1], [0, 0.22, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.55, 1.9]) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: '#000',
        },
        style,
      ]}
    />
  );
}

function Background({ heroCenterY }: { heroCenterY: number }) {
  const { width, height } = useWindowDimensions();

  const coins: FloatingCoinProps[] = [
    { left: width * 0.06, top: height * 0.08, size: 46, amp: 14, duration: 3800, delay: 0, opacity: 0.14, rotate: 14 },
    { left: width * 0.78, top: height * 0.06, size: 34, amp: 10, duration: 3200, delay: 400, opacity: 0.12, rotate: 18 },
    { left: width * 0.84, top: height * 0.24, size: 58, amp: 18, duration: 4600, delay: 200, opacity: 0.16, rotate: 10 },
    { left: width * 0.02, top: height * 0.28, size: 30, amp: 12, duration: 3000, delay: 800, opacity: 0.1, rotate: 20 },
    { left: width * 0.2, top: height * 0.4, size: 40, amp: 16, duration: 4200, delay: 600, opacity: 0.12, rotate: 12 },
    { left: width * 0.72, top: height * 0.42, size: 36, amp: 12, duration: 3500, delay: 1000, opacity: 0.12, rotate: 16 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Yumshoq kulrang bloblar */}
      <View style={[styles.blob, { top: -120, right: -100, width: 320, height: 320 }]} />
      <View style={[styles.blob, { top: height * 0.35, left: -140, width: 280, height: 280 }]} />

      {/* Pulsatsiya halqalari (hero tanga atrofida) */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: heroCenterY - 110,
          height: 220,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ring size={220} delay={0} />
        <Ring size={220} delay={1200} />
        <Ring size={220} delay={2400} />
      </View>

      {coins.map((c, i) => (
        <FloatingCoin key={i} {...c} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero tanga                                                          */
/* ------------------------------------------------------------------ */

function HeroCoin() {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(p.value, [0, 1], [-8, 8]) },
      { scale: interpolate(p.value, [0, 1], [1, 1.05]) },
    ],
  }));

  return (
    <Animated.Image
      source={require('../assets/coin.png')}
      resizeMode="contain"
      style={[{ width: 120, height: 120 }, style]}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Bosilganda kichrayadigan tugma                                      */
/* ------------------------------------------------------------------ */

function PressableScale({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: any;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12, stiffness: 250 }))}
    >
      <Animated.View style={[style, aStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Ekran                                                               */
/* ------------------------------------------------------------------ */

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [sheetOpen, setSheetOpen] = useState(false);

  const sheetY = useSharedValue(SHEET_H + 120);
  const backdrop = useSharedValue(0);

  const heroCenterY = height * 0.3;

  const openSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSheetOpen(true);
    backdrop.value = withTiming(1, { duration: 250 });
    sheetY.value = withSpring(0, { damping: 18, stiffness: 160 });
  };

  const closeSheet = () => {
    backdrop.value = withTiming(0, { duration: 200 });
    sheetY.value = withTiming(SHEET_H + 120, { duration: 250, easing: Easing.in(Easing.cubic) });
    setTimeout(() => setSheetOpen(false), 260);
  };

  const onLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/auth/phone');
  };

  const onSetupPasskey = (platform: 'android' | 'ios') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // TODO: PassKey ro'yxatdan o'tkazish
    //  - Android: Credential Manager (Google Password Manager)
    //  - iOS: AuthenticationServices (iCloud Keychain)
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));

  return (
    <View style={styles.container}>
      <Background heroCenterY={heroCenterY} />

      {/* Hero */}
      <View style={[styles.hero, { top: heroCenterY - 60 }]}>
        <HeroCoin />
      </View>

      <Animated.View
        entering={FadeInDown.delay(250).duration(600)}
        style={[styles.titleWrap, { top: heroCenterY + 90 }]}
      >
        <Text style={styles.title}>Jamgarma</Text>
        <Text style={styles.subtitle}>Jamg'armangizni oson va xavfsiz boshqaring</Text>
      </Animated.View>

      {/* Tugmalar */}
      <View style={[styles.buttons, { paddingBottom: insets.bottom + 20 }]}>
        <Animated.View entering={FadeInDown.delay(450).duration(600)}>
          <PressableScale style={styles.primaryBtn} onPress={onLogin}>
            <Text style={styles.primaryText}>Kirish</Text>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(600)}>
          <PressableScale style={styles.secondaryBtn} onPress={openSheet}>
            <Text style={styles.secondaryText}>Akkaunt yaratish</Text>
          </PressableScale>
        </Animated.View>
      </View>

      {/* Passkey bottom sheet */}
      {sheetOpen && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>

          <Animated.View
            style={[styles.sheet, { paddingBottom: insets.bottom + 20, height: SHEET_H + insets.bottom }, sheetStyle]}
          >
            <View style={styles.handle} />

            <View style={styles.sheetIcon}>
              <Ionicons name="finger-print" size={34} color="#fff" />
            </View>

            <Text style={styles.sheetTitle}>PassKey orqali ro'yxatdan o'tish</Text>
            <Text style={styles.sheetText}>
              Ilovaga PassKey orqali ro'yxatdan o'tiladi! Ro'yxatdan o'tish uchun uni o'rnatish lozim.
            </Text>

            <View style={styles.sheetButtons}>
              <PressableScale
                style={[styles.passBtn, Platform.OS === 'android' ? styles.passBtnPrimary : styles.passBtnOutline]}
                onPress={() => onSetupPasskey('android')}
              >
                <Ionicons
                  name="logo-android"
                  size={22}
                  color={Platform.OS === 'android' ? '#fff' : '#000'}
                />
                <Text
                  style={[styles.passText, { color: Platform.OS === 'android' ? '#fff' : '#000' }]}
                >
                  Android uchun PassKey o'rnatish
                </Text>
              </PressableScale>

              <PressableScale
                style={[styles.passBtn, Platform.OS === 'ios' ? styles.passBtnPrimary : styles.passBtnOutline]}
                onPress={() => onSetupPasskey('ios')}
              >
                <Ionicons
                  name="logo-apple"
                  size={22}
                  color={Platform.OS === 'ios' ? '#fff' : '#000'}
                />
                <Text style={[styles.passText, { color: Platform.OS === 'ios' ? '#fff' : '#000' }]}>
                  iOS uchun PassKey o'rnatish
                </Text>
              </PressableScale>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#F4F4F5',
  },
  hero: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  buttons: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryBtn: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    marginBottom: 22,
  },
  sheetIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
  },
  sheetText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
  },
  sheetButtons: {
    alignSelf: 'stretch',
    marginTop: 24,
    gap: 12,
  },
  passBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  passBtnPrimary: {
    backgroundColor: '#000',
  },
  passBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  passText: {
    fontSize: 16,
    fontWeight: '700',
  },
});