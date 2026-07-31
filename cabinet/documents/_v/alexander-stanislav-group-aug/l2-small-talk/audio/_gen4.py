import asyncio, os, hashlib, re, json
import edge_tts

VOICE = "en-GB-SoniaNeural"
OUT = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(OUT, "_manifest.json")

with open(MANIFEST_PATH, encoding="utf-8") as f:
    manifest = json.load(f)

NEW = [
    # Would you like...? block
    "Would you like a coffee?",
    "Would you like some water?",
    "Would you like to go to lunch?",
    "Would you like to try this?",
    "Would you like a receipt?",
    "Would you like to meet on Friday?",
    "Yes, please.",
    "No, thank you.",
    "Yes, I'd love to.",
    "No, thanks, I'm fine.",
    # Now-you Would you like
    "Would you like a coffee? Yes, please. Would you like to meet on Friday? Yes, I'd love to.",
    "Would you like a coffee or tea?",
    "Would you like to go for lunch after the meeting?",
    "Would you like to try our new product?",
    # Present Simple · additional Now You
    "Do you speak English at work?",
    "Does your colleague speak English?",
    "I don't work on Sunday. I usually work from nine to six.",
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
