import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { C } from './home-ui';

/** "1250000" → "1 250 000" */
export const fmtAmount = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
/** Faqat raqamlar, boshidagi nollarsiz, ko'pi bilan 12 xona */
export const cleanAmount = (v: string) => v.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);

/* ------------------------------------------------------------------ */

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} style={s.back} hitSlop={8}>
        <Feather name="chevron-left" size={22} color={C.text} />
      </Pressable>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipOn]}>
      <Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

type DarkFieldProps = TextInputProps & {
  label?: string;
  prefix?: string;
  suffix?: string;
  error?: boolean;
  right?: React.ReactNode;
};

export const DarkField = React.forwardRef<any, DarkFieldProps>(
  ({ label, prefix, suffix, error, right, style, ...rest }, ref) => (
    <View>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <View style={[s.field, error && s.fieldError]}>
        {prefix ? (
          <View style={s.prefix}>
            <Text style={s.prefixText}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput ref={ref} placeholderTextColor="#5E6360" selectionColor={C.mint} style={[s.input, style]} {...rest} />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
        {right}
      </View>
    </View>
  )
);
DarkField.displayName = 'DarkField';

export function MintButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12, stiffness: 250 }))}
    >
      <Animated.View style={[s.mint, disabled && { opacity: 0.35 }, style]}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={s.mintText}>{title}</Text>}
      </Animated.View>
    </Pressable>
  );
}

/** Muvaffaqiyat ekrani: animatsiyali belgi + qatorlar */
export function SuccessView({
  title,
  subtitle,
  rows,
  onDone,
}: {
  title: string;
  subtitle?: string;
  rows: { label: string; value: string }[];
  onDone: () => void;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 9, stiffness: 140 });
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={s.success}>
      <Animated.View style={[s.checkWrap, style]}>
        <Feather name="check" size={42} color="#000" />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(450)} style={{ alignItems: 'center', alignSelf: 'stretch' }}>
        <Text style={s.successTitle}>{title}</Text>
        {subtitle ? <Text style={s.successSub}>{subtitle}</Text> : null}

        <View style={s.rows}>
          {rows.map((r, i) => (
            <View key={r.label} style={[s.row, i < rows.length - 1 && s.rowBorder]}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowValue} numberOfLines={1}>
                {r.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ alignSelf: 'stretch', marginTop: 24 }}>
          <MintButton title="Tayyor" onPress={onDone} />
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: '700' },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#121413',
    borderWidth: 1,
    borderColor: '#242826',
  },
  chipOn: { backgroundColor: C.mint, borderColor: C.mint },
  chipText: { color: C.sub, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#000' },

  fieldLabel: { color: C.sub, fontSize: 13, marginBottom: 8, marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 18,
    backgroundColor: '#121413',
    borderWidth: 1.5,
    borderColor: '#242826',
    overflow: 'hidden',
    paddingRight: 14,
  },
  fieldError: { borderColor: C.red },
  prefix: {
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#242826',
  },
  prefixText: { color: C.text, fontSize: 17, fontWeight: '800' },
  input: { flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 17, fontWeight: '600', color: C.text },
  suffix: { color: C.sub, fontSize: 15, fontWeight: '600' },

  mint: {
    height: 58,
    borderRadius: 18,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mintText: { color: '#000', fontSize: 17, fontWeight: '800' },

  success: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 50 },
  checkWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: { color: C.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  successSub: { color: C.sub, fontSize: 14, marginTop: 8, textAlign: 'center' },
  rows: {
    alignSelf: 'stretch',
    marginTop: 26,
    borderRadius: 22,
    backgroundColor: '#0F1110',
    borderWidth: 1,
    borderColor: '#1F2321',
    paddingHorizontal: 18,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, gap: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#1A1D1B' },
  rowLabel: { color: C.sub, fontSize: 14 },
  rowValue: { color: C.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
});