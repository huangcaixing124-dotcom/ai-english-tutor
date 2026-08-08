import { NextRequest, NextResponse } from 'next/server';
import { getAIResponse } from '@/lib/ai';
import { type ScenarioId, type DifficultyId } from '@/lib/scenarios';

/**
 * 语音对话 API（语音进 → 语音出）
 * STT + Chat + TTS 一次完成，返回 JSON 包含音频 URL 和文本
 */
const STT_SERVER = 'http://127.0.0.1:9090';
const TTS_SERVER = 'http://127.0.0.1:9091';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const scenario = (formData.get('scenario') as ScenarioId) || 'free';
    const difficulty = (formData.get('difficulty') as DifficultyId) || 'intermediate';

    // 解析历史记录
    let history: { role: 'user' | 'assistant'; content: string }[] | undefined;
    const historyRaw = formData.get('history');
    if (historyRaw && typeof historyRaw === 'string') {
      try { history = JSON.parse(historyRaw); } catch { /* ignore */ }
    }

    if (!audioFile) {
      return NextResponse.json({ error: 'Missing audio' }, { status: 400 });
    }

    // 1. STT
    const audioBuffer = await audioFile.arrayBuffer();
    const sttRes = await fetch(STT_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: audioBuffer,
    });
    const sttData = await sttRes.json();
    const userText = sttData.text || '';

    if (!userText.trim()) {
      return NextResponse.json({ error: 'No speech detected', audio: null }, { status: 200 });
    }

    // 2. Chat（带历史记录）
    const aiResponse = await getAIResponse(userText, scenario, difficulty, history);

    // 3. TTS
    const ttsRes = await fetch(TTS_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: aiResponse.english }),
    });
    const aiAudio = Buffer.from(await ttsRes.arrayBuffer());

    // 4. 保存音频到临时文件并返回 base64
    const audioBase64 = aiAudio.toString('base64');

    return NextResponse.json({
      audio: audioBase64,
      userText,
      aiEnglish: aiResponse.english,
      aiChinese: aiResponse.chinese,
      aiCorrection: aiResponse.correction || '',
    });
  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}