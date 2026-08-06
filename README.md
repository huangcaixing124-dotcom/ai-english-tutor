# AI English Tutor

AI 口语训练小程序 — 通过语音对话练习英语口语，AI 以英文回答，提供中文翻译和语法纠正。

## 项目概览

一个单页面的 AI 口语教练应用，包含：
- **动画角色** — 可爱的 SVG 角色，6 种表情状态（idle、listening、thinking、speaking、correcting、happy）
- **语音对话** — 点击按钮说话，AI 自动回复
- **三段式展示** — 英文回答、中文翻译、语法纠正
- **Apple 设计风格** — 极简、毛玻璃、圆润动画

## 技术栈

| 层 | 技术 |
|------|----------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS v4 |
| 动画 | SVG + CSS Keyframes |
| 语音识别 | Web Speech API (浏览器原生) |
| 语音合成 | Web Speech API (浏览器原生) |
| AI 对话 | OpenAI API (或其他兼容 API) |
| 数据库 | MongoDB (独立数据库: ai_english_tutor) |

## 多项目架构配置

本项目遵循多项目隔离原则：

| 维度 | 配置 |
|------|---------|
| 端口 | 3001（与其他项目不同） |
| 域名 | ai-english-tutor.你的域名（Cloudflare 子域名） |
| 数据库 | ai_english_tutor（MongoDB 独立数据库名） |

### 本地部署步骤

```bash
# 1. 安装依赖
cd ~/ai-english-tutor
npm install

# 2. 修改 .env 文件
# 编辑 .env 填入你的 AI API Key

# 3. 构建
npm run build

# 4. 启动（端口 3001）
npm start
# 或指定端口: PORT=3001 npm start
```

### Cloudflare Tunnel 配置

在 Cloudflare Tunnel 配置文件中添加一条转发规则：

```yaml
tunnel: your-tunnel-name
credentials-file: /path/to/credentials.json
ingress:
  # 已有项目保持不动，新增以下：
  - hostname: ai-english-tutor.你的域名.com
    service: http://localhost:3001
  # ... 其他已有项目
```

### MongoDB 配置

确保 MongoDB 已运行，本项目使用独立数据库 `ai_english_tutor`，不与其他项目冲突。

## 环境变量

复制 `.env` 文件并填写：

| 变量 | 说明 | 示例 |
|--------|-------|--------|
| PORT | 服务端口 | 3001 |
| AI_API_KEY | AI API 密钥 | sk-xxx |
| AI_BASE_URL | API 地址 | https://api.openai.com/v1 |
| AI_MODEL | 模型名 | gpt-4o-mini |
| MONGODB_URI | MongoDB 地址 | mongodb://localhost:27017 |

## 项目结构

```
ai-english-tutor/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 主页面（单页）
│   │   ├── globals.css         # Apple 设计 token + 动画
│   │   └── api/chat/route.ts   # AI 对话 API
│   ├── components/
│   │   ├── Character.tsx       # SVG 动画角色
│   │   ├── TalkButton.tsx      # 对话按钮
│   │   ├── ConversationPanel.tsx  # 对话气泡
│   │   └── VoiceIndicator.tsx  # 声波动画
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts  # 语音识别
│   │   └── useConversation.ts      # 对话管理
│   ├── lib/
│   │   ├── ai.ts               # AI 客户端
│   │   └── types.ts            # 类型定义
│   └── config.ts               # 项目配置
├── .env                         # 环境变量
└── package.json
```

## 开发

```bash
npm run dev
```

浏览器打开 `http://localhost:3001` 即可使用。

## 说明

- 语音识别需要**浏览器授权麦克风**权限
- 推荐使用 Chrome 或 Safari（iOS）
- 目前的 AI 对话 API 使用 `/api/chat` 路由，通过环境变量配置
- 如果 AI API Key 未配置，API 会返回错误降级响应