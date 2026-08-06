'use client';

import { useEffect, useState } from 'react';
import type { CharacterState } from '@/lib/types';

interface CharacterProps {
  state: CharacterState;
}

/**
 * SVG 动画角色
 * 一个可爱的 AI 助教形象，具有 6 种表情状态
 * Apple 风格 — 简洁、圆润、流畅的动画
 */
export default function Character({ state }: CharacterProps) {
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [mouthScale, setMouthScale] = useState(1);
  const [blink, setBlink] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);

  // 眨眼动画（随机间隔）
  useEffect(() => {
    if (state === 'idle' || state === 'listening') {
      const interval = setInterval(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }, 2500 + Math.random() * 2000);
      return () => clearInterval(interval);
    }
  }, [state]);

  // 角色说话时嘴部动画
  useEffect(() => {
    if (state === 'speaking') {
      const interval = setInterval(() => {
        setMouthScale(0.3 + Math.random() * 0.7);
      }, 100 + Math.random() * 150);
      return () => {
        clearInterval(interval);
        setMouthScale(1);
      };
    } else {
      setMouthScale(1);
    }
  }, [state]);

  // 思考时眼睛移动
  useEffect(() => {
    if (state === 'thinking') {
      const interval = setInterval(() => {
        setEyeOffset({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 3 - 1,
        });
      }, 600);
      return () => {
        clearInterval(interval);
        setEyeOffset({ x: 0, y: 0 });
      };
    } else {
      setEyeOffset({ x: 0, y: 0 });
    }
  }, [state]);

  // 开心时闪烁星星
  useEffect(() => {
    if (state === 'happy') {
      setShowSparkle(true);
      const interval = setInterval(() => {
        setShowSparkle((prev) => !prev);
      }, 800);
      return () => {
        clearInterval(interval);
        setShowSparkle(false);
      };
    }
  }, [state]);

  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';
  const isCorrecting = state === 'correcting';
  const isHappy = state === 'happy';
  const isIdle = state === 'idle';

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      {/* 发光背景 */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isListening
            ? 'bg-blue-100 dark:bg-blue-900/30 scale-110'
            : isSpeaking
            ? 'bg-green-100 dark:bg-green-900/30 scale-110'
            : isCorrecting
            ? 'bg-orange-100 dark:bg-orange-900/30 scale-105'
            : isHappy
            ? 'bg-yellow-100 dark:bg-yellow-900/30 scale-110'
            : 'bg-gray-100 dark:bg-gray-800/50'
        }`}
        style={{
          animation: isListening || isSpeaking || isHappy ? 'pulse-glow 2s ease-in-out infinite' : undefined,
        }}
      />

      {/* SVG 角色 */}
      <svg
        viewBox="0 0 200 200"
        className="relative w-40 h-40 z-10"
        style={{
          animation: isIdle || isListening ? 'float 3s ease-in-out infinite' : isHappy ? 'bounce-gentle 0.6s ease-in-out infinite' : undefined,
        }}
      >
        {/* 身体 */}
        <ellipse cx="100" cy="155" rx="45" ry="30" fill="#e8e8ed" className="dark:fill-[#3a3a3c]" />

        {/* 头部 */}
        <circle cx="100" cy="85" r="50" fill="#f2f2f7" className="dark:fill-[#2c2c2e] dark:stroke-[#3a3a3c]" stroke="#e5e5ea" strokeWidth="1" />

        {/* 耳朵 */}
        <g
          style={{
            animation: isListening ? 'wave 1.5s ease-in-out infinite' : undefined,
            transformOrigin: '60px 75px',
          }}
        >
          <ellipse cx="58" cy="75" rx="8" ry="12" fill="#f2f2f7" className="dark:fill-[#2c2c2e] dark:stroke-[#3a3a3c]" stroke="#e5e5ea" strokeWidth="1" />
        </g>
        <g
          style={{
            animation: isListening ? 'wave 1.5s ease-in-out infinite 0.2s' : undefined,
            transformOrigin: '140px 75px',
          }}
        >
          <ellipse cx="142" cy="75" rx="8" ry="12" fill="#f2f2f7" className="dark:fill-[#2c2c2e] dark:stroke-[#3a3a3c]" stroke="#e5e5ea" strokeWidth="1" />
        </g>

        {/* 眼睛 */}
        <g
          style={{
            transition: 'transform 0.3s ease-out',
          }}
        >
          {/* 左眼 */}
          <g transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`}>
            <ellipse cx="82" cy="80" rx="9" ry="10" fill="white" stroke="#c7c7cc" strokeWidth="1" />
            <circle
              cx="82"
              cy="81"
              r="5"
              fill="#1c1c1e"
              className="dark:fill-white"
              style={{
                transform: blink ? 'scaleY(0.1)' : 'scaleY(1)',
                transformOrigin: '82px 81px',
                transition: 'transform 0.1s',
              }}
            />
            {/* 高光 */}
            <circle cx="84" cy="79" r="2" fill="white" opacity="0.8" />
          </g>

          {/* 右眼 */}
          <g transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`}>
            <ellipse cx="118" cy="80" rx="9" ry="10" fill="white" stroke="#c7c7cc" strokeWidth="1" />
            <circle
              cx="118"
              cy="81"
              r="5"
              fill="#1c1c1e"
              className="dark:fill-white"
              style={{
                transform: blink ? 'scaleY(0.1)' : 'scaleY(1)',
                transformOrigin: '118px 81px',
                transition: 'transform 0.1s',
              }}
            />
            <circle cx="120" cy="79" r="2" fill="white" opacity="0.8" />
          </g>
        </g>

        {/* 眉毛 */}
        <g
          style={{
            transition: 'transform 0.3s ease-out',
          }}
        >
          <line
            x1="73" y1={isThinking ? 64 : 66}
            x2="90" y2={isThinking ? 66 : 66}
            stroke="#8e8e93"
            strokeWidth="2"
            strokeLinecap="round"
            className={isCorrecting ? 'dark:stroke-[#ff9500]' : ''}
            style={{
              transform: isCorrecting ? 'rotate(-5deg)' : 'none',
              transformOrigin: '73px 66px',
              transition: 'all 0.3s',
            }}
          />
          <line
            x1="110" y1={isThinking ? 66 : 66}
            x2="127" y2={isThinking ? 64 : 66}
            stroke="#8e8e93"
            strokeWidth="2"
            strokeLinecap="round"
            className={isCorrecting ? 'dark:stroke-[#ff9500]' : ''}
            style={{
              transform: isCorrecting ? 'rotate(5deg)' : 'none',
              transformOrigin: '127px 66px',
              transition: 'all 0.3s',
            }}
          />
        </g>

        {/* 腮红（开心/害羞时） */}
        {(isHappy || isCorrecting) && (
          <g opacity="0.4">
            <ellipse cx="72" cy="95" rx="8" ry="4" fill="#ff3b30" />
            <ellipse cx="128" cy="95" rx="8" ry="4" fill="#ff3b30" />
          </g>
        )}

        {/* 嘴巴 */}
        <g transform={`translate(100, ${isHappy ? 100 : isSpeaking ? 98 : 100})`}>
          {isHappy ? (
            // 开心微笑
            <path d="M-8,0 Q0,12 8,0" fill="none" stroke="#1c1c1e" className="dark:stroke-white" strokeWidth="2.5" strokeLinecap="round" />
          ) : isSpeaking ? (
            // 说话 - 动态椭圆
            <ellipse cx="0" cy="0" rx="7" ry={4 * mouthScale} fill="#1c1c1e" className="dark:fill-white" />
          ) : isCorrecting ? (
            // 纠正 - 微张嘴
            <ellipse cx="0" cy="0" rx="5" ry="3" fill="#1c1c1e" className="dark:fill-white" />
          ) : isThinking ? (
            // 思考 - 张嘴
            <ellipse cx="0" cy="0" rx="4" ry="2" fill="#1c1c1e" className="dark:fill-white" />
          ) : (
            // 自然微笑
            <path d="M-6,0 Q0,6 6,0" fill="none" stroke="#1c1c1e" className="dark:stroke-white" strokeWidth="2" strokeLinecap="round" />
          )}
        </g>

        {/* 星星（开心时） */}
        {showSparkle && isHappy && (
          <g>
            <text x="45" y="55" fontSize="16" fill="#ffcc00" style={{ animation: 'fade-in 0.3s ease-out' }}>
              ✦
            </text>
            <text x="145" y="50" fontSize="12" fill="#ffcc00" style={{ animation: 'fade-in 0.3s ease-out 0.15s' }}>
              ✦
            </text>
          </g>
        )}

        {/* 思考气泡（思考时） */}
        {isThinking && (
          <g opacity="0.5">
            <circle cx="145" cy="60" r="4" fill="#8e8e93" />
            <circle cx="155" cy="50" r="3" fill="#8e8e93" />
            <circle cx="163" cy="38" r="6" fill="#8e8e93" />
          </g>
        )}

        {/* 手臂 */}
        {isCorrecting && (
          <g>
            <path d="M60,140 Q50,130 45,125" fill="none" stroke="#8e8e93" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M140,140 Q150,130 155,125" fill="none" stroke="#8e8e93" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>

      {/* 状态提示文字 */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
        <span
          className={`text-xs font-medium transition-all duration-300 ${
            isListening
              ? 'text-blue-500'
              : isSpeaking
              ? 'text-green-500'
              : isThinking
              ? 'text-orange-500'
              : isHappy
              ? 'text-yellow-500'
              : isCorrecting
              ? 'text-purple-500'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isThinking ? 'Thinking...' : isCorrecting ? 'Tip for you' : isHappy ? 'Great!' : ''}
        </span>
      </div>
    </div>
  );
}