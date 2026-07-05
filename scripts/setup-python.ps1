# Setup Python for MangoBox
# Run this script to prepare embedded Python

$pythonDir = ".\resources\python"

Write-Host "=== MangoBox Python Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed on system
$pythonPath = Get-Command python -ErrorAction SilentlyContinue
if ($pythonPath) {
    Write-Host "✓ Python found: $($pythonPath.Source)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installing required packages..." -ForegroundColor Yellow

    # Install required packages
    pip install requests lxml beautifulsoup4

    Write-Host ""
    Write-Host "✓ Python packages installed" -ForegroundColor Green
} else {
    Write-Host "✗ Python not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host "2. Or use winget:" -ForegroundColor White
    Write-Host "   winget install Python.Python.3.11" -ForegroundColor White
    Write-Host ""
    Write-Host "Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
