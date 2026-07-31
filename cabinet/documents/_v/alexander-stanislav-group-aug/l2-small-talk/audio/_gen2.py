import asyncio, os, hashlib, re, json
import edge_tts

VOICE = "en-GB-SoniaNeural"
OUT = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(OUT, "_manifest.json")

with open(MANIFEST_PATH, encoding="utf-8") as f:
    manifest = json.load(f)

# Speaking-model phrases · one per Block 1-9 (для «Now you» после каждой части)
NEW = [
    # Block 1 · greetings pair model
    "Hi! How are you? I'm fine, thanks. And you?",
    "Nice to meet you. Same here.",
    # Block 2 · words in a sentence
    "I have five colleagues at the office. My gym is near work.",
    # Block 3 · construction in own words
    "In the evenings I usually stay at home. When I have some free time, I read.",
    "I'd like to travel more this year.",
    # Block 4 · time in own life
    "I usually wake up at seven a.m. and finish work around six p.m.",
    # Block 5 · frequency personal
    "I go to the gym three times a week. I call my parents twice a week.",
    # Block 6 · some/any in questions
    "Do you have any plans for the weekend? I have some free time on Saturday.",
    # Block 7 · articles in real sentence
    "I have a dog. The dog is small and quiet.",
    # Block 8 · adverbs of frequency in own life
    "I always drink coffee in the morning. I sometimes work late.",
    "She is never late. He is often busy on Fridays.",
    # Block 9 · prepositions of time in own week
    "My birthday is in March. I usually meet friends on Saturday evening.",
    # Block 10 already covered, but Speech Coach final task model:
    "This week I usually work from nine a.m. to six p.m. In the evenings I sometimes read or go to the gym. I'd like to travel to Italy in September.",
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
        print(f"  {fname}  <-  {p.encode('ascii', 'ignore').decode()[:60]}")
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nDONE · total {len(manifest)} files")

asyncio.run(main())
