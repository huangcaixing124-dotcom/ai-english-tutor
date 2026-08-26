/**
 * WebSocket 语音对话服务（独立进程）
 * 在端口 3050 运行，通过 Caddy 反向代理到 api-backup.hcxserver.xyz
 *
 * 流式流水线：ASR → AI(流式) → TTS
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

const WebSocket = require('ws');
const http = require('http');

const WS_PORT = 3050;
const STT_SERVER = 'http://127.0.0.1:9090';
const TTS_SERVER = 'http://127.0.0.1:9091';

// SenseNova 配置
const AI_API_KEY = process.env.AI_API_KEY || 'sk-tyrqYatLWaR9oUtpUBXfiIQcR8xpyudE';
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://token.sensenova.cn/v1';
const AI_MODEL = process.env.AI_MODEL || 'glm-5.2';
const AI_FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || 'deepseek-v4-flash';

// 模型轮换计数器
let requestIndex = 0;

/**
 * 流式调用 AI
 */
async function streamAI(userText, scenario, difficulty, history, onChunk) {
  const models = [AI_MODEL, AI_FALLBACK_MODEL].filter(Boolean);
  requestIndex++;
  const startIndex = requestIndex % models.length;

  const systemPrompt = buildSystemPrompt(scenario, difficulty);

  const messages = [{ role: 'system', content: systemPrompt }];
  if (history && history.length > 0) {
    const recent = history.slice(-10);
    for (const msg of recent) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: `[User said]: ${userText}` });

  let lastError = null;

  for (let i = 0; i < models.length; i++) {
    const modelIndex = (startIndex + i) % models.length;
    const currentModel = models[modelIndex];
    if (!currentModel) continue;

    try {
      const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: currentModel,
          messages,
          temperature: 0.7,
          max_tokens: 500,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          lastError = new Error(`Rate limited on ${currentModel}`);
          continue;
        }
        const error = await response.text();
        throw new Error(`AI API error (${currentModel}): ${response.status} ${error}`);
      }

      const reader = response.body.getReader();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const chunk = JSON.parse(data);
            const content = chunk.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch { }
        }
      }

      // 解析 JSON 回复
      const jsonMatch = fullContent.match(/```(?:json)?\s*([\s\S]*?)```/) ||
        fullContent.match(/\{[\s\S]*"english"[\s\S]*"chinese"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (parsed.english && parsed.chinese) return parsed;
        } catch { }
      }

      return {
        english: fullContent,
        chinese: '（翻译处理中...）',
        correction: null,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[WS AI] ${currentModel} failed:`, err.message);
    }
  }

  throw lastError || new Error('All models failed');
}

function buildSystemPrompt(scenario, difficulty) {
  const SCENARIOS = {
    free: { label: 'Free Talk', prompt: 'You are having a casual conversation. Keep it natural and friendly.' },
    restaurant: { label: 'Restaurant', prompt: 'You are a waiter in a restaurant. Help the user order food.' },
    interview: { label: 'Interview', prompt: 'You are a hiring manager conducting a job interview.' },
    travel: { label: 'Travel', prompt: 'You are a travel assistant helping with travel plans.' },
    shopping: { label: 'Shopping', prompt: 'You are a shop assistant helping a customer.' },
    hotel: { label: 'Hotel', prompt: 'You are a hotel receptionist helping a guest.' },
  };

  const DIFFICULTIES = {
    beginner: { label: 'Beginner', prompt: 'Use simple vocabulary and short sentences. Speak slowly and clearly.' },
    intermediate: { label: 'Intermediate', prompt: 'Use natural conversational English at a moderate pace.' },
    advanced: { label: 'Advanced', prompt: 'Use sophisticated vocabulary and complex sentence structures.' },
  };

  const sc = SCENARIOS[scenario] || SCENARIOS.free;
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.intermediate;

  return `You are a friendly and encouraging AI English speaking tutor.

## Current Scenario: ${sc.label}
${sc.prompt}

## Difficulty Level: ${diff.label}
${diff.prompt}

## Core Rules:
1. Respond in natural, conversational English (2-4 sentences)
2. After each English response, provide a Chinese translation
3. Gently correct grammar or pronunciation mistakes
4. Be encouraging and supportive
5. Adapt to the user's level

## CRITICAL: Response Format
You MUST respond with valid JSON only. No markdown, no code blocks, no other text.
{"english": "Your English response...", "chinese": "中文翻译...", "correction": "Grammar tip or null"}

## Correction Guidelines:
- Be gentle: "Great try! Instead of 'I go', try 'I went' for past tense."
- Focus on 1-2 corrections per response
- If correct, set correction to null`;
}

// 创建 HTTP 服务器（用于健康检查）
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');

  let scenario = 'free';
  let difficulty = 'intermediate';
  let history = [];
  let audioChunks = [];
  let configReceived = false;
  let processing = false;

  const send = (data) => {
    try { ws.send(JSON.stringify(data)); } catch (e) { }
  };
  const sendAudio = (buffer) => {
    try { ws.send(buffer); } catch (e) { }
  };

  const processUtterance = async () => {
    if (processing) return;
    processing = true;

    try {
      const totalLen = audioChunks.reduce((a, c) => a + c.length, 0);
      console.log(`[WS] STT: ${totalLen} bytes, ${audioChunks.length} chunks`);

      if (totalLen === 0) {
        console.log('[WS] No audio data, skipping');
        send({ type: 'stt', text: '' });
        processing = false;
        return;
      }

      const pcmData = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of audioChunks) {
        pcmData.set(chunk, offset);
        offset += chunk.length;
      }
      audioChunks = [];

      // 拼接 WAV 头（STT 服务需要 WAV 文件）
      const sampleRate = 16000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
      const blockAlign = (numChannels * bitsPerSample) / 8;
      const dataSize = totalLen;
      const wavHeader = Buffer.alloc(44);
      wavHeader.write('RIFF', 0);
      wavHeader.writeUInt32LE(36 + dataSize, 4);
      wavHeader.write('WAVE', 8);
      wavHeader.write('fmt ', 12);
      wavHeader.writeUInt32LE(16, 16);        // 子块大小
      wavHeader.writeUInt16LE(1, 20);          // PCM
      wavHeader.writeUInt16LE(numChannels, 22);
      wavHeader.writeUInt32LE(sampleRate, 24);
      wavHeader.writeUInt32LE(byteRate, 28);
      wavHeader.writeUInt16LE(blockAlign, 32);
      wavHeader.writeUInt16LE(bitsPerSample, 34);
      wavHeader.write('data', 36);
      wavHeader.writeUInt32LE(dataSize, 40);
      const wavData = Buffer.concat([wavHeader, Buffer.from(pcmData)]);

      // 1. STT
      const sttRes = await fetch(STT_SERVER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: wavData,
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
      let fullCorrection = null;

      const result = await streamAI(
        userText, scenario, difficulty, history,
        (chunk) => send({ type: 'ai_chunk', text: chunk })
      );

      fullEnglish = result.english;
      fullChinese = result.chinese;
      fullCorrection = result.correction;

      history.push({ role: 'user', content: userText });
      history.push({ role: 'assistant', content: fullEnglish });
      if (history.length > 20) history = history.slice(-20);

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
    } catch (e) {
      console.error('[WS] process error:', e);
      send({ type: 'error', message: e.message || 'Processing error' });
    }

    processing = false;
  };

  ws.on('message', (data, isBinary) => {
    try {
      // 微信小程序发送二进制帧时 isBinary=true，文本帧时 isBinary=false
      // 不能依赖 Buffer.isBuffer(data) 判断，ws 8.x 中 Buffer 对字符串也返回 true
      if (isBinary) {
        const frame = new Uint8Array(data);
        audioChunks.push(frame);
      } else {
        const msg = JSON.parse(data.toString());
        switch (msg.type) {
          case 'config':
            scenario = msg.scenario || 'free';
            difficulty = msg.difficulty || 'intermediate';
            if (msg.history) history = msg.history;
            configReceived = true;
            send({ type: 'config_ack' });
            break;
          case 'end':
            processUtterance();
            break;
          case 'ping':
            send({ type: 'pong' });
            break;
        }
      }
    } catch (e) {
      console.error('[WS] message error:', e);
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    audioChunks = [];
  });

  ws.on('error', (e) => {
    console.error('[WS] Error:', e);
  });
});

server.listen(WS_PORT, () => {
  console.log(`[WS] WebSocket server running on port ${WS_PORT}`);
});