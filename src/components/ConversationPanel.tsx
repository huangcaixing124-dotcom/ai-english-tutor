'use client';

import type { ConversationTurn } from '@/lib/types';

interface ConversationPanelProps {
  turn: ConversationTurn | null;
  userTranscript: string;
  isRecording: boolean;
}

/**
 * 对话展示面板
 * 三段式：用户语音文字 → AI 英文 → 中文翻译 → 纠正建议
 */
export default function ConversationPanel({ turn, userTranscript, isRecording }: ConversationPanelProps) {
  if (!turn && !userTranscript) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto px-6 space-y-3">
      {/* 用户语音文字 */}
      {userTranscript && (
        <div className="slide-up">
          <div className="flex justify-end">
            <div className="max-w-[85%] bg-blue-500 text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm leading-relaxed">
              <p>{userTranscript}</p>
              {isRecording && (
                <span className="inline-block w-1.5 h-3.5 bg-white rounded-full ml-1 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI 回复 */}
      {turn && (
        <div className="space-y-2 slide-up" style={{ animationDelay: '0.1s' }}>
          {/* 英文回答 */}
          <div className="frosted-glass rounded-2xl rounded-tl-md px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1">English</p>
                <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">{turn.aiResponse.english}</p>
              </div>
            </div>
          </div>

          {/* 中文翻译 */}
          <div className="frosted-glass rounded-2xl px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">中文翻译</p>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{turn.aiResponse.chinese}</p>
              </div>
            </div>
          </div>

          {/* 纠正建议 */}
          {turn.aiResponse.correction && (
            <div className="frosted-glass rounded-2xl px-4 py-3 border-l-2 border-orange-400">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-orange-500 mb-1">AI Tip</p>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{turn.aiResponse.correction}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}