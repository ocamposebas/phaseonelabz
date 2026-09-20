$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = Split-Path -Parent $PSScriptRoot
$pluginName = 'phaseone-site-gifts'
$pluginRoot = (Resolve-Path (Join-Path $repoRoot "wordpress/plugins/$pluginName")).Path
$mainFile = Join-Path $pluginRoot "$pluginName.php"
$pluginHeader = [System.IO.File]::ReadAllText($mainFile)
$versionMatch = [regex]::Match($pluginHeader, '(?m)^\s*\* Version:\s*([0-9.]+)\s*$')
if (-not $versionMatch.Success) {
    throw 'The plugin version header is missing.'
}

$version = $versionMatch.Groups[1].Value
$releaseRoot = (Resolve-Path (Join-Path $repoRoot 'releases')).Path
$outputPath = Join-Path $releaseRoot "$pluginName-v$version-WORDPRESS.zip"
$temporaryPath = Join-Path $releaseRoot "$pluginName-$([guid]::NewGuid().ToString('N')).tmp.zip"
$files = @(Get-ChildItem -LiteralPath $pluginRoot -Recurse -File | Sort-Object FullName)
$expectedEntries = @{}

try {
    $archive = [System.IO.Compression.ZipFile]::Open(
        $temporaryPath, [System.IO.Compression.ZipArchiveMode]::Create
    )
    try {
        foreach ($file in $files) {
            # ZIP entry names use forward slashes, including when built on Windows.
            $relativePath = $file.FullName.Substring($pluginRoot.Length + 1).Replace('\', '/')
            $entryName = "$pluginName/$relativePath"
            $expectedEntries[$entryName] = $file.FullName
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive, $file.FullName, $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    } finally {
        $archive.Dispose()
    }

    $archive = [System.IO.Compression.ZipFile]::OpenRead($temporaryPath)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        if ($archive.Entries.Count -ne $files.Count) {
            throw 'The archive file count does not match the plugin source.'
        }
        if ($null -eq $archive.GetEntry("$pluginName/$pluginName.php")) {
            throw 'The plugin main file is missing from the expected directory.'
        }
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName.Contains('\') -or -not $expectedEntries.ContainsKey($entry.FullName)) {
                throw "Invalid ZIP entry: $($entry.FullName)"
            }
            $entryStream = $entry.Open()
            $sourceStream = [System.IO.File]::OpenRead($expectedEntries[$entry.FullName])
            try {
                $archiveHash = [System.BitConverter]::ToString($sha256.ComputeHash($entryStream))
                $sourceHash = [System.BitConverter]::ToString($sha256.ComputeHash($sourceStream))
                if ($archiveHash -cne $sourceHash) {
                    throw "The archived file differs from its source: $($entry.FullName)"
                }
            } finally {
                $entryStream.Dispose()
                $sourceStream.Dispose()
            }
        }
    } finally {
        $sha256.Dispose()
        $archive.Dispose()
    }

    Move-Item -LiteralPath $temporaryPath -Destination $outputPath -Force
    [PSCustomObject]@{
        Package = $outputPath
        Version = $version
        Files = $files.Count
        Verified = $true
    }
} finally {
    if (Test-Path -LiteralPath $temporaryPath) {
        Remove-Item -LiteralPath $temporaryPath
    }
}
