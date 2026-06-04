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

dashscope.api_key = os.getenv("LLM_API_KEY")

from dashscope.audio.tts_v2 import SpeechSynthesizer
try:
    synthesizer = SpeechSynthesizer(model="cosyvoice-v3.5-flash", voice="fake_voice_id")
    audio = synthesizer.call("你好")
except Exception as e:
    pass
