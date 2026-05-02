param(
  [string]$Root = ".",
  [string]$Report = "link-check-report.md"
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$reportPath = if ([IO.Path]::IsPathRooted($Report)) { $Report } else { Join-Path $rootPath $Report }
$scanExts = @(".html", ".css", ".js")
$skipPattern = "^(mailto:|tel:|javascript:|data:|blob:|sms:|tg:)"

function Normalize-LocalPath {
  param([string]$Value)
  $withoutHash = ($Value -split "#", 2)[0]
  $withoutQuery = ($withoutHash -split "\?", 2)[0]
  return [Uri]::UnescapeDataString($withoutQuery)
}

function Get-Anchor {
  param([string]$Value)
  $parts = $Value -split "#", 2
  if ($parts.Count -eq 2) { return ($parts[1] -split "\?", 2)[0] }
  return ""
}

function Get-LinksFromText {
  param([string]$Text, [string]$Extension)
  $items = New-Object System.Collections.Generic.List[object]

  if ($Extension -eq ".html") {
    foreach ($match in [regex]::Matches($Text, "(?i)\b(?:href|src|data-doc)\s*=\s*[""']([^""']+)[""']")) {
      $items.Add([pscustomobject]@{ Kind = "html-attr"; Value = $match.Groups[1].Value.Trim() })
    }
  }

  if ($Extension -ne ".js") {
    foreach ($match in [regex]::Matches($Text, "(?i)url\(\s*['""]?([^)'""\s]+)['""]?\s*\)")) {
      $items.Add([pscustomobject]@{ Kind = "url()"; Value = $match.Groups[1].Value.Trim() })
    }
  }

  if ($Extension -eq ".js") {
    foreach ($match in [regex]::Matches($Text, "['""]((?:\.{0,2}/)?[^'""]+\.(?:html|css|js|png|jpe?g|gif|svg|webp|avif|ico|pdf|docx|xlsx|mp3|mp4|json)(?:#[^'""]*)?)['""]", "IgnoreCase")) {
      $items.Add([pscustomobject]@{ Kind = "js-string"; Value = $match.Groups[1].Value.Trim() })
    }
  }

  return $items
}

function Get-Ids {
  param([string]$Text)
  $ids = New-Object System.Collections.Generic.HashSet[string]
  foreach ($match in [regex]::Matches($Text, "(?i)\bid\s*=\s*[""']([^""']+)[""']")) {
    [void]$ids.Add($match.Groups[1].Value)
  }
  return $ids
}

$files = Get-ChildItem -LiteralPath $rootPath -Recurse -File |
  Where-Object {
    $scanExts -contains $_.Extension.ToLowerInvariant() -and
    $_.FullName -notmatch "\\(\.git|newgeneration-github-publish|review-docs|audit-docx|\.chrome-[^\\]+)\\"
  }

$idsByFile = @{}
$missing = New-Object System.Collections.Generic.List[string]
$badAnchors = New-Object System.Collections.Generic.List[string]
$external = New-Object System.Collections.Generic.List[string]
$ok = 0

foreach ($file in $files) {
  $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  if ($file.Extension.ToLowerInvariant() -eq ".html") {
    $idsByFile[$file.FullName] = Get-Ids $text
  }
}

foreach ($file in $files) {
  $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  $relSource = $file.FullName.Substring($rootPath.Length).TrimStart("\", "/").Replace("\", "/")
  foreach ($link in Get-LinksFromText $text $file.Extension.ToLowerInvariant()) {
    $value = $link.Value
    if ([string]::IsNullOrWhiteSpace($value) -or $value -match $skipPattern) { continue }
    if ($value -like '*${*') { continue }
    if ($link.Kind -eq "url()" -and $value -notmatch "[/\\.#]") { continue }
    if ($link.Kind -eq "js-string" -and $value -notmatch "[/\\]" -and $value -notmatch "^\.\.?/") { continue }

    if ($value -match "^(https?:)?//") {
      $external.Add("- ``$relSource`` $($link.Kind): $value")
      continue
    }

    $localPath = Normalize-LocalPath $value
    $anchor = Get-Anchor $value
    if ([string]::IsNullOrWhiteSpace($localPath) -and $anchor) {
      $targetPath = $file.FullName
    } else {
      $baseDir = $file.DirectoryName
      if ($link.Kind -eq "js-string" -and $file.FullName -match "\\lingua-boost-lab\\assets\\") {
        $baseDir = Split-Path -Parent $file.DirectoryName
        if ($localPath -like "../lingua-boost-lab/*") {
          $localPath = $localPath.Substring(3)
          $baseDir = $rootPath
        }
      }
      $targetPath = [IO.Path]::GetFullPath((Join-Path $baseDir $localPath))
    }

    if (-not $targetPath.StartsWith($rootPath, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $targetPath)) {
      $missing.Add("- ``$relSource`` $($link.Kind): ``$value``")
      continue
    }

    if ($anchor -and [IO.Path]::GetExtension($targetPath).ToLowerInvariant() -eq ".html") {
      if (-not $idsByFile.ContainsKey($targetPath)) {
        $idsByFile[$targetPath] = Get-Ids (Get-Content -LiteralPath $targetPath -Raw -Encoding UTF8)
      }
      if (-not $idsByFile[$targetPath].Contains($anchor)) {
        $badAnchors.Add("- ``$relSource`` $($link.Kind): ``$value`` -> missing ``#$anchor``")
        continue
      }
    }

    $ok++
  }
}

$lines = @(
  "# Link Check Report",
  "",
  "- Root: ``$rootPath``",
  "- Scanned files: $($files.Count)",
  "- OK local references: $ok",
  "- Missing local references: $($missing.Count)",
  "- Missing anchors: $($badAnchors.Count)",
  "- External references: $($external.Count)",
  "",
  "## Missing Local References"
)

$lines += if ($missing.Count) { $missing } else { "No missing local references found." }
$lines += @("", "## Missing Anchors")
$lines += if ($badAnchors.Count) { $badAnchors } else { "No missing anchors found." }
$lines += @("", "## External References")
$lines += if ($external.Count) { $external } else { "No external references found." }
$lines += ""

Set-Content -LiteralPath $reportPath -Value $lines -Encoding UTF8
Write-Host $reportPath

if ($missing.Count -or $badAnchors.Count) { exit 1 }
exit 0
