/**
 * Ron AI Yordamchi
 *
 * - Tuxumsimon Ron roboti (B-bot, Ron's Gone Wrong filmidan ilhom)
 * - Ko'zlar animatsiyasi: miltillash, harakat, fikrlash
 * - Ekranda drag qilish: yon tomonlarga (side) snap
 * - Bosish → Fullscreen chat modal
 * - Chatlar SecureStore da saqlanadi
 * - POST /ai/chat endpointi bilan ishlaydi
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import {
  ChatMessage,
  loadSavedChatHistory,
  saveChatHistory,
  clearSavedChatHistory,
  sendAiChatMessage,
} from '../lib/ai-api';

/* ------------------------------------------------------------------ */
/*  Konstantalar                                                        */
/* ------------------------------------------------------------------ */

const { width: SW, height: SH } = Dimensions.get('window');

const PALETTE = {
  bg: '#080A09',
  surface: '#111412',
  cardBorder: '#232A25',
  mint: '#00E599',
  mintGlow: 'rgba(0, 229, 153, 0.35)',
  text: '#FFFFFF',
  sub: '#8E9490',
  userBubble: '#00E599',
  userText: '#000000',
  ronBubble: '#131916',
  ronBorder: '#252D27',
  headerBorder: '#161B17',
  inputBg: '#0F1511',
};

const QUICK_PROMPTS = [
  { emoji: '💡', text: 'Pulni qanday oqilona tejash mumkin?' },
  { emoji: '📊', text: 'Oylik byudjetni taqsimlash qoidalari' },
  { emoji: '💳', text: "Jamg'armada qanday to'lovlar mavjud?" },
  { emoji: '⚡', text: "Kommunal to'lovlarni tejash sirlari" },
];

const WIDGET_W = 62;
const WIDGET_H = 80;
const EDGE_MARGIN = 14;

/* ------------------------------------------------------------------ */
/*  Ron Ko'zlari (B-bot animatsiyasi)                                  */
/* ------------------------------------------------------------------ */

type EyeSize = 'small' | 'medium';

interface RonEyesProps {
  size?: EyeSize;
  isThinking?: boolean;
}

export function RonEyes({ size = 'medium', isThinking = false }: RonEyesProps) {
  const isSmall = size === 'small';

  // Ko'z o'lchamlari
  const EW = isSmall ? 10 : 13;
  const EH = isSmall ? 14 : 18;
  const GAP = isSmall ? 8 : 11;
  const PW = Math.max(2, Math.round(EW * 0.32));

  const scaleY = useRef(new Animated.Value(1)).current;
  const moveX = useRef(new Animated.Value(0)).current;
  const moveY = useRef(new Animated.Value(0)).current;

  // Miltillash + qarab olish
  useEffect(() => {
    let alive = true;

    const blink = () => {
      if (!alive) return;
      Animated.sequence([
        Animated.timing(scaleY, { toValue: 0.06, duration: 85, useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 1.0, duration: 110, useNativeDriver: true }),
      ]).start(() => {
        // Ba'zan Ron ikki marta miltillaydi (multfilmdan ilhom)
        if (alive && Math.random() < 0.3) {
          setTimeout(() => {
            if (!alive) return;
            Animated.sequence([
              Animated.timing(scaleY, { toValue: 0.06, duration: 75, useNativeDriver: true }),
              Animated.timing(scaleY, { toValue: 1.0, duration: 100, useNativeDriver: true }),
            ]).start();
          }, 130);
        }
      });
    };

    const look = () => {
      if (!alive) return;
      const mx = isSmall ? 3 : 5;
      const my = isSmall ? 2 : 4;
      Animated.parallel([
        Animated.spring(moveX, {
          toValue: (Math.random() - 0.5) * mx * 2,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(moveY, {
          toValue: (Math.random() - 0.5) * my * 2,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const interval = setInterval(() => {
      if (!alive) return;
      blink();
      if (Math.random() < 0.6) look();
    }, isThinking ? 1200 : 3000 + Math.random() * 1000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [scaleY, moveX, moveY, isSmall, isThinking]);

  // Fikrlash paytida ko'zlar chapga-o'ngga chayqaladi
  useEffect(() => {
    if (!isThinking) {
      Animated.spring(moveX, { toValue: 0, friction: 5, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(moveX, { toValue: 3, duration: 220, useNativeDriver: true }),
        Animated.timing(moveX, { toValue: -3, duration: 220, useNativeDriver: true }),
        Animated.timing(moveX, { toValue: 0, duration: 180, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isThinking, moveX]);

  const renderEye = () => (
    <Animated.View
      style={[
        styles.eye,
        {
          width: EW,
          height: EH,
          borderRadius: EW / 2,
          transform: [{ scaleY }, { translateX: moveX }, { translateY: moveY }],
        },
      ]}
    >
      {/* Ko'z ichidagi oq nur nuqtasi */}
      <View
        style={[
          styles.eyeHighlight,
          { width: PW, height: PW, borderRadius: PW / 2 },
        ]}
      />
    </Animated.View>
  );

  return (
    <View style={[styles.eyesRow, { gap: GAP }]}>
      {renderEye()}
      {renderEye()}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Tuxumsimon Ron Roboti Shakli                                       */
/* ------------------------------------------------------------------ */

function RonEgg({ isThinking = false }: { isThinking?: boolean }) {
  const floatY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -5, duration: 1600, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 5, duration: 1600, useNativeDriver: true }),
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.9, duration: 1100, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.35, duration: 1100, useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    glowLoop.start();
    return () => {
      floatLoop.stop();
      glowLoop.stop();
    };
  }, [floatY, glowOpacity]);

  return (
    <Animated.View
      style={[styles.eggWrapper, { transform: [{ translateY: floatY }] }]}
    >
      {/* Neon yashil aura */}
      <Animated.View style={[styles.eggGlow, { opacity: glowOpacity }]} />

      {/* Oq tuxumsimon korp */}
      <View style={styles.eggBody}>
        {/* Yuqori yaltiroq */}
        <View style={styles.eggGleam} />

        {/* Ko'zlar */}
        <RonEyes size="medium" isThinking={isThinking} />

        {/* Og'iz */}
        <View style={styles.eggMouth} />

        {/* Pastki kamar (B-bot detali) */}
        <View style={styles.eggBelt}>
          <View style={styles.eggBeltDot} />
        </View>
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Kichik Ron avatari (chat ichida)                                   */
/* ------------------------------------------------------------------ */

function RonMiniAvatar({ isThinking = false }: { isThinking?: boolean }) {
  return (
    <View style={styles.miniAvatar}>
      <View style={styles.miniAvatarBody}>
        <View style={styles.miniGleam} />
        <RonEyes size="small" isThinking={isThinking} />
        <View style={styles.miniMouth} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Asosiy Komponent: Draggable Ron AI Assistant                       */
/* ------------------------------------------------------------------ */

export default function RonAiAssistant() {
  const insets = useSafeAreaInsets();

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null) as any;

  // ---- Widget boshlang'ich joyi ----
  const startX = SW - WIDGET_W - EDGE_MARGIN;
  const startY = SH * 0.6;

  const pan = useRef(new Animated.ValueXY({ x: startX, y: startY })).current;
  const pos = useRef({ x: startX, y: startY });

  useEffect(() => {
    const sub = pan.addListener((v) => {
      pos.current = v;
    });
    return () => pan.removeListener(sub);
  }, [pan]);

  // ---- Saqlangan chatlarni yuklash ----
  useEffect(() => {
    loadSavedChatHistory().then((saved) => {
      if (saved.length > 0) setMessages(saved);
    });
  }, []);

  // ---- PanResponder ----
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,

      onPanResponderGrant: () => {
        pan.setOffset({ x: pos.current.x, y: pos.current.y });
        pan.setValue({ x: 0, y: 0 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),

      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();

        // Juda kam siljiganlar → Tap (chat ochiladi)
        if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          setChatOpen(true);
          return;
        }

        // Yaqin yon tomonga snap (chap/o'ng)
        const snapX =
          pos.current.x + WIDGET_W / 2 < SW / 2
            ? EDGE_MARGIN
            : SW - WIDGET_W - EDGE_MARGIN;

        const minY = insets.top + 50;
        const maxY = SH - insets.bottom - 100;
        const snapY = Math.max(minY, Math.min(maxY, pos.current.y));

        Animated.spring(pan, {
          toValue: { x: snapX, y: snapY },
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  // ---- Xabar yuborish ----
  const sendMessage = async (text?: string) => {
    const query = (text ?? inputText).trim();
    if (!query || sending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setInputText('');
    setSending(true);
    saveChatHistory(withUser);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    const reply = await sendAiChatMessage(query, messages);

    const ronMsg: ChatMessage = {
      id: `r-${Date.now()}-${Math.random()}`,
      role: 'assistant',
      content: reply,
      timestamp: Date.now(),
    };

    const withRon = [...withUser, ronMsg];
    setMessages(withRon);
    saveChatHistory(withRon);
    setSending(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ---- Chatni tozalash ----
  const clearChat = () => {
    Alert.alert(
      'Suhbatni tozalash',
      "Barcha xabarlar o'chirilsinmi?",
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            await clearSavedChatHistory();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          },
        },
      ]
    );
  };

  // ---- Vaqt formati ----
  const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  /* ============================= RENDER ============================ */

  return (
    <>
      {/* ══════════ Suzuvchi Widget ══════════ */}
      <Animated.View
        style={[
          styles.floatingWidget,
          { transform: pan.getTranslateTransform() },
        ]}
        {...panResponder.panHandlers}
      >
        <RonEgg isThinking={sending} />
      </Animated.View>

      {/* ══════════ Fullscreen Chat Modal ══════════ */}
      <Modal
        visible={chatOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setChatOpen(false)}
      >
        <View
          style={[
            styles.modalRoot,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          {/* ─── Tepa header ─── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Kichik Ron avatari */}
              <RonMiniAvatar isThinking={sending} />
              <View>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle}>Ron AI</Text>
                  <View style={styles.onlinePill}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineLabel}>Faol</Text>
                  </View>
                </View>
                <Text style={styles.headerSub}>
                  Jamg'arma moliyaviy yordamchisi
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {messages.length > 0 && (
                <Pressable
                  onPress={clearChat}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={18} color={PALETTE.sub} />
                </Pressable>
              )}

              {/* ✕ Yopish tugmasi */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                    () => {}
                  );
                  setChatOpen(false);
                }}
                style={styles.closeBtn}
                hitSlop={10}
              >
                <Feather name="x" size={22} color={PALETTE.text} />
              </Pressable>
            </View>
          </View>

          {/* ─── Chat hududi ─── */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.chatArea}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <ScrollView
              ref={scrollRef}
              style={styles.msgList}
              contentContainerStyle={styles.msgListContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                scrollRef.current?.scrollToEnd({ animated: true })
              }
            >
              {/* ─── Bo'sh holat: salomlashuv ─── */}
              {messages.length === 0 && !sending && (
                <View style={styles.welcome}>
                  {/* Markaziy katta Ron */}
                  <View style={styles.welcomeEggWrap}>
                    <View style={styles.welcomeEggGlow} />
                    <View style={styles.welcomeEggBody}>
                      <View style={styles.welcomeEggGleam} />
                      <RonEyes size="medium" />
                      <View style={styles.eggMouth} />
                    </View>
                  </View>

                  <Text style={styles.welcomeTitle}>Salom, men Ron! 🤖</Text>
                  <Text style={styles.welcomeDesc}>
                    Sizning shaxsiy moliyaviy AI yordamchingizman.{'\n'}
                    Pul tejash, xarajatlar, to'lovlar yoki Jamg'arma{'\n'}
                    xizmatlari haqida so'rang!
                  </Text>

                  <View style={styles.prompts}>
                    {QUICK_PROMPTS.map((p, i) => (
                      <Pressable
                        key={i}
                        onPress={() => sendMessage(p.emoji + ' ' + p.text)}
                        style={styles.promptChip}
                      >
                        <Text style={styles.promptEmoji}>{p.emoji}</Text>
                        <Text style={styles.promptText}>{p.text}</Text>
                        <Feather
                          name="arrow-up-right"
                          size={14}
                          color={PALETTE.mint}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* ─── Xabarlar ─── */}
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <View
                    key={m.id}
                    style={[
                      styles.bubbleRow,
                      isUser ? styles.bubbleRowUser : styles.bubbleRowRon,
                    ]}
                  >
                    {!isUser && (
                      <RonMiniAvatar isThinking={false} />
                    )}
                    <View
                      style={[
                        styles.bubble,
                        isUser ? styles.userBubble : styles.ronBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          isUser
                            ? styles.userBubbleText
                            : styles.ronBubbleText,
                        ]}
                        selectable
                      >
                        {m.content}
                      </Text>
                      <Text
                        style={[
                          styles.bubbleTime,
                          isUser ? styles.userBubbleTime : styles.ronBubbleTime,
                        ]}
                      >
                        {fmtTime(m.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* ─── Ron fikrlayapti… ─── */}
              {sending && (
                <View style={[styles.bubbleRow, styles.bubbleRowRon]}>
                  <RonMiniAvatar isThinking />
                  <View style={[styles.bubble, styles.ronBubble, styles.thinkBubble]}>
                    <ActivityIndicator size="small" color={PALETTE.mint} />
                    <Text style={styles.thinkText}>Ron javob yozmoqda…</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* ─── Input paneli ─── */}
            <View style={styles.inputBar}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ron dan so'rang…"
                placeholderTextColor={PALETTE.sub}
                style={styles.textInput}
                multiline
                maxLength={700}
                editable={!sending}
              />
              <Pressable
                onPress={() => sendMessage()}
                disabled={!inputText.trim() || sending}
                style={[
                  styles.sendBtn,
                  (!inputText.trim() || sending) && styles.sendBtnOff,
                ]}
              >
                <Feather name="arrow-up" size={20} color="#000" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  StyleSheet                                                         */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  /* ── Suzuvchi Widget ── */
  floatingWidget: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    elevation: 12,
  },

  /* ── Tuxumsimon Ron ── */
  eggWrapper: {
    width: WIDGET_W,
    height: WIDGET_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eggGlow: {
    position: 'absolute',
    width: WIDGET_W + 4,
    height: WIDGET_H + 4,
    borderRadius: (WIDGET_W + 4) / 2,
    backgroundColor: PALETTE.mintGlow,
    shadowColor: PALETTE.mint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 10,
  },
  eggBody: {
    width: WIDGET_W - 4,
    height: WIDGET_H - 4,
    borderRadius: (WIDGET_W - 4) / 2,
    backgroundColor: '#FAFCFA',
    borderWidth: 2,
    borderColor: '#DDE8DF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  eggGleam: {
    position: 'absolute',
    top: 5,
    width: 28,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  eggMouth: {
    width: 9,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2E3832',
    marginTop: 7,
  },
  eggBelt: {
    position: 'absolute',
    bottom: 7,
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0EAE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eggBeltDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.mint,
  },

  /* ── Ko'zlar ── */
  eyesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eye: {
    backgroundColor: '#1A1F1B',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 2,
  },
  eyeHighlight: {
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },

  /* ── Kichik Ron avatari ── */
  miniAvatar: {
    width: 32,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  miniAvatarBody: {
    width: 30,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FAFCFA',
    borderWidth: 1.5,
    borderColor: PALETTE.mint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniGleam: {
    position: 'absolute',
    top: 3,
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  miniMouth: {
    width: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2E3832',
    marginTop: 4,
  },

  /* ── Fullscreen Modal ── */
  modalRoot: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.headerBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: PALETTE.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 153, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 153, 0.2)',
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: PALETTE.mint,
  },
  onlineLabel: {
    color: PALETTE.mint,
    fontSize: 10,
    fontWeight: '700',
  },
  headerSub: {
    color: PALETTE.sub,
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1B211C',
    borderWidth: 1,
    borderColor: '#2A3330',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Chat ── */
  chatArea: { flex: 1 },
  msgList: { flex: 1 },
  msgListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },

  /* ── Salomlashuv ── */
  welcome: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  welcomeEggWrap: {
    width: 80,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeEggGlow: {
    position: 'absolute',
    width: 86,
    height: 106,
    borderRadius: 43,
    backgroundColor: PALETTE.mintGlow,
    shadowColor: PALETTE.mint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 8,
  },
  welcomeEggBody: {
    width: 72,
    height: 94,
    borderRadius: 36,
    backgroundColor: '#FAFCFA',
    borderWidth: 2.5,
    borderColor: PALETTE.mint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  welcomeEggGleam: {
    position: 'absolute',
    top: 8,
    width: 36,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  welcomeTitle: {
    color: PALETTE.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeDesc: {
    color: PALETTE.sub,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
  },
  prompts: { width: '100%', gap: 10 },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  promptEmoji: { fontSize: 18 },
  promptText: {
    color: PALETTE.text,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  /* ── Pufakchalar ── */
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowRon: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 8,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: PALETTE.userBubble,
    borderBottomRightRadius: 4,
  },
  ronBubble: {
    backgroundColor: PALETTE.ronBubble,
    borderWidth: 1,
    borderColor: PALETTE.ronBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userBubbleText: {
    color: PALETTE.userText,
    fontWeight: '600',
  },
  ronBubbleText: {
    color: PALETTE.text,
    fontWeight: '400',
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userBubbleTime: { color: 'rgba(0,0,0,0.5)' },
  ronBubbleTime: { color: PALETTE.sub },

  thinkBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkText: {
    color: PALETTE.mint,
    fontSize: 14,
    fontWeight: '500',
  },

  /* ── Input paneli ── */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: '#1E2820',
    borderRadius: 26,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: PALETTE.text,
    fontSize: 15,
    maxHeight: 110,
    paddingTop: 8,
    paddingBottom: 8,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PALETTE.mint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PALETTE.mint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 2,
  },
  sendBtnOff: {
    backgroundColor: '#1E2820',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.5,
  },
});
