import os
import time
import dashscope
from dashscope.audio.tts_v2 import VoiceEnrollmentService
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("LLM_API_KEY")
if not api_key:
    api_key = os.getenv("DASHSCOPE_API_KEY")
dashscope.api_key = api_key

TARGET_MODEL = "cosyvoice-v3.5-flash" 
VOICE_PREFIX = "sister-peace"
AUDIO_URL = "file:///Users/another_dimension/my_projects/2026.老姐/音频提取编号-8837551.mp3"

try:
    print("--- Step 1: Submitting ---")
    service = VoiceEnrollmentService()
    voice_id = service.create_voice(
        target_model=TARGET_MODEL,
        prefix=VOICE_PREFIX,
        url=AUDIO_URL
    )
    print(f"Voice ID: {voice_id}")
    with open("voice_id_new.txt", "w") as f:
        f.write(voice_id)
        
    print("\n--- Step 2: Polling ---")
    for attempt in range(30):
        voice_info = service.query_voice(voice_id=voice_id)
        status = voice_info.get("status")
        print(f"Status: {status}")
        if status == "OK":
            break
        time.sleep(10)
except Exception as e:
    print(f"Error: {e}")

