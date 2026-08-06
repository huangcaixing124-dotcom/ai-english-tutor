'use client';

import { useState, useCallback, useRef } from 'react';
import type { CharacterState, ConversationStatus, ConversationTurn, AIResponse } from '@/lib/types';
import { getWelcomeMessage } from '@/lib/ai';

interface UseConversationReturn {
  characterState: CharacterState;
  conversationStatus: ConversationStatus;
  currentTurn: ConversationTurn | null;
  userTranscript: string;
  error: string | null;
  startConversation: () => void;
  stopConversation: () => void;
  speakText: (text: string) => Promise<void>;
  isSpeaking: boolean;
}

/**
 * 对话管理 Hook
 * 协调：语音识别 → AI 请求 → 展示 → TTS 播放
 */
export function useConversation(
  speechRecognition: {
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    startListening: () => void;
    stopListening: () => Promise<string>;
    isSupported: boolean;
    error: string | null;
  }
): UseConversationReturn {
  const [characterState, setCharacterState] = useState<CharacterState>('idle');
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('idle');
  const [currentTurn, setCurrentTurn] = useState<ConversationTurn | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const welcomeRef = useRef(false);

  // 显示欢迎语
  const showWelcome = useCallback(() => {
    if (!welcomeRef.current) {
      const welcome = getWelcomeMessage();
      setCurrentTurn({
        id: 'welcome',
        userText: '',
        aiResponse: welcome,
        timestamp: Date.now(),
      });
      welcomeRef.current = true;
    }
  }, []);

  // 开始对话（录音）
  const startConversation = useCallback(() => {
    setError(null);
    setUserTranscript('');
    setCharacterState('listening');
    setConversationStatus('recording');
    speechRecognition.startListening();
  }, [speechRecognition]);

  // 停止对话（停止录音 → 处理）
  const stopConversation = useCallback(async () => {
    setCharacterState('thinking');
    setConversationStatus('processing');

    const text = await speechRecognition.stopListening();

    if (!text || text.trim().length === 0) {
      setCharacterState('idle');
      setConversationStatus('idle');
      return;
    }

    setUserTranscript(text);

    // 调用 AI API
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data = await response.json();
      const aiResponse: AIResponse = {
        english: data.english,
        chinese: data.chinese,
        correction: data.correction || null,
      };

      const turn: ConversationTurn = {
        id: Date.now().toString(),
        userText: text.trim(),
        aiResponse,
        timestamp: Date.now(),
      };

      setCurrentTurn(turn);

      // 根据是否有纠正，选择角色状态
      if (aiResponse.correction) {
        setCharacterState('correcting');
      } else {
        setCharacterState('happy');
      }

      // TTS 朗读英文回答
      setConversationStatus('speaking');
      setCharacterState('speaking');

      await speakTextWithBrowser(aiResponse.english);

      setCharacterState('happy');
      setConversationStatus('idle');

      // 短暂开心后恢复 idle
      setTimeout(() => {
        setCharacterState('idle');
      }, 2000);
    } catch (err) {
      console.error('Conversation error:', err);
      setError('Failed to get AI response. Please try again.');
      setCharacterState('idle');
      setConversationStatus('idle');
    }
  }, [speechRecognition]);

  // TTS 语音合成
  const speakTextWithBrowser = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      // 取消任何正在进行的语音
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // 选择美式英语女声
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.name === 'Samantha' || v.name.includes('American') || v.lang === 'en-US'
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      setIsSpeaking(true);

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      // 某些浏览器需要延迟加载语音列表
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          const updatedVoices = window.speechSynthesis.getVoices();
          const voice = updatedVoices.find(
            (v) => v.name === 'Samantha' || v.name.includes('American') || v.lang === 'en-US'
          );
          if (voice) utterance.voice = voice;
          window.speechSynthesis.speak(utterance);
        };
      } else {
        window.speechSynthesis.speak(utterance);
      }
    });
  }, []);

  return {
    characterState,
    conversationStatus,
    currentTurn,
    userTranscript,
    error,
    startConversation,
    stopConversation,
    speakText: speakTextWithBrowser,
    isSpeaking,
  };
}