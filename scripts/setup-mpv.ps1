# Setup mpv for MangoBox
# Run this script to download mpv portable version

$mpvDir = ".\resources\mpv"
$url = "https://github.com/shinchiro/mpv-winbuild-cmake/releases/latest"

Write-Host "=== MangoBox mpv Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please download mpv manually:" -ForegroundColor Yellow
Write-Host "1. Visit: $url" -ForegroundColor White
Write-Host "2. Download the latest mpv-x86_64-v3-*.7z file" -ForegroundColor White
Write-Host "3. Extract mpv.exe to: $mpvDir" -ForegroundColor White
Write-Host ""
Write-Host "Or use winget to install mpv:" -ForegroundColor Yellow
Write-Host "  winget install mpv" -ForegroundColor White
Write-Host ""

# Check if mpv is already installed
if (Test-Path "$mpvDir\mpv.exe") {
    Write-Host "✓ mpv found at $mpvDir\mpv.exe" -ForegroundColor Green
} else {
    Write-Host "✗ mpv not found. Please download it manually." -ForegroundColor Red
}
