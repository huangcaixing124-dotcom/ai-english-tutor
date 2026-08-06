import { config } from '@/config';
import type { AIResponse } from '@/lib/types';
import { SCENARIOS, DIFFICULTIES } from '@/lib/scenarios';
import type { ScenarioId, DifficultyId } from '@/lib/scenarios';

/**
 * 构建动态系统提示词
 */
function buildSystemPrompt(scenario?: ScenarioId, difficulty?: DifficultyId): string {
  const scenarioConfig = scenario ? SCENARIOS[scenario] : null;
  const difficultyConfig = difficulty ? DIFFICULTIES[difficulty] : null;

  return `You are a friendly and encouraging AI English speaking tutor. Your role is to help users improve their spoken English through natural conversation.

## Input Rules:
- The user may speak in Chinese OR English — understand both
- If the user speaks Chinese, respond in English and gently encourage them to try English
- If the user speaks English, continue in English

${scenarioConfig ? `## Current Scenario: ${scenarioConfig.label} (${scenarioConfig.labelCn})
${scenarioConfig.prompt}` : ''}

${difficultyConfig ? `## Difficulty Level: ${difficultyConfig.label} (${difficultyConfig.labelCn})
${difficultyConfig.prompt}` : ''}

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

/**
 * 调用 AI API 获取对话响应
 * 支持传入对话历史以实现上下文记忆
 */
export async function getAIResponse(
  userText: string,
  scenario?: ScenarioId,
  difficulty?: DifficultyId,
  history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(scenario, difficulty);

  // 构建消息列表：system + 历史对话 + 当前消息
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  // 加入历史对话（最多最近 10 轮）
  if (history && history.length > 0) {
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // 当前用户消息
  messages.push({ role: 'user', content: `[User said]: ${userText}` });

  const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.ai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.ai.model,
      messages,
      temperature: config.ai.temperature,
      max_tokens: config.ai.maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned empty response');
  }

  // 从 markdown 代码块中提取 JSON
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*"english"[\s\S]*"chinese"[\s\S]*\}/);
  if (jsonMatch) {
    content = jsonMatch[1] || jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(content) as AIResponse;
    if (!parsed.english || !parsed.chinese) {
      throw new Error('Invalid AI response structure');
    }
    return parsed;
  } catch {
    return {
      english: content,
      chinese: '（翻译处理中...）',
      correction: null,
    };
  }
}

/**
 * 生成欢迎语（首次打开时使用）
 */
export function getWelcomeMessage(): AIResponse {
  return {
    english: "Hi there! I'm your AI English tutor. You can type in English or Chinese — I'll understand both and help you practice English. Ready to start?",
    chinese: '你好！我是你的 AI 英语口语教练。你可以用中文或英文输入，我都能理解，并用英语帮你练习。开始吧！',
    correction: null,
  };
}