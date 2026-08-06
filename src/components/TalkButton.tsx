'use client';

import type { ConversationStatus } from '@/lib/types';

interface TalkButtonProps {
  status: ConversationStatus;
  onToggle: () => void;
}

/**
 * 主对话按钮
 * Apple 风格 — 大圆形，状态切换，脉冲动画
 */
export default function TalkButton({ status, onToggle }: TalkButtonProps) {
  const isActive = status === 'recording';
  const isLoading = status === 'processing';
  const isSpeaking = status === 'speaking';

  return (
    <div className="relative flex items-center justify-center">
      {/* 波纹扩散动画（录音时） */}
      {isActive && (
        <>
          <div
            className="absolute w-20 h-20 rounded-full bg-red-400/30"
            style={{ animation: 'ripple 1.5s ease-out infinite' }}
          />
          <div
            className="absolute w-20 h-20 rounded-full bg-red-400/20"
            style={{ animation: 'ripple 1.5s ease-out infinite 0.5s' }}
          />
          <div
            className="absolute w-20 h-20 rounded-full bg-red-400/10"
            style={{ animation: 'ripple 1.5s ease-out infinite 1s' }}
          />
        </>
      )}

      {/* 主按钮 */}
      <button
        onClick={onToggle}
        disabled={isLoading || isSpeaking}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-300 ease-out
          active:scale-95
          ${isActive
            ? 'bg-red-500 shadow-lg shadow-red-500/30 scale-110'
            : isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : isSpeaking
            ? 'bg-green-500 cursor-not-allowed'
            : 'bg-gray-200 dark:bg-[#2c2c2e] hover:bg-gray-300 dark:hover:bg-[#3a3a3c] active:bg-gray-400 dark:active:bg-[#48484a]'
          }
        `}
        aria-label={isActive ? 'Stop recording' : 'Start recording'}
      >
        {isLoading ? (
          /* 加载转圈 */
          <svg className="w-7 h-7 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : isSpeaking ? (
          /* 扬声器图标 */
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : isActive ? (
          /* 停止图标（录音中） */
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          /* 麦克风图标（待机） */
          <svg className="w-7 h-7 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>

      {/* 底部提示文字 */}
      <span className="absolute -bottom-8 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {isActive ? 'Tap to stop' : isLoading ? 'Processing...' : isSpeaking ? 'Speaking...' : 'Tap to speak'}
      </span>
    </div>
  );
}