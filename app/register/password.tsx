import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AuthLayout, Field, FieldError } from '../../components/auth-ui';
import { getDraft, setDraft, register } from '../../lib/register-api';
import { ApiError, NetworkError } from '../../lib/auth-api';

export default function RegisterPassword() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = password.length >= 6;

  const onSubmit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    setDraft({ password });

    try {
      await register(getDraft()); // OTP yuboriladi
      router.push('/register/otp');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      if (e instanceof ApiError && e.status === 400) {
        // Masalan: "Bu telefon raqam avval ro'yxatdan o'tgan" → telefon ekraniga qaytaramiz
        router.dismissTo({
          pathname: '/register/phone',
          params: { error: e.message, t: String(Date.now()) },
        });
      } else if (e instanceof ApiError || e instanceof NetworkError) {
        setError(e.message);
      } else {
        setError('Kutilmagan xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      step={3}
      title="Parol o'ylab toping"
      subtitle="Bu parol akkauntingizga kirish uchun kerak bo'ladi"
      buttonTitle="Ro'yxatdan o'tish"
      onSubmit={onSubmit}
      disabled={!valid}
      loading={loading}
    >
      <Field
        autoFocus
        error={!!error}
        placeholder="Parol"
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError(null);
        }}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
        right={
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={10} style={{ padding: 8 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
          </Pressable>
        }
      />
      {error ? (
        <FieldError message={error} />
      ) : (
        <Text style={{ marginTop: 12, fontSize: 13, color: '#9CA3AF' }}>Kamida 6 ta belgi</Text>
      )}
    </AuthLayout>
  );
}