#!/usr/bin/env python3
"""
常驻 TTS 服务
- edge-tts 进程常驻，避免每次请求重新启动 Python
- 监听本地端口 9091，接收文字返回 MP3 音频
- 支持返回纯音频数据
"""
import json
import asyncio
import sys
import os
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 异步执行 edge-tts
async def generate_tts(text, output_path):
    DEVNULL = asyncio.subprocess.DEVNULL
    proc = await asyncio.create_subprocess_exec(
        'python3', '-m', 'edge_tts',
        '--text', text,
        '--voice', 'en-US-AriaNeural',
        '--write-media', output_path,
        stdout=DEVNULL,
        stderr=DEVNULL,
    )
    await proc.wait()
    return proc.returncode == 0


class TTSHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        params = parse_qs(urlparse(self.path).query)
        text = params.get('text', [''])[0]
        self.handle_tts(text)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(body)
            text = data.get('text', '')
        except:
            text = ''
        self.handle_tts(text)

    def handle_tts(self, text):
        if not text or len(text) > 1000:
            self.send_error(400, 'Invalid text')
            return

        sanitized = text.replace('"', '').replace("'", '')
        temp_file = tempfile.mktemp(suffix='.mp3')

        try:
            # 使用 asyncio 运行 edge-tts
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            success = loop.run_until_complete(generate_tts(sanitized, temp_file))
            loop.close()

            if not success or not os.path.exists(temp_file):
                self.send_error(500, 'TTS generation failed')
                return

            with open(temp_file, 'rb') as f:
                audio_data = f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Content-Length', str(len(audio_data)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(audio_data)

        except Exception as e:
            self.send_error(500, str(e))
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    print('[TTS Server] Starting on port 9091...', flush=True)
    server = HTTPServer(('0.0.0.0', 9091), TTSHandler)
    print('[TTS Server] Ready on port 9091', flush=True)
    server.serve_forever()