"""Makes the voiceover with Kokoro (open-source, Apache 2.0, runs locally).
Usage: python voice.py guide|buyer [voice]   -> build/voice-guide.wav or build/voice-buyer.wav
Lines and timings match voiceover.md and the scenes in video.html.
"""
import sys, os
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
TTS = os.path.join(HERE, 'build', 'tts')
VERSION = sys.argv[1] if len(sys.argv) > 1 else 'guide'
VOICE = sys.argv[2] if len(sys.argv) > 2 else 'af_heart'
LEN = 30.5

# (start, latest end, text). "Field print" is spelled out so it is said clearly.
LINES = {
    'guide': [
        (0.9, 5.1, "You took the shot. Your guests still talk about it."),
        (5.7, 10.1, "Now they can hang it on their wall."),
        (10.7, 16.1, "Field print gives you your own print shop. Your best photos, one link."),
        (16.7, 21.1, "Guests order. We print it, frame it, and ship it anywhere in the world."),
        (21.6, 25.6, "You set the price. You get paid. No stock, no packing."),
        (26.1, 29.8, "Field print. Sell prints of your safari photos."),
    ],
    'buyer': [
        (0.9, 5.1, "Back from safari? Remember this?"),
        (5.7, 10.1, "Now you can hang it at home."),
        (10.7, 16.1, "Your guide has their own print shop, full of photos from your trip."),
        (16.7, 21.1, "Pick a size and frame, see exactly what you get, and we deliver it."),
        (21.6, 25.6, "And every print supports your guide."),
        (26.1, 29.8, "Field print. Ask your guide for their link."),
    ],
}[VERSION]

kokoro = Kokoro(os.path.join(TTS, 'kokoro-v1.0.onnx'), os.path.join(TTS, 'voices-v1.0.bin'))


def trim(x, sr, thresh=0.01):
    idx = np.where(np.abs(x) > thresh)[0]
    if not len(idx):
        return x
    a, b = max(0, idx[0] - int(.02 * sr)), min(len(x), idx[-1] + int(.08 * sr))
    return x[a:b]


out = None
for start, end, text in LINES:
    window = end - start
    speed = 1.0
    for _ in range(4):
        audio, sr = kokoro.create(text, voice=VOICE, speed=speed, lang='en-us' if VOICE.startswith('a') else 'en-gb')
        audio = trim(np.asarray(audio, dtype=np.float32), sr)
        dur = len(audio) / sr
        if dur <= window or speed >= 1.25:
            break
        speed = min(1.25, speed * dur / window * 1.03)
    if out is None:
        out = np.zeros(int(LEN * sr), dtype=np.float32)
    s = int(start * sr)
    audio = audio[: len(out) - s]
    fade = min(len(audio), int(.01 * sr))
    audio[-fade:] *= np.linspace(1, 0, fade)
    out[s:s + len(audio)] += audio
    print(f'{start:5.1f}s  {dur:4.2f}s of {window:3.1f}s  speed {speed:.2f}  {text}')

out = out / max(1e-6, np.max(np.abs(out))) * 0.9
path = os.path.join(HERE, 'build', f'voice-{VERSION}.wav')
sf.write(path, out, sr, subtype='PCM_16')
print('saved', path)
