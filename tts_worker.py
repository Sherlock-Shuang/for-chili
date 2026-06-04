import sys
import os
import dashscope
from dashscope.audio.tts_v2 import SpeechSynthesizer
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("LLM_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
if not api_key:
    print("ERROR: No API key found")
    sys.exit(1)

dashscope.api_key = api_key

if len(sys.argv) < 4:
    print("Usage: python3 tts_worker.py <text> <voice_id> <output_file>")
    sys.exit(1)

text_to_synthesize = sys.argv[1]
voice_id = sys.argv[2]
output_file = sys.argv[3]

try:
    synthesizer = SpeechSynthesizer(model="cosyvoice-v3.5-flash", voice=voice_id)
    audio_data = synthesizer.call(text_to_synthesize)
    with open(output_file, "wb") as f:
        f.write(audio_data)
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
