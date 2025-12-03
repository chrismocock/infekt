# EAS Build Helper Script
# Sets EAS_NO_VCS=1 to bypass Git requirement and runs EAS commands

$env:EAS_NO_VCS = "1"

# Run the EAS command with all arguments
if ($args.Count -gt 0) {
    # Find the eas-cli installation path
    # Try global npm modules directory first
    $npmGlobalPath = (npm root -g).Trim()
    $easCliPath = Join-Path $npmGlobalPath "eas-cli\bin\run"
    
    # If not found, try alternative location (npm bin directory)
    if (-not (Test-Path $easCliPath)) {
        $npmPath = (Get-Command npm -ErrorAction Stop).Source
        $npmDir = Split-Path $npmPath -Parent
        $easCliPath = Join-Path $npmDir "node_modules\eas-cli\bin\run"
    }
    
    if (Test-Path $easCliPath) {
        # Call node directly with eas-cli, bypassing the problematic eas.ps1 wrapper
        # This properly passes arguments as separate parameters
        & node $easCliPath $args
    } else {
        Write-Host "[ERROR] Could not find eas-cli installation. Please ensure eas-cli is installed globally." -ForegroundColor Red
        Write-Host "Install with: npm install -g eas-cli" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Usage: .\eas-build.ps1 [eas-command] [options]"
    Write-Host "Example: .\eas-build.ps1 build --platform android"
    Write-Host "Example: .\eas-build.ps1 build:configure"
    Write-Host "Example: .\eas-build.ps1 build:list"
}

