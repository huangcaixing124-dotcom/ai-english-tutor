import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/config';

/**
 * 语音识别 API
 * 接收音频文件，使用 Whisper API 转写文字
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Missing audio file' },
        { status: 400 }
      );
    }

    // 调用 OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'en');

    const response = await fetch(`${config.ai.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ai.apiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Whisper API error:', response.status, error);
      return NextResponse.json(
        { text: '' },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (error) {
    console.error('STT API error:', error);
    return NextResponse.json(
      { text: '' },
      { status: 200 }
    );
  }
}