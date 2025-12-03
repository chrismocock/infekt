# Build Setup Verification Script
# Verifies that the environment is ready for EAS builds

Write-Host "=== EAS Build Setup Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check if .easignore exists
if (Test-Path ".easignore") {
    Write-Host "[OK] .easignore file exists" -ForegroundColor Green
} else {
    Write-Host "[WARNING] .easignore file not found" -ForegroundColor Yellow
}

# Check if eas-build.ps1 exists
if (Test-Path "eas-build.ps1") {
    Write-Host "[OK] eas-build.ps1 helper script exists" -ForegroundColor Green
} else {
    Write-Host "[ERROR] eas-build.ps1 not found" -ForegroundColor Red
}

# Check if eas.json exists
if (Test-Path "eas.json") {
    Write-Host "[OK] eas.json configuration exists" -ForegroundColor Green
} else {
    Write-Host "[ERROR] eas.json not found" -ForegroundColor Red
}

# Check current directory
$currentDir = Get-Location
Write-Host "[INFO] Current directory: $currentDir" -ForegroundColor Cyan

# Check if we're in the frontend directory
if ($currentDir.Name -eq "frontend" -or $currentDir.Path -like "*frontend") {
    Write-Host "[OK] Running from frontend directory" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Not in frontend directory. Please run from frontend/" -ForegroundColor Yellow
}

# Check for running Expo/Metro processes
$expoProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*expo*" -or $_.CommandLine -like "*metro*" }
if ($expoProcesses) {
    Write-Host "[WARNING] Expo/Metro processes may be running. Consider stopping them before building." -ForegroundColor Yellow
} else {
    Write-Host "[OK] No Expo/Metro processes detected" -ForegroundColor Green
}

# Check EAS CLI
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue
if ($easInstalled) {
    Write-Host "[OK] EAS CLI is installed" -ForegroundColor Green
} else {
    Write-Host "[ERROR] EAS CLI not found. Install with: npm install -g eas-cli" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Verification Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run a build, use:" -ForegroundColor Yellow
Write-Host "  .\eas-build.ps1 build --platform android" -ForegroundColor White
Write-Host "  .\eas-build.ps1 build --platform ios" -ForegroundColor White

