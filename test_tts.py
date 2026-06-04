import dashscope
import logging
import os

# Enable dashscope debug logging
import http.client as http_client
http_client.HTTPConnection.debuglevel = 1
logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)
requests_log = logging.getLogger("urllib3")
requests_log.setLevel(logging.DEBUG)
requests_log.propagate = True

from dotenv import load_dotenv
load_dotenv()
dashscope.api_key = os.getenv("LLM_API_KEY")

with open("voice_id.txt", "r") as f:
    real_voice = f.read().strip()

from dashscope.audio.tts_v2 import SpeechSynthesizer
try:
    synthesizer = SpeechSynthesizer(model="cosyvoice-v1", voice="longxiaochun")
    audio = synthesizer.call("你好")
except Exception as e:
    print("EXCEPTION OCCURRED:", e)
    import traceback
    traceback.print_exc()
