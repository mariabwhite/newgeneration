#!/usr/bin/env bash
set -u

ROOT="${1:-.}"
REPORT="${2:-link-check-report.md}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

"$PYTHON_BIN" - "$ROOT" "$REPORT" <<'PY'
from __future__ import annotations

import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

root = Path(sys.argv[1]).resolve()
report_path = Path(sys.argv[2])
if not report_path.is_absolute():
    report_path = root / report_path

SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "data:", "blob:", "sms:", "tg:")
SCAN_EXTS = {".html", ".css", ".js"}
URL_RE = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.I)
JS_STRING_PATH_RE = re.compile(r"['\"]((?:\.{0,2}/)?[^'\"]+\.(?:html|css|js|png|jpe?g|gif|svg|webp|avif|ico|pdf|docx|xlsx|mp3|mp4|json)(?:#[^'\"]*)?)['\"]", re.I)


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = {k.lower(): v for k, v in attrs if v is not None}
        if "id" in attrs_map:
            self.ids.add(attrs_map["id"])
        for attr in ("href", "src", "data-doc"):
            value = attrs_map.get(attr)
            if value:
                self.links.append((attr, value.strip()))


def is_external(value: str) -> bool:
    parsed = urlsplit(value)
    return parsed.scheme in {"http", "https"} or value.startswith("//")


def should_skip(value: str) -> bool:
    lower = value.strip().lower()
    return not lower or lower.startswith(SKIP_SCHEMES)


def clean_local(value: str) -> tuple[str, str]:
    before_hash, hash_mark, anchor = value.partition("#")
    path_part = before_hash.split("?", 1)[0]
    return unquote(path_part), anchor if hash_mark else ""


def target_exists(source: Path, value: str) -> tuple[bool, Path | None, str]:
    path_part, anchor = clean_local(value)
    if not path_part and anchor:
        return True, source, anchor
    target = (source.parent / path_part).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        return False, target, anchor
    return target.exists(), target, anchor


EXCLUDED_PARTS = {".git", "newgeneration-github-publish", "review-docs", "audit-docx"}
files = [
    p for p in root.rglob("*")
    if p.is_file()
    and p.suffix.lower() in SCAN_EXTS
    and not (EXCLUDED_PARTS & set(p.parts))
    and not any(part.startswith(".chrome-") for part in p.parts)
]
html_ids: dict[Path, set[str]] = {}
html_links: dict[Path, list[tuple[str, str]]] = {}

for file in files:
    text = file.read_text(encoding="utf-8", errors="ignore")
    links: list[tuple[str, str]] = []
    if file.suffix.lower() == ".html":
        parser = LinkParser()
        parser.feed(text)
        html_ids[file] = parser.ids
        links.extend(parser.links)
    if file.suffix.lower() != ".js":
        for match in URL_RE.finditer(text):
            links.append(("url()", match.group(2).strip()))
    if file.suffix.lower() == ".js":
        for match in JS_STRING_PATH_RE.finditer(text):
            links.append(("js-string", match.group(1).strip()))
    html_links[file] = links

missing: list[str] = []
bad_anchors: list[str] = []
external: list[str] = []
ok = 0

for source, links in sorted(html_links.items()):
    rel_source = source.relative_to(root).as_posix()
    for attr, value in links:
        value = value.strip()
        if should_skip(value) or "${" in value:
            continue
        if attr == "url()" and not re.search(r"[/\\.#]", value):
            continue
        if attr == "js-string" and "/" not in value and "\\" not in value and not value.startswith(("./", "../")):
            continue
        if is_external(value):
            external.append(f"- `{rel_source}` {attr}: {value}")
            continue
        source_for_resolution = source
        value_for_resolution = value
        if attr == "js-string" and source.parent.name == "assets" and source.parent.parent.name == "lingua-boost-lab":
            source_for_resolution = source.parent.parent / source.name
            if value_for_resolution.startswith("../lingua-boost-lab/"):
                value_for_resolution = value_for_resolution[3:]
                source_for_resolution = root / source.name
        exists, target, anchor = target_exists(source_for_resolution, value_for_resolution)
        if not exists or target is None:
            missing.append(f"- `{rel_source}` {attr}: `{value}`")
            continue
        if anchor and target.suffix.lower() == ".html":
            ids = html_ids.get(target)
            if ids is None:
                parser = LinkParser()
                parser.feed(target.read_text(encoding="utf-8", errors="ignore"))
                html_ids[target] = parser.ids
                ids = parser.ids
            if anchor not in ids:
                bad_anchors.append(f"- `{rel_source}` {attr}: `{value}` -> missing `#{anchor}`")
                continue
        ok += 1

lines = [
    "# Link Check Report",
    "",
    f"- Root: `{root}`",
    f"- Scanned files: {len(files)}",
    f"- OK local references: {ok}",
    f"- Missing local references: {len(missing)}",
    f"- Missing anchors: {len(bad_anchors)}",
    f"- External references: {len(external)}",
    "",
    "## Missing Local References",
    *(missing or ["No missing local references found."]),
    "",
    "## Missing Anchors",
    *(bad_anchors or ["No missing anchors found."]),
    "",
    "## External References",
    *(external or ["No external references found."]),
    "",
]
report_path.write_text("\n".join(lines), encoding="utf-8")
print(report_path)
sys.exit(1 if missing or bad_anchors else 0)
PY
