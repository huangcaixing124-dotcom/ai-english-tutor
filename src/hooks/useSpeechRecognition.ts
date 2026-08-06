'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => Promise<string>;
  isSupported: boolean;
  error: string | null;
}

/**
 * 语音识别 Hook
 * 封装 Web Speech API，支持浏览器语音转文字
 */
export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((value: string) => void) | null>(null);
  const finalTranscriptRef = useRef('');

  // 初始化 SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // 英语为主

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + final;
          setTranscript(finalTranscriptRef.current);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        } else {
          setError(`Error: ${event.error}`);
        }
        setIsListening(false);
        if (resolveRef.current) {
          resolveRef.current(finalTranscriptRef.current || '');
          resolveRef.current = null;
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (resolveRef.current) {
          resolveRef.current(finalTranscriptRef.current || '');
          resolveRef.current = null;
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    setError(null);
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }, []);

  const stopListening = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!recognitionRef.current) {
        resolve(finalTranscriptRef.current || '');
        return;
      }

      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }

      // 如果已经有内容，直接返回
      if (finalTranscriptRef.current) {
        resolve(finalTranscriptRef.current);
      } else {
        // 等待 onend 回调
        resolveRef.current = resolve;
        // 安全超时
        setTimeout(() => {
          if (resolveRef.current) {
            resolveRef.current(finalTranscriptRef.current || '');
            resolveRef.current = null;
          }
        }, 2000);
      }
    });
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
  };
}