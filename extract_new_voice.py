import os
import time
import requests
import dashscope
from dashscope.audio.tts_v2 import VoiceEnrollmentService
from dotenv import load_dotenv

load_dotenv()

# 读取 API Key
api_key = os.getenv("LLM_API_KEY")
if not api_key:
    api_key = os.getenv("DASHSCOPE_API_KEY")
    
if not api_key:
    print("❌ 错误: 找不到环境变量 LLM_API_KEY。请确保 .env 文件中有该配置。")
    exit(1)
else:
    # 去除多余引号
    dashscope.api_key = api_key.replace("'", "").replace('"', '').strip()

AUDIO_PATH = "音频提取编号-8837551.mp3"
TARGET_MODEL = "cosyvoice-v3.5-flash" 
VOICE_PREFIX = "peace"

print(f"--- Step 1: 正在上传本地音频文件 {AUDIO_PATH} 到临时云端 ---")
try:
    with open(AUDIO_PATH, 'rb') as f:
        # 使用 uguu.se 进行临时托管，国内直连可用且免登录
        response = requests.post("https://uguu.se/upload.php", files={'files[]': f}, timeout=60)
        
    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            audio_url = data['files'][0]['url']
            print(f"✅ 上传成功! 临时可访问地址为: {audio_url}")
        else:
            print("❌ 上传 API 拒绝，可能超出大小或网络问题。")
            exit(1)
    else:
        print(f"❌ 上传失败，HTTP 状态码: {response.status_code}")
        exit(1)
except Exception as e:
    print(f"❌ 上传过程发生错误: {e}")
    print("你可以手动将该 mp3 上传到任意可以生成直链的网盘，然后直接修改本脚本的 AUDIO_URL。")
    exit(1)


print("\n--- Step 2: 正在向阿里云百练提交音色提取请求 ---")
try:
    service = VoiceEnrollmentService()
    voice_id = service.create_voice(
        target_model=TARGET_MODEL,
        prefix=VOICE_PREFIX,
        url=audio_url
    )
    print(f"✅ 提交成功! 阿里云正在处理。")
    print(f"提取出的新 Voice ID: {voice_id}")
    
    with open("voice_id_new.txt", "w") as f:
        f.write(voice_id)
        
    print("\n--- Step 3: 正在轮询等待百练处理完成 ---")
    max_attempts = 30
    poll_interval = 10
    for attempt in range(max_attempts):
        try:
            voice_info = service.query_voice(voice_id=voice_id)
            status = voice_info.get("status")
            print(f"尝试 {attempt + 1}/{max_attempts}: 当前音色状态为 '{status}'")
            
            if status == "OK":
                print("🎉 新音色已就绪！可以直接使用了。新 Voice ID 已保存到 voice_id_new.txt")
                print("请回到聊天界面，老姐现在将自动在平时对话中使用这个温和的新音色！")
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
