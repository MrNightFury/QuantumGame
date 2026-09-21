# Builds the controller firmware and uploads it to the connected board.
#
# Usage:
#   .\deployFirmware.ps1              # build + upload firmware
#   .\deployFirmware.ps1 -SkipUpload  # build only (no board needed)

param(
    [switch]$SkipUpload
)

$ErrorActionPreference = "Stop"

# PlatformIO is not on PATH in this environment.
$pio = Join-Path $env:USERPROFILE ".platformio\penv\Scripts\pio.exe"
$controllerDir = Join-Path $PSScriptRoot "controller"

if (-not (Test-Path (Join-Path $controllerDir "platformio.ini"))) {
    throw "No platformio.ini found in $controllerDir"
}

# 1. Build the firmware.
Write-Host "== pio run -d $controllerDir ==" -ForegroundColor Cyan
# PS 5.1: with $ErrorActionPreference=Stop a direct `& $pio ... 2>&1`
# turns the first stderr line into a terminating NativeCommandError.
# Merge the streams inside cmd instead.
$buildOutput = cmd /c "`"$pio`" run -d `"$controllerDir`" 2>&1"
$buildOutput | ForEach-Object { "$_" }
if ($LASTEXITCODE -ne 0) {
    throw "pio run failed"
}

# 2. Upload the firmware to the connected controller.
if ($SkipUpload) {
    Write-Host "Skipping upload (-SkipUpload)" -ForegroundColor Yellow
} else {
    Write-Host "== pio run -d $controllerDir -t upload ==" -ForegroundColor Cyan
    $uploadOutput = cmd /c "`"$pio`" run -d `"$controllerDir`" -t upload 2>&1"
    $uploadOutput | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) {
        throw "upload failed"
    }
}

Write-Host "Done." -ForegroundColor Green