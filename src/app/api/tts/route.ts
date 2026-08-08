import { NextRequest, NextResponse } from 'next/server';

/**
 * 语音合成 API
 * 使用常驻 Edge TTS 服务 + 内存缓存
 *
 * 支持：
 *   POST /api/tts  —  JSON body: { text: "..." }
 *   GET  /api/tts?text=...  —  查询参数（用于 wx.downloadFile）
 *
 * 优化：缓存命中直接返回（0.01s），未命中调用常驻 TTS 服务
 */
const TTS_SERVER = 'http://127.0.0.1:9091';
const ttsCache = new Map<string, Buffer>();
const MAX_CACHE = 200;

export async function GET(request: NextRequest) {
  return handleTTS(request.nextUrl.searchParams.get('text') || '');
}

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  return handleTTS(text);
}

async function handleTTS(text: string) {
  try {
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }
    if (text.length > 1000) {
      return NextResponse.json({ error: 'Text too long' }, { status: 400 });
    }

    // 1. 检查缓存
    const cacheKey = text.trim();
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      return new NextResponse(new Uint8Array(cached), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cached.byteLength.toString(),
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT',
        },
      });
    }

    // 2. 调用常驻 TTS 服务
    const response = await fetch(TTS_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`TTS server error: ${response.status}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // 3. 存入缓存
    if (ttsCache.size >= MAX_CACHE) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, audioBuffer);

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}