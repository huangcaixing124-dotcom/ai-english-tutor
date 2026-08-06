import { NextRequest, NextResponse } from 'next/server';

/**
 * 单词查询 API
 * 获取单词的音标、词性、英文释义、中文翻译
 */
export async function POST(request: NextRequest) {
  try {
    const { word } = await request.json();

    if (!word || typeof word !== 'string') {
      return NextResponse.json({ error: 'Missing word' }, { status: 400 });
    }

    const cleanWord = word.toLowerCase().replace(/[^a-z-]/g, '');
    if (!cleanWord || cleanWord.length > 30) {
      return NextResponse.json({ error: 'Invalid word' }, { status: 400 });
    }

    // 1. 获取英文词典信息（音标、词性、释义）
    let phonetic = '';
    let meanings: { partOfSpeech: string; definition: string; example: string }[] = [];

    try {
      const dictRes = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`
      );
      if (dictRes.ok) {
        const dictData = await dictRes.json();
        const entry = dictData[0];
        phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || '';

        for (const meaning of entry.meanings || []) {
          for (const def of meaning.definitions || []) {
            if (meanings.length < 3) {
              meanings.push({
                partOfSpeech: meaning.partOfSpeech,
                definition: def.definition,
                example: def.example || '',
              });
            }
          }
        }
      }
    } catch {
      // 词典 API 失败不影响
    }

    // 2. Google Translate 获取中文翻译
    let chinese = '';
    try {
      const transRes = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(cleanWord)}`
      );
      if (transRes.ok) {
        const transData = await transRes.json();
        chinese = transData?.[0]?.[0]?.[0] || '';
      }
    } catch {
      // 翻译失败不影响
    }

    return NextResponse.json({
      word: cleanWord,
      phonetic,
      chinese,
      meanings,
    });
  } catch (error) {
    console.error('Word API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}