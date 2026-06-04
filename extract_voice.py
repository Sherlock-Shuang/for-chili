import os
import time
import dashscope
from dashscope.audio.tts_v2 import VoiceEnrollmentService
from dotenv import load_dotenv

load_dotenv()

# 使用 .env 中的 LLM_API_KEY 作为 dashscope.api_key
api_key = os.getenv("LLM_API_KEY")
if not api_key:
    api_key = os.getenv("DASHSCOPE_API_KEY")
    
if not api_key:
    print("⚠️ 警告: 找不到环境变量 LLM_API_KEY 或 DASHSCOPE_API_KEY。")
else:
    dashscope.api_key = api_key

TARGET_MODEL = "cosyvoice-v3.5-flash" 
VOICE_PREFIX = "sister"
AUDIO_URL = "https://n.uguu.se/QTuZOUgK.wav"

try:
    print("--- Step 1: 正在提交音色提取请求 ---")
    service = VoiceEnrollmentService()
    voice_id = service.create_voice(
        target_model=TARGET_MODEL,
        prefix=VOICE_PREFIX,
        url=AUDIO_URL
    )
    print(f"✅ 提交成功! Request ID: {service.get_last_request_id()}")
    print(f"生成的 Voice ID: {voice_id}")
    
    with open("voice_id.txt", "w") as f:
        f.write(voice_id)
        
    print("\n--- Step 2: 正在轮询等待音色处理完成 ---")
    max_attempts = 30
    poll_interval = 10
    for attempt in range(max_attempts):
        try:
            voice_info = service.query_voice(voice_id=voice_id)
            status = voice_info.get("status")
            print(f"尝试 {attempt + 1}/{max_attempts}: 当前音色状态为 '{status}'")
            
            if status == "OK":
                print("🎉 音色已就绪！可以直接使用了。Voice ID 已保存到 voice_id.txt")
                break
            elif status == "UNDEPLOYED":
                print(f"❌ 语音处理失败: {status}。请检查音频质量或重试。")
                break
            time.sleep(poll_interval)
        except Exception as e:
            print(f"轮询状态时出错: {e}")
            time.sleep(poll_interval)
    else:
        print("❌ 轮询超时。经过多次尝试后音色仍未就绪。")

except Exception as e:
    print(f"❌ 创建音色时发生错误: {e}")
    print("如果是因为 'file://' 不被支持，你可能需要将音频上传到一个公共 URL，并将 AUDIO_URL 替换为该 URL。")
