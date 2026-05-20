import json
import subprocess
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "diagnostic-pdfs"
NODE = Path(r"C:\Users\Whitenois\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")


def load_levels():
    result = subprocess.run(
        [str(NODE), str(ROOT / "_archive" / "tools" / "export_diagnostic_levels.js"), str(ROOT / "diagnostic-test.html")],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    return json.loads(result.stdout)


def seeded_index(seed, length):
    value = 2166136261
    for char in seed:
        value ^= ord(char)
        value = (value * 16777619) & 0xFFFFFFFF
    return abs(value) % length


def shuffle_options(options, answer, seed):
    if not isinstance(answer, int) or answer < 0 or answer >= len(options):
        return options, answer
    pairs = [{"option": option, "correct": index == answer} for index, option in enumerate(options)]
    for index in range(len(pairs) - 1, 0, -1):
        swap_index = seeded_index(f"{seed}-{index}", index + 1)
        pairs[index], pairs[swap_index] = pairs[swap_index], pairs[index]
    next_options = [item["option"] for item in pairs]
    next_answer = next(index for index, item in enumerate(pairs) if item["correct"])
    return next_options, next_answer


def normalize_answer_distribution(levels):
    for level in levels:
        for skill in ("reading", "listening"):
            for index, question in enumerate(level[skill]["questions"]):
                if isinstance(question, dict) and isinstance(question.get("answer"), int):
                    question["options"], question["answer"] = shuffle_options(
                        question["options"], question["answer"], f"{level['code']}-{skill}-{index}"
                    )
        for index, item in enumerate(level["grammar"]):
            item[1], item[2] = shuffle_options(item[1], item[2], f"{level['code']}-grammar-{index}")
    return levels


def register_font():
    candidates = [
        Path(r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\calibri.ttf"),
        Path(r"C:\Windows\Fonts\times.ttf"),
    ]
    for path in candidates:
        if path.exists():
            pdfmetrics.registerFont(TTFont("SiteFont", str(path)))
            return "SiteFont"
    return "Helvetica"


FONT = register_font()
STYLES = getSampleStyleSheet()
TITLE = ParagraphStyle(
    "Title",
    parent=STYLES["Title"],
    fontName=FONT,
    fontSize=25,
    leading=30,
    alignment=1,
    textColor=colors.HexColor("#1a1326"),
    spaceAfter=8,
)
SUBTITLE = ParagraphStyle(
    "Subtitle",
    parent=STYLES["BodyText"],
    fontName=FONT,
    fontSize=13,
    leading=16,
    alignment=1,
    textColor=colors.HexColor("#4a4358"),
    spaceAfter=12,
)
KICKER = ParagraphStyle(
    "Kicker",
    parent=STYLES["BodyText"],
    fontName=FONT,
    fontSize=8.5,
    leading=10,
    alignment=1,
    textColor=colors.HexColor("#7a5fcf"),
    spaceAfter=4,
)
SECTION_WHITE = ParagraphStyle(
    "SectionWhite",
    parent=STYLES["Heading2"],
    fontName=FONT,
    fontSize=13,
    leading=15,
    textColor=colors.white,
)
BODY = ParagraphStyle(
    "Body",
    parent=STYLES["BodyText"],
    fontName=FONT,
    fontSize=10.5,
    leading=14,
    textColor=colors.HexColor("#1a1326"),
    spaceAfter=6,
)
SMALL = ParagraphStyle(
    "Small",
    parent=BODY,
    fontSize=9,
    leading=12,
    spaceAfter=3,
)
OPTION = ParagraphStyle(
    "Option",
    parent=SMALL,
    leftIndent=6,
)

ACCENT = colors.HexColor("#7A5FCF")
ORANGE = colors.HexColor("#FF5A1F")
SOFT = colors.HexColor("#F7F5FF")
PALE = colors.HexColor("#FFF8F2")
GRID = colors.HexColor("#BDB3E5")


def p(text, style=BODY):
    text = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(text.replace("\n", "<br/>"), style)


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT, 8)
    canvas.setFillColor(colors.HexColor("#777777"))
    canvas.drawString(doc.leftMargin, 10 * mm, "New Generation English Test")
    canvas.drawRightString(A4[0] - doc.rightMargin, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def question_text(question):
    return question["text"] if isinstance(question, dict) else question


def question_options(question):
    return question.get("options", ["Answer 1", "Answer 2", "Answer 3"]) if isinstance(question, dict) else ["Answer 1", "Answer 2", "Answer 3"]


def meta_table(level):
    data = [
        [p("Level", BODY), p(f"{level['code']} - {level['name']}", BODY)],
        [p("Skills assessed", BODY), p("Reading, Listening, Writing, Speaking, Grammatical Range and Accuracy", BODY)],
        [p("Format", BODY), p("Academic entrance diagnostic test", BODY)],
    ]
    table = Table(data, colWidths=[58 * mm, 112 * mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.7, GRID),
        ("BACKGROUND", (0, 0), (0, -1), SOFT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def section_bar(title):
    table = Table([[p(title, SECTION_WHITE)]], colWidths=[170 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def info_box(text):
    table = Table([[p(text, BODY)]], colWidths=[170 * mm])
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, GRID),
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def question_block(number, prompt, options):
    option_flow = [p(prompt, BODY)]
    for label, option in zip(("A", "B", "C"), options):
        option_flow.append(p(f"{label}. {option}", OPTION))
    option_flow.extend([Spacer(1, 1 * mm), p("_" * 72, OPTION)])
    table = Table(
        [[p(str(number).zfill(2), SMALL), option_flow]],
        colWidths=[14 * mm, 156 * mm],
    )
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.45, GRID),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, GRID),
        ("BACKGROUND", (0, 0), (0, 0), SOFT),
        ("BACKGROUND", (1, 0), (1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (0, 0), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return KeepTogether([table, Spacer(1, 2 * mm)])


def answer_lines(lines=4):
    return info_box("\n".join(["_" * 96 for _ in range(lines)]))


def document_header(story, title, subtitle, level):
    story.extend([
        p("NEW GENERATION ENGLISH", KICKER),
        p(title, TITLE),
        p(subtitle, SUBTITLE),
        meta_table(level),
        Spacer(1, 8 * mm),
    ])


def append_reading(story, level):
    story.extend([
        section_bar("Reading"),
        Spacer(1, 3 * mm),
        p(level["reading"]["title"], BODY),
        info_box(level["reading"]["text"]),
        Spacer(1, 3 * mm),
    ])
    for i, q in enumerate(level["reading"]["questions"], 1):
        story.append(question_block(i, question_text(q), question_options(q)))


def append_listening(story, level):
    story.extend([
        section_bar("Listening"),
        Spacer(1, 3 * mm),
        p(level["listening"]["title"], BODY),
        info_box(f"Audio track: {level['code']}-listening.mp3 on the website. If the recording is not uploaded yet, use the backup browser voice. The transcript is not printed in the student PDF."),
        Spacer(1, 3 * mm),
    ])
    for i, q in enumerate(level["listening"]["questions"], 1):
        story.append(question_block(i, question_text(q), question_options(q)))


def append_writing(story, level):
    story.extend([
        section_bar("Writing"),
        Spacer(1, 3 * mm),
        p(level["writing"], BODY),
        info_box("Teacher rubric: task response 0-5; organisation 0-5; grammar control 0-5; vocabulary range 0-5."),
        answer_lines(8),
    ])


def append_speaking(story, level):
    story.extend([
        section_bar("Speaking"),
        Spacer(1, 3 * mm),
        p(level["speaking"], BODY),
        info_box("Record your answer on the website or prepare an audio file for the teacher."),
        Spacer(1, 3 * mm),
        p("Preparation notes", BODY),
        answer_lines(5),
    ])


def append_grammar(story, level):
    story.extend([
        section_bar("Grammatical Range and Accuracy"),
        Spacer(1, 3 * mm),
    ])
    for i, item in enumerate(level["grammar"], 1):
        story.append(question_block(i, item[0], item[1]))


def build_story_pdf(path, title, subtitle, level, appenders):
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    story = []
    document_header(story, title, subtitle, level)
    for index, appender in enumerate(appenders):
        if index:
            story.append(PageBreak())
        appender(story, level)
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)


def build_full_level_pdf(level):
    code = level["code"]
    build_story_pdf(
        OUT / f"{code}-full-test.pdf",
        "New Generation English Test",
        "Academic Entrance Diagnostic",
        level,
        [append_reading, append_listening, append_writing, append_speaking, append_grammar],
    )


def build_skill_pdfs(level):
    code = level["code"]
    build_story_pdf(OUT / f"{code}-reading.pdf", f"{code} Reading", "Academic diagnostic - Reading", level, [append_reading])
    build_story_pdf(OUT / f"{code}-listening.pdf", f"{code} Listening", "Academic diagnostic - Listening", level, [append_listening])
    build_story_pdf(OUT / f"{code}-writing.pdf", f"{code} Writing", "Academic diagnostic - Writing", level, [append_writing])
    build_story_pdf(OUT / f"{code}-speaking.pdf", f"{code} Speaking", "Academic diagnostic - Speaking", level, [append_speaking])
    build_story_pdf(OUT / f"{code}-grammar.pdf", f"{code} Grammar", "Academic diagnostic - Grammar", level, [append_grammar])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    levels = normalize_answer_distribution(load_levels())
    for level in levels:
        build_full_level_pdf(level)
        build_skill_pdfs(level)


if __name__ == "__main__":
    main()
