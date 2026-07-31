import asyncio, os, hashlib, re, json
import edge_tts

VOICE = "en-GB-SoniaNeural"
OUT = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(OUT, "_manifest.json")

with open(MANIFEST_PATH, encoding="utf-8") as f:
    manifest = json.load(f)

NEW = [
    # Full mini-dialogue model for block 1 Now you
    "Hi, John! Good morning. How are you today? I'm fine, thanks. And you?",
    "Hello. Nice to meet you. I'm Alex.",
    "Nice to meet you too, Alex. I'm Stan.",
    "Have a good evening. See you tomorrow.",
    # Situation replies (right answers)
    "Good morning. How are you?",
    "Good afternoon.",
    "Good evening.",
    "Nice to meet you.",
    "See you later.",
    "Have a good day.",
]

def slugify(text):
    h = hashlib.md5(text.encode()).hexdigest()[:8]
    s = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:40]
    return f"{s}-{h}.mp3"

async def gen(phrase):
    fname = slugify(phrase)
    fpath = os.path.join(OUT, fname)
    if os.path.exists(fpath):
        return fname
    comm = edge_tts.Communicate(phrase, VOICE, rate="-5%")
    await comm.save(fpath)
    return fname

async def main():
    for p in NEW:
        fname = await gen(p)
        manifest[p] = fname
        print(f"  {fname[:52]}  <-  {p.encode('ascii','ignore').decode()[:60]}")
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    js = 'window.AUDIO_MANIFEST = ' + json.dumps(manifest, ensure_ascii=False, indent=2) + ';'
    with open(os.path.join(OUT, "_manifest.js"), "w", encoding="utf-8") as f:
        f.write(js)
    print(f"\nDONE · total {len(manifest)} files")

asyncio.run(main())
