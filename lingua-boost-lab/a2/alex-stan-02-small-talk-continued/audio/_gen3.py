import asyncio, os, hashlib, re, json
import edge_tts

VOICE = "en-GB-SoniaNeural"
OUT = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(OUT, "_manifest.json")

with open(MANIFEST_PATH, encoding="utf-8") as f:
    manifest = json.load(f)

NEW = [
    # Extended vocab examples (block 2)
    "I have three colleagues at the office. We sit in the same open space and have coffee together at eleven.",
    "My colleague is calm and adequate, even after a very long call with a difficult client.",
    "Our gym is near the office. I usually go there after work, around seven p.m.",
    "In my free time I read the news, walk with my dog, or watch football with friends.",
    "In the evenings I usually stay at home, but on Friday I go out with colleagues.",
    "A few colleagues from Berlin came to Moscow last week for a business dinner.",
    # Places to go (block 3 · expanded)
    "I go to work by car.",
    "I go home around seven p.m.",
    "I go to the office at eight thirty.",
    "I go to the shop on Saturday morning.",
    "I go to a café for lunch.",
    "I go to a restaurant with clients on Friday.",
    "I go to the park with my dog in the evening.",
    "I go to the cinema once a month.",
    "I go to the doctor once a year.",
    "I go to the bank on Tuesday.",
    "I go to the station by taxi.",
    # Present Simple examples (new block 4)
    "I drink coffee every morning.",
    "She drinks tea in the evening.",
    "We work in sales.",
    "He works from home on Fridays.",
    "Do you speak English?",
    "Does she speak English?",
    "I don't smoke.",
    "She doesn't like meat.",
    "The office opens at nine a.m.",
    "My colleague Sergey usually finishes work at six p.m.",
    # Now You · Present Simple model
    "I work in sales. I usually start at nine a.m. and finish around six p.m. I don't work on Sunday.",
    "What do you do?",
    "Where do you work?",
    "What time do you start work?",
    # Extra now-you questions using places
    "Where do you go for lunch?",
    "How often do you go to the cinema?",
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
        print(f"  {fname[:50]}  <-  {p.encode('ascii','ignore').decode()[:60]}")
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    # regenerate JS manifest
    js = 'window.AUDIO_MANIFEST = ' + json.dumps(manifest, ensure_ascii=False, indent=2) + ';'
    with open(os.path.join(OUT, "_manifest.js"), "w", encoding="utf-8") as f:
        f.write(js)
    print(f"\nDONE · total {len(manifest)} files")

asyncio.run(main())
