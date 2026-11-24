import * as SecureStore from 'expo-secure-store';
import { call } from './home-api';
import { ApiError, NetworkError } from './auth-api';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
};

const CHAT_STORAGE_KEY = 'jamgarma_ron_chat_history_v1';

/**
 * Xotirada saqlangan chat tarixini yuklash
 */
export async function loadSavedChatHistory(): Promise<ChatMessage[]> {
  try {
    const raw = await SecureStore.getItemAsync(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.warn('Chat tarixini yuklashda xatolik:', e);
    return [];
  }
}

/**
 * Chat tarixini xotiraga saqlash (oxirgi 40 ta xabar)
 */
export async function saveChatHistory(messages: ChatMessage[]): Promise<void> {
  try {
    const slice = messages.slice(-40);
    await SecureStore.setItemAsync(CHAT_STORAGE_KEY, JSON.stringify(slice));
  } catch (e) {
    console.warn('Chat tarixini saqlashda xatolik:', e);
  }
}

/**
 * Chat tarixini tozalash
 */
export async function clearSavedChatHistory(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CHAT_STORAGE_KEY);
  } catch (e) {
    console.warn('Chat tarixini tozalashda xatolik:', e);
  }
}

/**
 * AI ga xabar yuborish (POST /ai/chat)
 * API talabi:
 *  - message: string
 *  - history?: [{ role: "user" | "assistant", content: string }] (oxirgi 10 tasi)
 */
export async function sendAiChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<string> {
  // Tarixdan faqat oxirgi 10 tasini user va assistant rollari bilan jo'natamiz
  const historyPayload = history.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const res = await call('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        history: historyPayload,
      }),
    });

    if (res && typeof res.reply === 'string') {
      return res.reply.trim();
    }
    return "Javob olindi, lekin matn bo'sh.";
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 502) {
        return "AI xizmati vaqtincha band yoki javob bermayapti. Iltimos birozdan so'ng qayta urinib ko'ring.";
      }
      return e.message || 'Xatolik yuz berdi.';
    }
    if (e instanceof NetworkError) {
      return "Internet bilan aloqa yo'q yoki serverga ulanib bo'lmadi.";
    }
    return e instanceof Error ? e.message : 'Kutilmagan xatolik yuz berdi.';
  }
}
