'use client';

import Character from '@/components/Character';
import TalkButton from '@/components/TalkButton';
import ConversationPanel from '@/components/ConversationPanel';
import VoiceIndicator from '@/components/VoiceIndicator';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useConversation } from '@/hooks/useConversation';

export default function Home() {
  const speechRecognition = useSpeechRecognition();
  const conversation = useConversation(speechRecognition as any);

  const handleToggle = () => {
    if (conversation.conversationStatus === 'idle' || conversation.conversationStatus === 'speaking') {
      conversation.startConversation();
    } else if (conversation.conversationStatus === 'recording') {
      conversation.stopConversation();
    }
  };

  // 欢迎语数据
  const welcomeTurn = {
    id: 'welcome',
    userText: '',
    aiResponse: {
      english: "Hi there! I'm your AI English tutor. Ready to practice? Just tap the microphone button and start speaking!",
      chinese: '你好！我是你的 AI 英语口语教练。准备好练习了吗？点击麦克风按钮开始说话吧！',
      correction: null,
    },
    timestamp: Date.now(),
  };

  return (
    <main className="flex-1 flex flex-col items-center h-full px-4">
      {/* 顶部标题 */}
      <div className="text-center pt-6 pb-2">
        <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          AI English Tutor
        </h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Your personal speaking coach
        </p>
      </div>

      {/* 角色区域 */}
      <div className="flex flex-col items-center justify-center py-4">
        <Character state={conversation.characterState} />

        {/* 语音可视化 */}
        <div className="h-6 mt-2">
          <VoiceIndicator
            isActive={conversation.conversationStatus === 'recording'}
            type="recording"
          />
        </div>
      </div>

      {/* 对话展示 */}
      <div className="flex-1 w-full overflow-y-auto pb-2 scrollbar-none">
        <div className="space-y-3">
          {/* 初始欢迎语 */}
          {!conversation.currentTurn && !conversation.userTranscript && (
            <div className="slide-up max-w-md mx-auto">
              <div className="frosted-glass rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">English</p>
                    <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">{welcomeTurn.aiResponse.english}</p>
                  </div>
                </div>
              </div>
              <div className="frosted-glass rounded-2xl px-4 py-3 mt-2">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">中文翻译</p>
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{welcomeTurn.aiResponse.chinese}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 实时对话 */}
          <ConversationPanel
            turn={conversation.currentTurn}
            userTranscript={conversation.userTranscript}
            isRecording={conversation.conversationStatus === 'recording'}
          />
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="pt-2 pb-8 flex flex-col items-center gap-3">
        {(conversation.error || speechRecognition.error) && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs text-red-500 max-w-xs text-center">
            {conversation.error || speechRecognition.error}
          </div>
        )}

        <TalkButton
          status={conversation.conversationStatus}
          onToggle={handleToggle}
        />

        {!speechRecognition.isSupported && (
          <p className="text-xs text-gray-400 text-center max-w-xs">
            Speech recognition is not supported in this browser. Please use Chrome or Safari.
          </p>
        )}
      </div>
    </main>
  );
}