param([string]$Root, [int]$Port = 4800)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root on http://localhost:$Port/"
while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $localPath = $req.Url.LocalPath -replace '^/', ''
    if ($localPath -eq '') { $localPath = 'index.html' }

    # Support "clean" URLs for static pages:
    # - /cabinet/teacher -> /cabinet/teacher.html
    # - /cabinet/        -> /cabinet/index.html
    $filePath = Join-Path $Root $localPath

    if (Test-Path $filePath -PathType Container) {
        $filePath = Join-Path $filePath 'index.html'
    } elseif (-not ([System.IO.Path]::HasExtension($filePath))) {
        $candidate = "$filePath.html"
        if (Test-Path $candidate -PathType Leaf) {
            $filePath = $candidate
        }
    }
    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mime = switch ($ext) {
            '.html' { 'text/html; charset=utf-8' }
            '.css'  { 'text/css' }
            '.js'   { 'application/javascript' }
            '.png'  { 'image/png' }
            '.jpg'  { 'image/jpeg' }
            '.svg'  { 'image/svg+xml' }
            default { 'application/octet-stream' }
        }
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $res.ContentType = $mime
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $res.StatusCode = 404
    }
    $res.OutputStream.Close()
}
