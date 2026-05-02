from __future__ import annotations

import shutil
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{W_NS}}}"
ET.register_namespace("w", W_NS)


YELLOW_VALUES = {"yellow", "default", "lightgray", "lightGray"}
YELLOW_FILLS = {"FFFF00", "FFF200", "FFFF99", "FFFF66"}


def clean_xml(data: bytes) -> tuple[bytes, int]:
    root = ET.fromstring(data)
    removed = 0

    for rpr in root.findall(f".//{W}rPr"):
        for highlight in list(rpr.findall(f"{W}highlight")):
            val = (highlight.get(f"{W}val") or "").lower()
            if val in YELLOW_VALUES:
                rpr.remove(highlight)
                removed += 1

        for shd in list(rpr.findall(f"{W}shd")):
            fill = (shd.get(f"{W}fill") or "").upper()
            if fill in YELLOW_FILLS:
                rpr.remove(shd)
                removed += 1

    for ppr in root.findall(f".//{W}pPr"):
        for shd in list(ppr.findall(f"{W}shd")):
            fill = (shd.get(f"{W}fill") or "").upper()
            if fill in YELLOW_FILLS:
                ppr.remove(shd)
                removed += 1

    return ET.tostring(root, encoding="utf-8", xml_declaration=True), removed


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: remove_docx_yellow.py input.docx output.docx", file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    dst.parent.mkdir(parents=True, exist_ok=True)

    tmp = dst.with_suffix(".tmp.docx")
    if tmp.exists():
        tmp.unlink()

    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        total_removed = 0
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.startswith("word/") and item.filename.endswith(".xml"):
                try:
                    data, removed = clean_xml(data)
                    total_removed += removed
                except ET.ParseError:
                    pass
            zout.writestr(item, data)

    shutil.move(str(tmp), str(dst))

    print(f"removed yellow highlight/shading elements: {total_removed}")
    print(dst.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
