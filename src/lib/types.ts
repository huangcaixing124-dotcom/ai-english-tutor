// 角色表情状态
export type CharacterState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'correcting' | 'happy';

// 对话状态
export type ConversationStatus = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

// AI 响应结构
export interface AIResponse {
  english: string;
  chinese: string;
  correction: string | null;
}

// 一轮完整对话
export interface ConversationTurn {
  id: string;
  userText: string;
  aiResponse: AIResponse;
  timestamp: number;
}

// 全局状态
export interface AppState {
  characterState: CharacterState;
  conversationStatus: ConversationStatus;
  currentTurn: ConversationTurn | null;
  history: ConversationTurn[];
  error: string | null;
}