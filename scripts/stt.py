#!/usr/bin/env python3
"""
STT 语音识别脚本
使用 faster-whisper 本地模型，支持中英文自动识别
用法: python3 stt.py <audio_file>
输出: JSON { text: "识别结果" }
"""
import sys
import json
import time

def transcribe(audio_path):
    from faster_whisper import WhisperModel

    # 加载模型（首次会自动下载，之后从缓存加载）
    model = WhisperModel('base', device='cpu', compute_type='int8')

    # 自动检测语言（不指定 language 参数）
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        vad_filter=True,  # 过滤静音
    )

    # 拼接所有片段
    text_parts = []
    for seg in segments:
        text_parts.append(seg.text.strip())

    text = ' '.join(text_parts).strip()

    return {
        'text': text,
        'language': info.language,
        'language_probability': round(float(info.language_probability), 2),
    }

if __name__ == '__main__':
    audio_path = sys.argv[1]
    try:
        result = transcribe(audio_path)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'error': str(e), 'text': ''}, ensure_ascii=False))