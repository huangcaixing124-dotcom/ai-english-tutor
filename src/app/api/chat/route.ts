import { NextRequest, NextResponse } from 'next/server';
import { getAIResponse } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const { text, scenario, difficulty, history } = await request.json();

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

    const result = await getAIResponse(text, scenario, difficulty, history);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        english: "Sorry, I had trouble processing that. Could you try again?",
        chinese: '抱歉，处理时遇到问题。请再试一次？',
        correction: null,
      },
      { status: 200 } // 返回 200 但内容为降级响应
    );
  }
}