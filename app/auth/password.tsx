import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BackButton, PrimaryButton, formatUz } from '../../components/auth-ui';
import { login, ApiError, NetworkError } from '../../lib/auth-api';
import { hasPin } from '../../lib/pin';

const HOME_ROUTE = '/home'; // kirgandan keyin ochiladigan ekran

export default function PasswordScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>(); // faqat 9 ta raqam
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    if (!password || loading) return;
    setLoading(true);
    setError(null);

    try {
      await login(`+998${phone}`, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Bu qurilmada 4 xonali parol hali o'rnatilmagan bo'lsa, avval uni o'rnatamiz
      const next = (await hasPin()) ? HOME_ROUTE : '/pin';
      router.replace(next as any);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Telefon yoki parol xato → telefon raqam oynasiga qaytaramiz
        router.dismissTo({
          pathname: '/auth/phone',
          params: { error: e.message, phone, t: String(Date.now()) },
        });
      } else if (e instanceof NetworkError || e instanceof ApiError) {
        setError(e.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else {
        setError('Kutilmagan xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
        <BackButton />

        <Animated.View entering={FadeInDown.duration(500)} style={styles.head}>
          <Text style={styles.title}>Parolni kiriting</Text>
          <Text style={styles.subtitle}>+998 {formatUz(phone ?? '')} raqami uchun</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(500)}
          style={[styles.inputRow, error ? styles.inputRowError : null]}
        >
          <TextInput
            autoFocus
            style={styles.input}
            placeholder="Parol"
            placeholderTextColor="#C4C4CC"
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            onSubmitEditing={onLogin}
            returnKeyType="done"
          />
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={10} style={styles.eye}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
          </Pressable>
        </Animated.View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton title="Kirish" onPress={onLogin} disabled={!password} loading={loading} />
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
    paddingRight: 16,
  },
  inputRowError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 18,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  eye: { padding: 4 },
  error: { marginTop: 12, fontSize: 14, color: '#DC2626', fontWeight: '600' },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
});