import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { WeatherKind, weatherTint } from '../lib/weather';

const H = 210; // balans kartasining balandligi

/** Deterministik "tasodifiy" son (0..1): har renderda bir xil joylashuv */
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/* ------------------------------------------------------------------ */
/*  Bulutlar                                                            */
/* ------------------------------------------------------------------ */

function Cloud({
  size,
  top,
  duration,
  start,
  color,
  W,
}: {
  size: number;
  top: number;
  duration: number;
  start: number;
  color: string;
  W: number;
}) {
  const p = useSharedValue(start);

  useEffect(() => {
    p.value = withSequence(
      withTiming(1, { duration: (1 - start) * duration, easing: Easing.linear }),
      withRepeat(
        withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration, easing: Easing.linear })),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(p.value, [0, 1], [-size * 1.8, W]) }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', top }, style]}>
      <Svg width={size * 1.6} height={size} viewBox="0 0 80 50">
        <Path d="M18 44 C6 44 2 30 12 25 C10 12 28 6 36 16 C42 4 62 6 64 22 C76 22 80 44 62 44 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

function Clouds({ W, count, color }: { W: number; count: number; color: string }) {
  const cfg = [
    { size: 70, top: 14, duration: 42000, start: 0.15 },
    { size: 52, top: 70, duration: 56000, start: 0.55 },
    { size: 88, top: 120, duration: 66000, start: 0.8 },
  ].slice(0, count);

  return (
    <>
      {cfg.map((c, i) => (
        <Cloud key={i} W={W} color={color} {...c} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Quyosh                                                              */
/* ------------------------------------------------------------------ */

function Sun({ W }: { W: number }) {
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  const cx = W - 62;
  const cy = 58;

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 40000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * pulse.value,
    transform: [{ scale: 1 + 0.12 * pulse.value }],
  }));

  return (
    <View style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
      <Animated.View style={[{ position: 'absolute' }, haloStyle]}>
        <View style={[s.halo, { width: 170, height: 170, borderRadius: 85, left: -85, top: -85, opacity: 0.07 }]} />
        <View style={[s.halo, { width: 120, height: 120, borderRadius: 60, left: -60, top: -60, opacity: 0.12 }]} />
        <View style={[s.halo, { width: 80, height: 80, borderRadius: 40, left: -40, top: -40, opacity: 0.2 }]} />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', width: 0, height: 0 }, spinStyle]}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={i}
            style={{ position: 'absolute', width: 0, height: 0, transform: [{ rotate: `${i * 30}deg` }] }}
          >
            <View
              style={{
                position: 'absolute',
                left: -1.5,
                top: -(i % 2 ? 44 : 50),
                width: 3,
                height: i % 2 ? 10 : 16,
                borderRadius: 2,
                backgroundColor: '#FFD76A',
                opacity: 0.55,
              }}
            />
          </View>
        ))}
      </Animated.View>

      <View style={{ position: 'absolute', left: -20, top: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFD76A' }} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Tun: oy va yulduzlar                                                */
/* ------------------------------------------------------------------ */

function Star({ x, y, r, delay }: { x: number; y: number; r: number; delay: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1400 + delay, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: 0.15 + 0.75 * p.value }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: y, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: '#FFFFFF' },
        style,
      ]}
    />
  );
}

function Night({ W }: { W: number }) {
  const bg = weatherTint('night');
  return (
    <>
      {Array.from({ length: 22 }).map((_, i) => (
        <Star key={i} x={rnd(i) * W} y={rnd(i, 1) * (H - 20)} r={0.8 + rnd(i, 2) * 1.4} delay={Math.round(rnd(i, 3) * 2000)} />
      ))}
      <Svg style={{ position: 'absolute', left: W - 92, top: 22 }} width={60} height={60}>
        <Circle cx={30} cy={30} r={22} fill="#F4F1DE" />
        <Circle cx={40} cy={24} r={20} fill={bg} />
      </Svg>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Yomg'ir va qor                                                      */
/* ------------------------------------------------------------------ */

function Drop({ x, delay, duration, len }: { x: number; delay: number; duration: number; len: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: p.value * -16 },
      { translateY: -30 + p.value * (H + 60) },
      { rotate: '12deg' },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: 0,
          width: 1.5,
          height: len,
          borderRadius: 1,
          backgroundColor: 'rgba(170,205,255,0.55)',
        },
        style,
      ]}
    />
  );
}

function Rain({ W, count }: { W: number; count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Drop
          key={i}
          x={rnd(i) * (W + 30)}
          delay={Math.round(rnd(i, 1) * 900)}
          duration={550 + Math.round(rnd(i, 2) * 450)}
          len={10 + Math.round(rnd(i, 3) * 10)}
        />
      ))}
    </>
  );
}

function Flake({ x, size, delay, duration }: { x: number; size: number; delay: number; duration: number }) {
  const fall = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    fall.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
    sway.value = withRepeat(withTiming(1, { duration: 2200 + (delay % 900), easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -12 + fall.value * (H + 24) },
      { translateX: interpolate(sway.value, [0, 1], [-10, 10]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF', opacity: 0.8 },
        style,
      ]}
    />
  );
}

function Snow({ W }: { W: number }) {
  return (
    <>
      {Array.from({ length: 26 }).map((_, i) => (
        <Flake
          key={i}
          x={rnd(i) * W}
          size={2 + Math.round(rnd(i, 1) * 3)}
          delay={Math.round(rnd(i, 2) * 3000)}
          duration={4500 + Math.round(rnd(i, 3) * 3500)}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Tuman va chaqmoq                                                    */
/* ------------------------------------------------------------------ */

function FogBand({ top, height, duration, W, opacity }: { top: number; height: number; duration: number; W: number; opacity: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(p.value, [0, 1], [-W * 0.25, 0]) }] }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', top, left: 0, width: W * 1.4, height, borderRadius: height / 2, backgroundColor: `rgba(255,255,255,${opacity})` },
        style,
      ]}
    />
  );
}

function Fog({ W }: { W: number }) {
  return (
    <>
      <FogBand W={W} top={30} height={46} duration={7000} opacity={0.06} />
      <FogBand W={W} top={92} height={56} duration={9000} opacity={0.08} />
      <FogBand W={W} top={150} height={44} duration={8000} opacity={0.06} />
    </>
  );
}

function Flash() {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withDelay(2800, withTiming(0.32, { duration: 60 })),
        withTiming(0, { duration: 110 }),
        withTiming(0.18, { duration: 60 }),
        withTiming(0, { duration: 320 })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: p.value }));

  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#DCE6FF' }, style]} />;
}

/* ------------------------------------------------------------------ */
/*  Asosiy komponent                                                    */
/* ------------------------------------------------------------------ */

export function WeatherBackground({ kind }: { kind: WeatherKind | null }) {
  const { width } = useWindowDimensions();
  const W = width - 40; // karta kengligi

  if (!kind) return null;

  return (
    <Animated.View key={kind} entering={FadeIn.duration(700)} style={StyleSheet.absoluteFill} pointerEvents="none">
      {kind === 'sun' && (
        <>
          <Sun W={W} />
          <Clouds W={W} count={1} color="rgba(255,255,255,0.09)" />
        </>
      )}

      {kind === 'night' && <Night W={W} />}

      {kind === 'cloud' && <Clouds W={W} count={3} color="rgba(255,255,255,0.1)" />}

      {kind === 'fog' && (
        <>
          <Fog W={W} />
          <Clouds W={W} count={1} color="rgba(255,255,255,0.06)" />
        </>
      )}

      {kind === 'rain' && (
        <>
          <Clouds W={W} count={2} color="rgba(255,255,255,0.07)" />
          <Rain W={W} count={26} />
        </>
      )}

      {kind === 'snow' && (
        <>
          <Clouds W={W} count={1} color="rgba(255,255,255,0.07)" />
          <Snow W={W} />
        </>
      )}

      {kind === 'storm' && (
        <>
          <Clouds W={W} count={2} color="rgba(255,255,255,0.05)" />
          <Rain W={W} count={34} />
          <Flash />
        </>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  halo: { position: 'absolute', backgroundColor: '#FFD76A' },
});