import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, money } from '../lib/home-api';
import { C } from './home-ui';

export function CardSelector({
  cards,
  selectedCard,
  onSelect,
  label = "To'lov kartasi",
}: {
  cards: Card[];
  selectedCard?: Card | null;
  onSelect: (card: Card) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!cards.length) return null;

  const current = selectedCard ?? cards[0];
  const balance = Number(current?.balance ?? 0) || 0;
  const isMultiple = cards.length > 1;

  const handleSelect = (c: Card) => {
    Haptics.selectionAsync().catch(() => {});
    onSelect(c);
    setOpen(false);
  };

  return (
    <View style={s.container}>
      <Pressable
        onPress={() => isMultiple && setOpen(true)}
        disabled={!isMultiple}
        style={({ pressed }) => [
          s.cardBox,
          isMultiple && pressed && s.cardBoxPressed,
        ]}
      >
        <View style={s.iconWrapper}>
          <Feather name="credit-card" size={20} color={C.mint} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.cardTitle}>
              •••• {String(current?.card_number ?? '').slice(-4)}
            </Text>
            {current?.is_frozen && (
              <View style={s.frozenBadge}>
                <Text style={s.frozenText}>Muzlatilgan</Text>
              </View>
            )}
          </View>
          <Text style={s.cardSub}>
            Balans: {money(balance)} so'm
          </Text>
        </View>

        {isMultiple && (
          <View style={s.changeBtn}>
            <Text style={s.changeText}>Almashtirish</Text>
            <Feather name="chevron-down" size={16} color={C.mint} />
          </View>
        )}
      </Pressable>

      {/* Modal: Barcha kartalar ro'yxati */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={s.modalSheet}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{label}</Text>
                  <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                    <Feather name="x" size={20} color={C.sub} />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {cards.map((c, i) => {
                    const isSelected = c.card_number === current?.card_number;
                    const cBal = Number(c.balance ?? 0) || 0;
                    return (
                      <Pressable
                        key={c.card_number}
                        onPress={() => handleSelect(c)}
                        style={[s.modalItem, isSelected && s.modalItemActive]}
                      >
                        <View style={[s.iconWrapper, isSelected && { backgroundColor: C.mintDark }]}>
                          <Feather name="credit-card" size={18} color={isSelected ? C.mint : C.sub} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[s.modalCardNumber, isSelected && { color: C.text }]}>
                              •••• {String(c.card_number).slice(-4)}
                            </Text>
                            {c.is_frozen && (
                              <View style={s.frozenBadge}>
                                <Text style={s.frozenText}>Muzlatilgan</Text>
                              </View>
                            )}
                          </View>
                          <Text style={s.modalCardBal}>
                            {money(cBal)} so'm
                          </Text>
                        </View>
                        {isSelected && <Feather name="check" size={18} color={C.mint} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { width: '100%' },
  cardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#1F2321',
  },
  cardBoxPressed: {
    opacity: 0.8,
    borderColor: '#2D3530',
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#161A18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  cardSub: { color: C.sub, fontSize: 13, marginTop: 2 },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#15241C',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  changeText: { color: C.mint, fontSize: 12, fontWeight: '600' },
  frozenBadge: {
    backgroundColor: '#352210',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  frozenText: { color: C.amber, fontSize: 10, fontWeight: '700' },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111413',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#1F2421',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1E1C',
  },
  modalTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#0D0F0E',
    borderWidth: 1,
    borderColor: '#1B1F1D',
  },
  modalItemActive: {
    borderColor: C.mint,
    backgroundColor: '#101814',
  },
  modalCardNumber: { color: '#C0C5C2', fontSize: 15, fontWeight: '700' },
  modalCardBal: { color: C.sub, fontSize: 13, marginTop: 2 },
});
