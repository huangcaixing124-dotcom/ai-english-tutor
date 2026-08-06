import { NextRequest, NextResponse } from 'next/server';

/**
 * 语音合成 API
 * 接收文字，返回 MP3 音频
 * 使用 Google Translate TTS 作为免费 TTS 引擎
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text field' },
        { status: 400 }
      );
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { error: 'Text too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // 使用 Google Translate TTS（免费，美式英语发音）
    const encodedText = encodeURIComponent(text);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodedText}&tl=en&total=1&idx=0`;

    const response = await fetch(ttsUrl);

    if (!response.ok) {
      console.error('TTS source error:', response.status);
      return NextResponse.json(
        { error: 'TTS source unavailable' },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}