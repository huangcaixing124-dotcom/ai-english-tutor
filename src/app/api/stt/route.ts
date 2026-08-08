import { NextRequest, NextResponse } from 'next/server';

/**
 * 语音识别 API
 * 使用常驻 faster-whisper 服务（模型内存常驻，无需重复加载）
 */
const STT_SERVER = 'http://127.0.0.1:9090';

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

    // 直接发送音频数据到常驻 STT 服务
    const buffer = await audioFile.arrayBuffer();
    const response = await fetch(STT_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: buffer,
    });

    const result = await response.json();
    return NextResponse.json({
      text: result.text || '',
      language: result.language || '',
    });
  } catch (error) {
    console.error('STT API error:', error);
    return NextResponse.json(
      { text: '' },
      { status: 200 }
    );
  }
}