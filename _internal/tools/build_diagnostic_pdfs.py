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


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "diagnostic-pdfs"
NODE = Path(r"C:\Users\Whitenois\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")


def load_levels():
    result = subprocess.run(
        [str(NODE), str(ROOT / "tools" / "export_diagnostic_levels.js"), str(ROOT / "diagnostic-test.html")],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    return json.loads(result.stdout)


def move_correct_option(options, answer, target):
    if not isinstance(answer, int) or answer < 0 or answer >= len(options):
        return options, answer
    next_options = list(options)
    correct = next_options.pop(answer)
    next_options.insert(target, correct)
    return next_options, target


def normalize_answer_distribution(levels):
    keyed_count = 0
    for level in levels:
        keyed_count += sum(1 for q in level["reading"]["questions"] if isinstance(q, dict) and isinstance(q.get("answer"), int))
        keyed_count += sum(1 for q in level["listening"]["questions"] if isinstance(q, dict) and isinstance(q.get("answer"), int))
        keyed_count += len(level["grammar"])

    first = round(keyed_count * 0.1)
    second = round(keyed_count * 0.3)
    plan = [0] * first + [1] * second + [2] * max(0, keyed_count - first - second)
    cursor = 0

    for level in levels:
        for skill in ("reading", "listening"):
            for question in level[skill]["questions"]:
                if isinstance(question, dict) and isinstance(question.get("answer"), int):
                    question["options"], question["answer"] = move_correct_option(
                        question["options"], question["answer"], plan[cursor] if cursor < len(plan) else 2
                    )
                    cursor += 1
        for item in level["grammar"]:
            item[1], item[2] = move_correct_option(item[1], item[2], plan[cursor] if cursor < len(plan) else 2)
            cursor += 1
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
    textColor=colors.HexColor("#1F4E79"),
    spaceAfter=8,
)
SUBTITLE = ParagraphStyle(
    "Subtitle",
    parent=STYLES["BodyText"],
    fontName=FONT,
    fontSize=13,
    leading=16,
    alignment=1,
    textColor=colors.HexColor("#555555"),
    spaceAfter=12,
)
KICKER = ParagraphStyle(
    "Kicker",
    parent=STYLES["BodyText"],
    fontName=FONT,
    fontSize=8.5,
    leading=10,
    alignment=1,
    textColor=colors.HexColor("#666666"),
    spaceAfter=4,
)
HEAD = ParagraphStyle(
    "Head",
    parent=STYLES["Heading2"],
    fontName=FONT,
    fontSize=13,
    leading=16,
    textColor=colors.HexColor("#1F4E79"),
    spaceBefore=8,
    spaceAfter=6,
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
MUTED = ParagraphStyle(
    "Muted",
    parent=BODY,
    textColor=colors.HexColor("#4a4358"),
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

BLUE = colors.HexColor("#1F4E79")
LIGHT_BLUE = colors.HexColor("#DDEBF7")
PALE_BLUE = colors.HexColor("#EEF5FA")
GRID = colors.HexColor("#9FB6C8")


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


def build_pdf(path, title, blocks):
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    story = [p(title, TITLE), p("New Generation English · Academic diagnostic", MUTED), Spacer(1, 4 * mm)]
    for heading, items in blocks:
        story.append(p(heading, HEAD))
        for item in items:
            story.append(p(item, BODY))
    doc.build(story)


def meta_table(level):
    data = [
        [p("Level", BODY), p(f"{level['code']} · {level['name']}", BODY)],
        [p("Skills assessed", BODY), p("Reading, Listening, Writing, Speaking, Grammatical Range and Accuracy", BODY)],
        [p("Format", BODY), p("Academic entrance diagnostic test", BODY)],
    ]
    table = Table(data, colWidths=[58 * mm, 112 * mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.7, colors.black),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BLUE),
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
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
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
        ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
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
        ("BACKGROUND", (0, 0), (0, 0), LIGHT_BLUE),
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


def build_full_level_pdf(level):
    code = level["code"]
    path = OUT / f"{code}-full-test.pdf"
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    story = [
        p("NEW GENERATION ENGLISH", KICKER),
        p("New Generation English Test", TITLE),
        p("Academic Entrance Diagnostic", SUBTITLE),
        meta_table(level),
        Spacer(1, 8 * mm),
        section_bar("Reading"),
        Spacer(1, 3 * mm),
        p(level["reading"]["title"], BODY),
        info_box(level["reading"]["text"]),
        Spacer(1, 3 * mm),
    ]
    for i, q in enumerate(level["reading"]["questions"], 1):
        story.append(question_block(i, question_text(q), question_options(q)))

    story.extend([
        Spacer(1, 4 * mm),
        section_bar("Listening"),
        Spacer(1, 3 * mm),
        p(level["listening"]["title"], BODY),
        info_box("Audio track: open this level on the website and press Play audio: female / male voices. The transcript is not printed in the student PDF."),
        Spacer(1, 3 * mm),
    ])
    for i, q in enumerate(level["listening"]["questions"], 1):
        story.append(question_block(i, question_text(q), question_options(q)))

    story.extend([
        Spacer(1, 4 * mm),
        section_bar("Writing"),
        Spacer(1, 3 * mm),
        p(level["writing"], BODY),
        answer_lines(5),
        Spacer(1, 4 * mm),
        section_bar("Speaking"),
        Spacer(1, 3 * mm),
        p(level["speaking"], BODY),
        info_box("Record your answer on the website or prepare an audio file for the teacher."),
        Spacer(1, 4 * mm),
        section_bar("Grammatical Range and Accuracy"),
        Spacer(1, 3 * mm),
    ])
    for i, item in enumerate(level["grammar"], 1):
        story.append(question_block(i, item[0], item[1]))
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    levels = normalize_answer_distribution(load_levels())
    for level in levels:
        build_full_level_pdf(level)


if __name__ == "__main__":
    main()
