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
 * 调用 AI API 获取对话响应（流式）
 * 支持双模型自动轮换和 SSE 流式输出
 */
export async function getAIResponse(
  userText: string,
  scenario?: ScenarioId,
  difficulty?: DifficultyId,
  history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(scenario, difficulty);

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (history && history.length > 0) {
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: `[User said]: ${userText}` });

  // 模型轮换：每次请求轮换主模型和备用模型
  const models = [config.ai.model, config.ai.fallbackModel].filter(Boolean) as string[];
  const g = globalThis as any;
  g.__aiRequestIndex = (g.__aiRequestIndex || 0) + 1;
  const startIndex = g.__aiRequestIndex % models.length;

  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const modelIndex = (startIndex + i) % models.length;
    const currentModel = models[modelIndex];
    if (!currentModel) continue;

    try {
      const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.apiKey}`,
        },
        body: JSON.stringify({
          model: currentModel,
          messages,
          temperature: config.ai.temperature,
          max_tokens: config.ai.maxTokens,
          stream: false, // 非流式，等完整回复
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          lastError = new Error(`Rate limited on ${currentModel}`);
          console.warn(`[Model Rotate] ${currentModel} rate limited, switching...`);
          continue;
        }
        const error = await response.text();
        throw new Error(`AI API error (${currentModel}): ${response.status} ${error}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content;

      if (!content) {
        lastError = new Error(`Empty response from ${currentModel}`);
        console.warn(`[Model Rotate] ${currentModel} empty content, switching...`);
        continue;
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
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Model Rotate] ${currentModel} failed:`, lastError.message);
    }
  }

  throw lastError || new Error('All models failed');
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

/**
 * 流式调用 AI API，逐 chunk 调用 onChunk 回调
 * 用于 WebSocket 流式对话场景，支持模型轮换
 */
export async function streamAIResponse(
  userText: string,
  onChunk: (text: string) => void,
  scenario?: ScenarioId,
  difficulty?: DifficultyId,
  history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(scenario, difficulty);

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (history && history.length > 0) {
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: `[User said]: ${userText}` });

  const models = [config.ai.model, config.ai.fallbackModel].filter(Boolean) as string[];
  const g = globalThis as any;
  g.__aiRequestIndex = (g.__aiRequestIndex || 0) + 1;
  const startIndex = g.__aiRequestIndex % models.length;

  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const modelIndex = (startIndex + i) % models.length;
    const currentModel = models[modelIndex];
    if (!currentModel) continue;

    try {
      const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.apiKey}`,
        },
        body: JSON.stringify({
          model: currentModel,
          messages,
          temperature: config.ai.temperature,
          max_tokens: config.ai.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          lastError = new Error(`Rate limited on ${currentModel}`);
          console.warn(`[Model Rotate] ${currentModel} rate limited, switching...`);
          continue;
        }
        const error = await response.text();
        throw new Error(`AI API error (${currentModel}): ${response.status} ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

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
          } catch {
            // 解析失败跳过
          }
        }
      }

      // 从完整内容中提取 JSON 回复
      const jsonMatch = fullContent.match(/```(?:json)?\s*([\s\S]*?)```/) || fullContent.match(/\{[\s\S]*"english"[\s\S]*"chinese"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]) as AIResponse;
          if (parsed.english && parsed.chinese) return parsed;
        } catch { /* ignore */ }
      }

      return {
        english: fullContent,
        chinese: '（翻译处理中...）',
        correction: null,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Model Rotate] ${currentModel} failed:`, lastError.message);
    }
  }

  throw lastError || new Error('All models failed');
}