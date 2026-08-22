import { NextRequest } from 'next/server';
import { streamAIResponse } from '@/lib/ai';
import { type ScenarioId, type DifficultyId } from '@/lib/scenarios';

/**
 * WebSocket 语音对话端点
 * 流式流水线：ASR → AI(流式) → TTS(流式)
 *
 * 协议：
 *   Client → Server: 二进制帧（PCM 音频数据）
 *   Client → Server: 文本帧 JSON { type: "config", scenario, difficulty, history }
 *   Client → Server: 文本帧 JSON { type: "end" }
 *   Server → Client: 文本帧 JSON { type: "stt", text: "..." }
 *   Server → Client: 文本帧 JSON { type: "ai_chunk", text: "..." }
 *   Server → Client: 文本帧 JSON { type: "ai_done", english, chinese, correction }
 *   Server → Client: 二进制帧（MP3 音频块）
 *   Server → Client: 文本帧 JSON { type: "tts_done" }
 *   Server → Client: 文本帧 JSON { type: "error", message: "..." }
 */

const STT_SERVER = 'http://127.0.0.1:9090';
const TTS_SERVER = 'http://127.0.0.1:9091';

export async function GET(request: NextRequest) {
  // 检查是否 WebSocket 升级请求
  const upgrade = request.headers.get('upgrade')?.toLowerCase();
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  // @ts-ignore - Next.js WebSocket 支持
  const { socket } = request.env as any;
  if (!socket) {
    return new Response('WebSocket not supported', { status: 500 });
  }

  const ws = socket as WebSocket;
  console.log('[WS] Client connected');

  // 状态
  let scenario: ScenarioId = 'free';
  let difficulty: DifficultyId = 'intermediate';
  let history: { role: 'user' | 'assistant'; content: string }[] = [];
  let audioChunks: Uint8Array[] = [];
  let configReceived = false;
  let processing = false;

  // 发送 JSON 消息
  const send = (data: any) => {
    try {
      ws.send(JSON.stringify(data));
    } catch (e) {
      console.error('[WS] send error:', e);
    }
  };

  // 发送二进制音频
  const sendAudio = (buffer: ArrayBufferLike) => {
    try {
      ws.send(buffer);
    } catch (e) {
      console.error('[WS] send audio error:', e);
    }
  };

  // 处理一帧音频
  const processFrame = (frame: Uint8Array) => {
    if (!configReceived) {
      audioChunks.push(frame);
      return;
    }
    audioChunks.push(frame);
  };

  // 处理一段完整语音
  const processUtterance = async () => {
    if (processing || audioChunks.length === 0) return;
    processing = true;

    try {
      // 拼接 PCM 帧 → 发送给 STT
      const totalLen = audioChunks.reduce((acc, c) => acc + c.length, 0);
      const pcmData = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of audioChunks) {
        pcmData.set(chunk, offset);
        offset += chunk.length;
      }
      audioChunks = [];

      console.log(`[WS] STT: sending ${pcmData.length} bytes`);

      // 1. STT
      const sttRes = await fetch(STT_SERVER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: pcmData.buffer,
      });
      const sttData = await sttRes.json();
      const userText = sttData.text || '';

      if (!userText.trim()) {
        send({ type: 'stt', text: '' });
        processing = false;
        return;
      }

      send({ type: 'stt', text: userText });

      // 2. AI（流式）
      let fullEnglish = '';
      let fullChinese = '';
      let fullCorrection: string | null = null;

      await streamAIResponse(
        userText,
        (chunk) => {
          send({ type: 'ai_chunk', text: chunk });
        },
        scenario,
        difficulty,
        history
      ).then((result) => {
        fullEnglish = result.english;
        fullChinese = result.chinese;
        fullCorrection = result.correction;
      });

      // 更新历史记录
      history.push({ role: 'user', content: userText });
      history.push({ role: 'assistant', content: fullEnglish });
      if (history.length > 20) {
        history = history.slice(-20);
      }

      send({ type: 'ai_done', english: fullEnglish, chinese: fullChinese, correction: fullCorrection });

      // 3. TTS
      const ttsRes = await fetch(TTS_SERVER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullEnglish }),
      });

      if (ttsRes.ok) {
        const audioBuffer = await ttsRes.arrayBuffer();
        sendAudio(audioBuffer);
        send({ type: 'tts_done' });
      } else {
        send({ type: 'error', message: 'TTS failed' });
      }
    } catch (e: any) {
      console.error('[WS] process error:', e);
      send({ type: 'error', message: e.message || 'Processing error' });
    }

    processing = false;
  };

  // 消息处理
  ws.onmessage = async (event: MessageEvent) => {
    try {
      if (event.data instanceof ArrayBuffer || event.data instanceof Uint8Array) {
        // 二进制帧：PCM 音频数据
        const frame = new Uint8Array(event.data);
        processFrame(frame);
      } else {
        // 文本帧：JSON 消息
        const msg = JSON.parse(event.data as string);

        switch (msg.type) {
          case 'config':
            scenario = msg.scenario || 'free';
            difficulty = msg.difficulty || 'intermediate';
            if (msg.history) history = msg.history;
            configReceived = true;
            send({ type: 'config_ack' });
            break;

          case 'end':
            // 用户说完，开始处理
            await processUtterance();
            break;

          case 'ping':
            send({ type: 'pong' });
            break;
        }
      }
    } catch (e: any) {
      console.error('[WS] message error:', e);
    }
  };

  ws.onclose = () => {
    console.log('[WS] Client disconnected');
    audioChunks = [];
  };

  ws.onerror = (e: Event) => {
    console.error('[WS] Error:', e);
  };

  return new Response(null, { status: 101 });
}