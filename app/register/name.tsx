import React, { useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { router } from 'expo-router';
import { AuthLayout, Field } from '../../components/auth-ui';
import { getDraft, setDraft } from '../../lib/register-api';

export default function RegisterName() {
  const draft = getDraft();
  const [first, setFirst] = useState(draft.first_name);
  const [last, setLast] = useState(draft.last_name);
  const lastRef = useRef<any>(null);

  const valid = first.trim().length >= 2 && last.trim().length >= 2;

  const onNext = () => {
    if (!valid) return;
    setDraft({ first_name: first.trim(), last_name: last.trim() });
    router.push('/register/phone');
  };

  return (
    <AuthLayout
      step={1}
      title="Ism va familiyangiz"
      subtitle="Ma'lumotlaringizni to'g'ri kiriting"
      buttonTitle="Keyingisi"
      onSubmit={onNext}
      disabled={!valid}
    >
      <View style={{ gap: 12 }}>
        <Field
          autoFocus
          placeholder="Ism"
          value={first}
          onChangeText={setFirst}
          autoCapitalize="words"
          textContentType="givenName"
          maxLength={50}
          returnKeyType="next"
          onSubmitEditing={() => lastRef.current?.focus()}
          blurOnSubmit={false}
        />
        <Field
          ref={lastRef}
          placeholder="Familiya"
          value={last}
          onChangeText={setLast}
          autoCapitalize="words"
          textContentType="familyName"
          maxLength={50}
          returnKeyType="done"
          onSubmitEditing={onNext}
        />
      </View>
    </AuthLayout>
  );
}