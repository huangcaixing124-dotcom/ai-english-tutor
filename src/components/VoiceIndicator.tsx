'use client';

import { useEffect, useRef, useState } from 'react';

interface VoiceIndicatorProps {
  isActive: boolean;
  type: 'recording' | 'playing';
}

/**
 * 语音可视化指示器
 * 录音时显示声波动画，TTS 播放时显示音频波动
 */
export default function VoiceIndicator({ isActive, type }: VoiceIndicatorProps) {
  const [bars, setBars] = useState<number[]>(Array(5).fill(0.3));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setBars(Array.from({ length: 5 }, () => 0.3 + Math.random() * 0.7));
      }, 150);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setBars(Array(5).fill(0.3));
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  const color = type === 'recording' ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className={`flex items-center justify-center gap-[3px] h-8 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      {bars.map((height, i) => (
        <div
          key={i}
          className={`w-1 rounded-full ${color} transition-all duration-150`}
          style={{
            height: `${Math.max(4, height * 28)}px`,
            opacity: 0.4 + height * 0.6,
          }}
        />
      ))}
    </div>
  );
}