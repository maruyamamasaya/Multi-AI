[CmdletBinding()]
param(
    [switch]$Fast
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$requiredDocuments = @(
    'AGENTS.md',
    'CURRENT.md',
    'ARCHITECTURE.md',
    'CODEMAP.md',
    'TESTING.md',
    'OPERATIONS.md',
    'README.md'
)

$errors = [System.Collections.Generic.List[string]]::new()

foreach ($relativePath in $requiredDocuments) {
    $absolutePath = Join-Path $repositoryRoot $relativePath
    if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
        $errors.Add("Missing required document: $relativePath")
        continue
    }

    if ((Get-Item -LiteralPath $absolutePath).Length -eq 0) {
        $errors.Add("Required document is empty: $relativePath")
    }
}

$markdownFiles = Get-ChildItem -LiteralPath $repositoryRoot -Filter '*.md' -File -Recurse |
    Where-Object { $_.FullName -notmatch '\\(\.git|node_modules|dist-electron|dist-renderer)\\' }
$linkPattern = [regex]'\[[^\]]+\]\(([^)]+)\)'

foreach ($markdownFile in $markdownFiles) {
    $content = Get-Content -Raw -LiteralPath $markdownFile.FullName
    foreach ($match in $linkPattern.Matches($content)) {
        $target = $match.Groups[1].Value.Trim()
        if ($target -match '^(https?://|mailto:|#)') {
            continue
        }

        $pathWithoutAnchor = ($target -split '#', 2)[0]
        if ([string]::IsNullOrWhiteSpace($pathWithoutAnchor)) {
            continue
        }

        $resolvedPath = Join-Path $markdownFile.DirectoryName $pathWithoutAnchor
        if (-not (Test-Path -LiteralPath $resolvedPath)) {
            $relativeSource = $markdownFile.FullName.Substring($repositoryRoot.Length).TrimStart('\', '/')
            $errors.Add("Broken local link in ${relativeSource}: $target")
        }
    }
}

Push-Location $repositoryRoot
try {
    & git diff --check
    if ($LASTEXITCODE -ne 0) {
        $errors.Add('git diff --check failed')
    }

    if (Test-Path -LiteralPath (Join-Path $repositoryRoot 'package.json') -PathType Leaf) {
        $npmCommand = if ($Fast) { 'verify:fast' } else { 'verify' }
        & npm run $npmCommand
        if ($LASTEXITCODE -ne 0) {
            $errors.Add("npm run $npmCommand failed")
        }
    }
}
finally {
    Pop-Location
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    exit 1
}

$mode = if ($Fast) { 'Fast' } else { 'Full' }
Write-Host "$mode validation passed."
