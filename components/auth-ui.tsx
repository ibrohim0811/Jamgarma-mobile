import React from 'react';
import {
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** "901234567" → "90 123 45 67" */
export function formatUz(digits: string) {
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return parts.filter(Boolean).join(' ');
}

/** Kiritilgan matndan faqat 9 ta raqamni qoldiradi (+998 bilan qo'yilsa ham) */
export function cleanPhoneDigits(v: string) {
  let d = v.replace(/\D/g, '');
  if (d.startsWith('998') && d.length > 9) d = d.slice(3);
  return d.slice(0, 9);
}

export function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
      <Ionicons name="arrow-back" size={22} color="#000" />
    </Pressable>
  );
}

export function PrimaryButton({
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
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inactive = disabled || loading;

  return (
    <Pressable
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12, stiffness: 250 }))}
    >
      <Animated.View style={[styles.primary, disabled && styles.primaryDisabled, aStyle]}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Umumiy ekran qobig'i: orqaga + progress + sarlavha + pastki tugma   */
/* ------------------------------------------------------------------ */

export function AuthLayout({
  title,
  subtitle,
  step,
  totalSteps = 4,
  children,
  buttonTitle,
  onSubmit,
  disabled,
  loading,
}: {
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
  buttonTitle: string;
  onSubmit: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topRow}>
          <BackButton />
          {step ? (
            <View style={styles.progress}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View key={i} style={[styles.seg, i < step && styles.segOn]} />
              ))}
            </View>
          ) : null}
        </View>

        <Animated.View entering={FadeInDown.duration(500)} style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)}>{children}</Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton title={buttonTitle} onPress={onSubmit} disabled={disabled} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/*  Input maydoni                                                       */
/* ------------------------------------------------------------------ */

type FieldProps = TextInputProps & {
  prefix?: string;
  error?: boolean;
  right?: React.ReactNode;
};

export const Field = React.forwardRef<TextInput, FieldProps>(
  ({ prefix, error, right, style, ...rest }, ref) => (
    <View style={[styles.field, error && styles.fieldError]}>
      {prefix ? (
        <View style={styles.prefix}>
          <Text style={styles.prefixText}>{prefix}</Text>
        </View>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#C4C4CC"
        style={[styles.input, style]}
        {...rest}
      />
      {right}
    </View>
  )
);
Field.displayName = 'Field';

export function FieldError({ message }: { message?: string | null }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  progress: { flex: 1, flexDirection: 'row', gap: 6, marginLeft: 16 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  segOn: { backgroundColor: '#000' },
  head: { marginTop: 28, marginBottom: 28 },
  title: { fontSize: 30, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 21, color: '#6B7280' },
  footer: { paddingHorizontal: 20, paddingTop: 12 },

  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.3 },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F4F4F5',
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
    paddingRight: 8,
  },
  fieldError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  error: { marginTop: 12, fontSize: 14, color: '#DC2626', fontWeight: '600' },
});