// ═══════════════════════════════════════
// 项目配置
// ═══════════════════════════════════════

// 根据不同的 .env 配置，可以切换端口和数据库
// 当前项目使用端口: 3001 (可根据需要修改)

export const config = {
  // 项目名称 - 用于 MongoDB 数据库名、子域名等
  projectName: 'ai-english-tutor',

  // 服务端口
  port: parseInt(process.env.PORT || '3001', 10),

  // AI 模型配置
  ai: {
    // 默认使用环境变量中的 API Key
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 800,
  },

  // 语音配置
  voice: {
    // TTS 语速 (0.1 - 10)
    rate: 1.0,
    // TTS 音调 (0 - 2)
    pitch: 1.0,
    // 首选语音
    preferredVoice: 'Samantha', // 美式英语女声
  },

  // MongoDB 配置（按多项目架构，使用独立数据库名）
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: 'ai_english_tutor', // 独立数据库名，不与其他项目冲突
  },
} as const;