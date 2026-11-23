import React from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar } from './home-ui';

export type TabKey = 'home' | 'pay' | 'transactions' | 'stats' | 'profile';

/**
 * Pastki menyu: Asosiy · To'lov · Tranzaksiya · Statistika · Profil.
 * Asosiy ekrandan boshqa ekranga `push`, boshqa ekranlar orasida `replace` qilinadi,
 * shuning uchun "orqaga" har doim asosiy ekranga qaytaradi.
 */
export function AppTabBar({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets();

  const go = (key: string) => {
    if (key === active) return;
    Haptics.selectionAsync().catch(() => {});

    if (key === 'home') {
      router.dismissTo('/home');
      return;
    }
    if (key === 'profile') return; // hozircha ekrani yo'q

    const path = `/${key}` as any;
    if (active === 'home') router.push(path);
    else router.replace(path);
  };

  return <TabBar active={active} bottomInset={insets.bottom} onPress={go} />;
}