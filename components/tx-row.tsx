import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { money } from '../lib/home-api';
import { ActivityRowData } from '../lib/activity';
import { C } from './home-ui';

const STATUS = {
  success: { text: 'Bajarildi', color: C.sub },
  pending: { text: 'Kutilmoqda', color: C.amber },
  failed: { text: "Bekor bo'ldi", color: C.red },
} as const;

type IconName = React.ComponentProps<typeof Feather>['name'];

export function TxRow({ item }: { item: ActivityRowData }) {
  const st = STATUS[item.status] ?? STATUS.success;
  const sign = item.dir === 'out' ? '−' : item.dir === 'in' ? '+' : '';
  const color = item.dir === 'in' ? C.mint : item.dir === 'out' ? C.text : C.sub;

  return (
    <View style={s.item}>
      <View style={s.icon}>
        <Feather name={item.icon as IconName} size={20} color={C.text} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={s.sub} numberOfLines={1}>
          {item.category} · {item.time}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.amount, { color }]}>
          {sign}
          {money(item.amount)} so'm
        </Text>
        <Text style={[s.status, { color: st.color }]}>{st.text}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#121413',
    borderWidth: 1,
    borderColor: '#242826',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: C.text, fontSize: 16, fontWeight: '600' },
  sub: { color: C.sub, fontSize: 12, marginTop: 3 },
  amount: { fontSize: 15, fontWeight: '700' },
  status: { fontSize: 11, marginTop: 3 },
});