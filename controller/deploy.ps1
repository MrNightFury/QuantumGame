# Builds the web frontend (../front), copies its dist/ into this project's
# data/ folder and uploads it to the controller as SPIFFS files.
#
# Usage:
#   .\deploy.ps1              # build + copy + upload filesystem
#   .\deploy.ps1 -SkipUpload  # build + copy only (no board needed)

param(
    [string]$FrontDir = (Join-Path $PSScriptRoot "..\front"),
    [switch]$SkipUpload
)

$ErrorActionPreference = "Stop"

# PlatformIO is not on PATH in this environment.
$pio = Join-Path $env:USERPROFILE ".platformio\penv\Scripts\pio.exe"
$dataDir = Join-Path $PSScriptRoot "data"

if (-not (Test-Path (Join-Path $FrontDir "package.json"))) {
    throw "No package.json found in $FrontDir"
}

# 1. Build the frontend.
Write-Host "== npm run build ($FrontDir) ==" -ForegroundColor Cyan
Push-Location $FrontDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed"
    }
} finally {
    Pop-Location
}

$distDir = Join-Path $FrontDir "dist"
if (-not (Test-Path $distDir)) {
    throw "Build finished but $distDir does not exist"
}

# 2. Replace the controller's data folder with the fresh build.
Write-Host "== Copying $distDir -> $dataDir ==" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
Get-ChildItem -LiteralPath $dataDir -Force | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $distDir "*") -Destination $dataDir -Recurse -Force

# 2.5. Report the data size against the SPIFFS partition.
# default.csv gives 1408 KB; partitions.csv (not applied yet) gives 2752 KB.
$dataSize = (Get-ChildItem -LiteralPath $dataDir -Recurse -Force |
    Measure-Object -Property Length -Sum).Sum
$dataSizeKb = [math]::Round($dataSize / 1KB)
Write-Host "== data/ is $dataSizeKb KB (SPIFFS: 1408 KB on default.csv) ==" -ForegroundColor Cyan
if ($dataSize -gt 1408KB) {
    Write-Host "WARNING: data/ exceeds the default.csv SPIFFS partition (1408 KB)" -ForegroundColor Yellow
}

# 2.6. SPIFFS file paths must fit into 32 bytes (mkspiffs limit:
# 31 visible chars + NUL). Fail fast with a clear message instead of
# letting mkspiffs abort mid-image.
$dataFiles = Get-ChildItem -LiteralPath $dataDir -Recurse -Force -File
foreach ($file in $dataFiles) {
    $spiffsPath = "/" + $file.FullName.Substring($dataDir.Length + 1).Replace("\", "/")
    if ($spiffsPath.Length -gt 31) {
        throw ("$($file.Name): SPIFFS path '$spiffsPath' is " +
            "$($spiffsPath.Length) chars, max is 31 (mkspiffs limit). Rename the file.")
    }
}

# 3. Upload the filesystem image to the controller.
if ($SkipUpload) {
    Write-Host "Skipping upload (-SkipUpload)" -ForegroundColor Yellow
} else {
    Write-Host "== pio run -t uploadfs ==" -ForegroundColor Cyan
    # PS 5.1: with $ErrorActionPreference=Stop a direct `& $pio ... 2>&1`
    # turns the first stderr line into a terminating NativeCommandError.
    # Merge the streams inside cmd instead.
    $uploadOutput = cmd /c "`"$pio`" run -t uploadfs 2>&1"
    $uploadOutput | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) {
        throw "uploadfs failed"
    }
    # PlatformIO can report SUCCESS while mkspiffs actually failed to fit
    # the files into the partition; double-check the log.
    if ($uploadOutput | Select-String -Pattern "SPIFFS_write error") {
        throw "uploadfs: files do not fit into the SPIFFS partition"
    }
}

Write-Host "Done." -ForegroundColor Green
