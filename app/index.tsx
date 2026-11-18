import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

// ---------- Sozlamalar (xohlagancha o'zgartiring) ----------
const LETTERS = ['J', 'a', 'm', 'g', 'a', 'r', 'm', 'a'];
const G_INDEX = 3; // doppi tushadigan harf ("g")

const COIN = 56; // tanga o'lchami
const GAP = 8; // tanga va harflar orasidagi masofa
const LETTER_W = 30; // har bir harf kengligi (qat'iy, shunda hisob aniq bo'ladi)
const FONT_SIZE = 34;

const DOPPI_W = 40;
const DOPPI_H = 28;
const DOPPI_TOP = -6; // doppi "g" ustida turadigan balandlik (kerak bo'lsa tuzating)

const COIN_DURATION = 1300; // tanga chapga siljish vaqti
const LETTER_START = 350; // birinchi harf chiqa boshlashi (ms)
const LETTER_STEP = 170; // harflar orasidagi kechikish (ms)
const LETTER_DURATION = 350;
const DOPPI_DELAY = LETTER_START + (G_INDEX + 2) * LETTER_STEP; // "g" chiqib bo'lgach
const DOPPI_DURATION = 800;
const GO_NEXT_AT = DOPPI_DELAY + DOPPI_DURATION + 700;
// -----------------------------------------------------------

const ROW_W = COIN + GAP + LETTERS.length * LETTER_W;
// Tanga boshida ekran markazida turadi → yakuniy joyiga nisbatan siljish
const COIN_START_X = ROW_W / 2 - COIN / 2;

const easeOutCubic = Easing.out(Easing.cubic);

// Berilgan vaqtda tanga markazi qayerda ekanini hisoblaydi (qatorning chap chetiga nisbatan)
const coinCenterAt = (ms: number) =>
  COIN / 2 + COIN_START_X * (1 - easeOutCubic(Math.min(ms / COIN_DURATION, 1)));

const slotCenter = (i: number) => COIN + GAP + i * LETTER_W + LETTER_W / 2;

function Letter({ char, index }: { char: string; index: number }) {
  const progress = useSharedValue(0);
  const delay = LETTER_START + index * LETTER_STEP;
  // Harf tanganing o'sha paytdagi joyidan chiqib keladi
  const fromX = coinCenterAt(delay) - slotCenter(index);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: LETTER_DURATION, easing: Easing.out(Easing.back(1.5)) })
    );

    // Harf chiqayotganda vibratsiya
    const hapticTimer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, delay);

    return () => clearTimeout(hapticTimer);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.25, 1], [0, 1, 1], 'clamp'),
    transform: [
      { translateX: (1 - progress.value) * fromX },
      { scale: 0.3 + 0.7 * progress.value },
    ],
  }));

  return <Animated.Text style={[styles.letter, style]}>{char}</Animated.Text>;
}

export default function SplashScreen() {
  const coinX = useSharedValue(COIN_START_X);
  const doppiY = useSharedValue(-700);
  const doppiRotate = useSharedValue(-25);
  const doppiOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Tanga markazdan asta chapga siljiydi
    coinX.value = withTiming(0, {
      duration: COIN_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    // 2. Harflar (J → a → m → g → a → r → m → a) Letter komponentida chiqadi

    // 3. Doppi tepadan tushib, "g" ustiga qo'nadi
    doppiOpacity.value = withDelay(DOPPI_DELAY, withTiming(1, { duration: 100 }));
    doppiY.value = withDelay(
      DOPPI_DELAY,
      withTiming(0, { duration: DOPPI_DURATION, easing: Easing.bounce })
    );
    doppiRotate.value = withDelay(
      DOPPI_DELAY,
      withTiming(0, { duration: DOPPI_DURATION, easing: Easing.out(Easing.cubic) })
    );

    // Doppi "g" ustiga qo'nganda kuchliroq vibratsiya
    const doppiHaptic = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, DOPPI_DELAY + DOPPI_DURATION * 0.35);

    // 4. Animatsiya tugagach keyingi ekranga o'tish
    const timer = setTimeout(() => {
      router.replace('/login'); // yoki '/home'
    }, GO_NEXT_AT);

    return () => {
      clearTimeout(timer);
      clearTimeout(doppiHaptic);
    };
  }, []);

  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: coinX.value }],
  }));

  const doppiStyle = useAnimatedStyle(() => ({
    opacity: doppiOpacity.value,
    transform: [
      { translateY: doppiY.value },
      { rotate: `${doppiRotate.value}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Harflar (tanga ostida, shuning uchun tanga ichidan chiqqandek ko'rinadi) */}
        <View style={styles.lettersContainer}>
          {LETTERS.map((char, i) => (
            <Letter key={i} char={char} index={i} />
          ))}
        </View>

        {/* Tanga */}
        <Animated.Image
          source={require('../assets/coin.png')}
          style={[styles.coin, coinStyle]}
          resizeMode="contain"
        />

        {/* Doppi — "g" harfi ustiga */}
        <Animated.Image
          source={require('../assets/doppi.png')}
          style={[styles.doppi, doppiStyle]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    width: ROW_W,
    height: COIN,
    justifyContent: 'center',
  },
  coin: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: COIN,
    height: COIN,
    zIndex: 10,
  },
  lettersContainer: {
    position: 'absolute',
    left: COIN + GAP,
    top: 0,
    height: COIN,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  letter: {
    width: LETTER_W,
    textAlign: 'center',
    color: '#000000',
    fontSize: FONT_SIZE,
    fontWeight: '900',
  },
  doppi: {
    position: 'absolute',
    width: DOPPI_W,
    height: DOPPI_H,
    top: DOPPI_TOP,
    left: slotCenter(G_INDEX) - DOPPI_W / 2,
    zIndex: 20,
  },
});