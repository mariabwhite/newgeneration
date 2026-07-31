import asyncio, os, hashlib, re
import edge_tts

VOICE = "en-GB-SoniaNeural"
OUT = os.path.dirname(os.path.abspath(__file__))

PHRASES = [
    "Hi!",
    "Hello.",
    "Good morning.",
    "Good afternoon.",
    "Good evening.",
    "How are you?",
    "Nice to meet you.",
    "See you later.",
    "colleagues",
    "adequate",
    "gym",
    "free time",
    "evening",
    "a few",
    "I usually go out on Friday.",
    "In the evenings I read.",
    "When I have some free time, I go to the gym.",
    "I go to the gym twice a week.",
    "I'd like to speak English better.",
    "seven a.m.",
    "three p.m.",
    "It's twelve noon.",
    "It's midnight.",
    "It's eight o'clock.",
    "It's half past five.",
    "I go to the gym once a week.",
    "She calls her mum twice a week.",
    "We meet the client three times a week.",
    "He travels four times a month.",
    "I go to the doctor once a year.",
    "always. I always drink coffee in the morning.",
    "usually. I usually go to the gym on Monday.",
    "often. We often work late on Fridays.",
    "sometimes. I sometimes go out on Saturday.",
    "rarely. He rarely drinks alcohol.",
    "never. She never smokes.",
    "ever. Do you ever go to the cinema?",
    "at seven o'clock",
    "on Monday",
    "in May",
    "at night",
    "on Saturday morning",
    "in twenty twenty-six",
    "I'd like to try a new sport.",
    "I'd like to go to Italy this autumn.",
    "I'd like to speak English better by December.",
    "I'd like to travel to Japan someday.",
    "I'd like to read a book about business.",
    "I'd like to meet a friend for coffee this evening.",
]

def slugify(text):
    h = hashlib.md5(text.encode()).hexdigest()[:8]
    s = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:40]
    return f"{s}-{h}.mp3"

async def gen(phrase):
    fname = slugify(phrase)
    fpath = os.path.join(OUT, fname)
    if os.path.exists(fpath):
        return fname, phrase
    comm = edge_tts.Communicate(phrase, VOICE, rate="-5%")
    await comm.save(fpath)
    return fname, phrase

async def main():
    manifest = {}
    for p in PHRASES:
        fname, phrase = await gen(p)
        manifest[phrase] = fname
        print(f"  {fname}  <-  {phrase.encode('ascii', 'ignore').decode()}")
    with open(os.path.join(OUT, "_manifest.json"), "w", encoding="utf-8") as f:
        import json
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nDONE · {len(manifest)} files")

asyncio.run(main())
