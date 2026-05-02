from copy import deepcopy
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    r"C:\Users\Whitenois\Desktop\Новый центр управления\02_Work\Рабочая документация\Самозанятость\01_Договоры и ОПД\Самозанятость - договор платных услуг и ОПД - шаблон.docx"
)
DOCS = ROOT / "assets" / "documents"

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def split_docx(output_name, start_paragraph, end_paragraph=None):
    output = DOCS / output_name

    with ZipFile(SOURCE, "r") as zin:
        document_xml = zin.read("word/document.xml")
        root = etree.fromstring(document_xml)
        body = root.find("w:body", NS)
        children = list(body)
        sect_pr = body.find("w:sectPr", NS)

        paragraph_positions = [
            index for index, child in enumerate(children) if child.tag == f"{{{NS['w']}}}p"
        ]
        if end_paragraph is None:
            keep_positions = paragraph_positions[start_paragraph:]
        else:
            keep_positions = paragraph_positions[start_paragraph : end_paragraph + 1]

        body[:] = []
        for position in keep_positions:
            body.append(deepcopy(children[position]))
        if sect_pr is not None:
            body.append(deepcopy(sect_pr))

        patched_xml = etree.tostring(
            root,
            xml_declaration=True,
            encoding="UTF-8",
            standalone="yes",
        )

        with ZipFile(output, "w", ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "word/document.xml":
                    data = patched_xml
                zout.writestr(item, data)


def main():
    split_docx("personal-data-consent-adult.docx", 0, 27)
    split_docx("personal-data-consent-child.docx", 28, 52)
    split_docx("new-generation-service-contract.docx", 53, None)


if __name__ == "__main__":
    main()
