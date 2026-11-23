import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { money } from '../lib/home-api';
import { Cell, ContributionData, MONTHS_SHORT, WEEKDAYS_SHORT } from '../lib/stats-calc';
import { C } from './home-ui';

const CELL = 12;
const GAP = 3;
const LABEL_W = 24;
const LEVELS = ['#171B19', '#17402B', '#1F6B45', '#3FAF73', '#BDF7D6'];

const pad = (n: number) => String(n).padStart(2, '0');

/** GitHub kabi faollik grafigi: har bir katak = bir kun, rang = o'sha kungi kirim miqdori */
export function ContributionGraph({ data }: { data: ContributionData }) {
  const [sel, setSel] = useState<Cell | null>(null);
  const scroller = useRef<ScrollView>(null);

  // Oy nomlari: oy almashgan haftada (yonma-yon ikkita yozuv bir-birini bosmasligi uchun siyraklashtiriladi)
  const months = useMemo(() => {
    const raw = data.weeks.map((w, i) => {
      const m = w[0].date.getMonth();
      const prev = i > 0 ? data.weeks[i - 1][0].date.getMonth() : -1;
      return m !== prev ? MONTHS_SHORT[m] : '';
    });
    return raw.map((label, i) => (label && (raw[i + 1] || raw[i + 2]) ? '' : label));
  }, [data]);

  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <View style={{ flexDirection: 'row' }}>
        {/* Hafta kunlari */}
        <View style={{ width: LABEL_W, paddingTop: 18 }}>
          {WEEKDAYS_SHORT.map((d, r) => (
            <View key={d} style={{ height: CELL, marginBottom: GAP, justifyContent: 'center' }}>
              {r % 2 === 0 ? <Text style={s.weekday}>{d}</Text> : null}
            </View>
          ))}
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
        >
          <View>
            <View style={{ flexDirection: 'row', height: 18 }}>
              {months.map((label, i) => (
                <View key={i} style={{ width: CELL + GAP }}>
                  {label ? (
                    <Text numberOfLines={1} style={[s.month, { width: 32 }]}>
                      {label}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: GAP }}>
              {data.weeks.map((week, wi) => (
                <View key={wi} style={{ gap: GAP }}>
                  {week.map((c, ci) =>
                    c.future ? (
                      <View key={ci} style={{ width: CELL, height: CELL }} />
                    ) : (
                      <Pressable key={ci} onPress={() => setSel(c)}>
                        <View
                          style={{
                            width: CELL,
                            height: CELL,
                            borderRadius: 3,
                            backgroundColor: LEVELS[c.level],
                            borderWidth: sel && sel.date.getTime() === c.date.getTime() ? 1.5 : 0,
                            borderColor: '#FFFFFF',
                          }}
                        />
                      </Pressable>
                    )
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Tanlangan kun */}
      <Text style={s.selected}>
        {sel
          ? `${pad(sel.date.getDate())}.${pad(sel.date.getMonth() + 1)}.${sel.date.getFullYear()} · ${
              sel.amount > 0 ? `+${money(sel.amount)} so'm` : "kirim yo'q"
            }`
          : 'Batafsil ko\'rish uchun katakni bosing'}
      </Text>

      {/* Izoh */}
      <View style={s.legend}>
        <Text style={s.legendText}>Kam</Text>
        {LEVELS.map((c) => (
          <View key={c} style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: c }} />
        ))}
        <Text style={s.legendText}>Ko'p</Text>
      </View>

      {/* Ketma-ketlik */}
      <View style={s.stats}>
        <Stat label="Joriy ketma-ketlik" value={`${data.current} kun`} />
        <Stat label="Eng uzun" value={`${data.longest} kun`} />
        <Stat label="Faol kunlar" value={`${data.activeDays}`} />
      </View>
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  weekday: { color: C.sub, fontSize: 9 },
  month: { color: C.sub, fontSize: 10 },
  selected: { color: C.text, fontSize: 13, fontWeight: '600', marginTop: 14 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, justifyContent: 'flex-end' },
  legendText: { color: C.sub, fontSize: 11, marginHorizontal: 4 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#141716',
    borderWidth: 1,
    borderColor: '#202422',
  },
  statValue: { color: C.mint, fontSize: 16, fontWeight: '800' },
  statLabel: { color: C.sub, fontSize: 11, marginTop: 4 },
});