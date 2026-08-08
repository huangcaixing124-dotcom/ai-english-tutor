#!/usr/bin/env python3
"""
常驻 STT 服务
- Whisper 模型常驻内存，避免每次请求重新加载
- 监听本地端口 9090，接收音频返回文字
- 支持中英文自动识别（可限制语言，避免误识别成韩语/阿拉伯语等）
"""
import json
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from tempfile import NamedTemporaryFile
from faster_whisper import WhisperModel

# 全局加载模型（只加载一次）
print('[STT Server] Loading Whisper model...', flush=True)
model = WhisperModel('base', device='cpu', compute_type='int8')
print('[STT Server] Model loaded. Ready on port 9090', flush=True)

# 允许识别的语言（中英文），其他语言一律回退到英文
ALLOWED_LANGUAGES = {'en', 'zh'}


class STTHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        audio_data = self.rfile.read(content_length)

        # 保存到临时文件
        with NamedTemporaryFile(delete=False, suffix='.wav') as f:
            f.write(audio_data)
            temp_path = f.name

        try:
            # 第一次：自动检测语言
            segments, info = model.transcribe(
                temp_path,
                beam_size=5,
                vad_filter=True,
            )
            text = ' '.join(seg.text.strip() for seg in segments).strip()
            language = info.language

            # 如果检测到非中英文（如韩语、阿拉伯语），强制用英文重新识别
            if language not in ALLOWED_LANGUAGES:
                segments, info = model.transcribe(
                    temp_path,
                    beam_size=5,
                    vad_filter=True,
                    language='en',
                )
                text = ' '.join(seg.text.strip() for seg in segments).strip()
                language = info.language

            result = {
                'text': text,
                'language': language,
                'time_ms': 0,
            }
        except Exception as e:
            result = {'text': '', 'error': str(e)}
        finally:
            os.unlink(temp_path)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        pass  # 减少日志输出


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 9090), STTHandler)
    server.serve_forever()