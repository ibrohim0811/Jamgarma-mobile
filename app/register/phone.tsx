import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AuthLayout, Field, FieldError, formatUz, cleanPhoneDigits } from '../../components/auth-ui';
import { getDraft, setDraft } from '../../lib/register-api';

export default function RegisterPhone() {
  // Parol ekranidan xato bilan qaytilganda (masalan: raqam avval ro'yxatdan o'tgan)
  const { error, t } = useLocalSearchParams<{ error?: string; t?: string }>();

  const [digits, setDigits] = useState(getDraft().phone);
  const [errMsg, setErrMsg] = useState<string | null>(error ?? null);

  useEffect(() => {
    if (!error) return;
    setErrMsg(error);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [error, t]);

  const onNext = () => {
    if (digits.length !== 9) return;
    setDraft({ phone: digits });
    router.push('/register/password');
  };

  return (
    <AuthLayout
      step={2}
      title="Telefon raqamingiz"
      subtitle="Tasdiqlash kodi shu raqam uchun yuboriladi"
      buttonTitle="Keyingisi"
      onSubmit={onNext}
      disabled={digits.length !== 9}
    >
      <Field
        autoFocus
        prefix="+998"
        error={!!errMsg}
        keyboardType="phone-pad"
        placeholder="90 123 45 67"
        value={formatUz(digits)}
        onChangeText={(v) => {
          setDigits(cleanPhoneDigits(v));
          if (errMsg) setErrMsg(null);
        }}
        onSubmitEditing={onNext}
        maxLength={13}
        style={{ fontSize: 20, fontWeight: '700' }}
      />
      <FieldError message={errMsg} />
    </AuthLayout>
  );
}