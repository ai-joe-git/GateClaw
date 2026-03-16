# GateClaw Installer for Windows PowerShell
# Version: 0.2.0-beta

$VERSION = "0.2.0-beta"
$REPO = "ai-joe-git/GateClaw"
$BRANCH = "dev"

Write-Host "🐾 GateClaw Installer - Resident AI" -ForegroundColor Green
Write-Host "Version: $VERSION" -ForegroundColor Gray
Write-Host "Repo: https://github.com/$REPO" -ForegroundColor Gray
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as administrator. Some features may require admin rights." -ForegroundColor Yellow
}

# Check Bun
try {
    $bunVersion = bun --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Bun not found"
    }
    Write-Host "✅ Bun found: v$bunVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Bun not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Bun first:" -ForegroundColor Yellow
    Write-Host "  powershell -c "irm bun.sh/install.ps1|iex"" -ForegroundColor Cyan
    Write-Host ""
    $response = Read-Host "Continue anyway? [y/N]"
    if ($response -ne 'y' -and $response -ne 'Y') {
        exit 1
    }
}

# Set installation paths
$APPDATA = [Environment]::GetFolderPath("ApplicationData")
$INSTALL_DIR = Join-Path $APPDATA "gateclaw\bin"
$CONFIG_DIR = Join-Path $APPDATA "gateclaw"
$DATA_DIR = Join-Path $APPDATA "gateclaw"

Write-Host "📁 Installation paths:" -ForegroundColor Cyan
Write-Host "  Install: $INSTALL_DIR" -ForegroundColor Gray
Write-Host "  Config:  $CONFIG_DIR" -ForegroundColor Gray
Write-Host ""

# Create directories
try {
    New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
    New-Item -ItemType Directory -Force -Path $CONFIG_DIR | Out-Null
    New-Item -ItemType Directory -Force -Path $DATA_DIR | Out-Null
    Write-Host "✅ Directories created" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create directories: $_" -ForegroundColor Red
    exit 1
}

# Clone repository
Write-Host "📦 Cloning GateClaw repository..." -ForegroundColor Cyan
$GATECLAW_DIR = Join-Path $INSTALL_DIR "..\gateclaw-src"

if (Test-Path (Join-Path $GATECLAW_DIR ".git")) {
    Write-Host "⚠️  Repository already exists, updating..." -ForegroundColor Yellow
    Set-Location $GATECLAW_DIR
    git pull origin $BRANCH 2>&1 | Out-Null
} else {
    git clone --depth 1 --branch $BRANCH "https://github.com/$REPO.git" $GATECLAW_DIR 2>&1 | Out-Null
}

if (-not $?) {
    Write-Host "❌ Failed to clone repository" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Repository ready" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
Set-Location (Join-Path $GATECLAW_DIR "packages\gateclaw-orchestrator")
bun install 2>&1 | Out-Null

if (-not $?) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Create launcher script
Write-Host "🚀 Creating launcher..." -ForegroundColor Cyan
$LAUNCHER = @"
@echo off
setlocal
set "GATECLAW_ROOT=%~dp0..\gateclaw-src"
cd /d "%GATECLAW_ROOT%\packages\gateclaw-orchestrator"
bun run bin/gateclaw.ts %*
"@

$LAUNCHER_PATH = Join-Path $INSTALL_DIR "gateclaw.cmd"
$LAUNCHER | Out-File -FilePath $LAUNCHER_PATH -Encoding ASCII -NoNewline

Write-Host "✅ Launcher created: $LAUNCHER_PATH" -ForegroundColor Green

# Add to PATH (user-level)
Write-Host " Adding to PATH..." -ForegroundColor Cyan
try {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$INSTALL_DIR*") {
        $newPath = "$userPath;$INSTALL_DIR"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "✅ Added to user PATH" -ForegroundColor Green
        Write-Host "⚠️  Restart your terminal or run: `$env:Path += `";$INSTALL_DIR`"" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Already in PATH" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not modify PATH automatically" -ForegroundColor Yellow
    Write-Host "   Please add manually: $INSTALL_DIR" -ForegroundColor Gray
}

# Check if config exists
$CONFIG_FILE = Join-Path $CONFIG_DIR "gateclaw.jsonc"
$ENV_FILE = Join-Path $CONFIG_DIR ".env"

Write-Host ""
Write-Host "🎉 Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart your terminal or run: `$env:Path += `";$INSTALL_DIR`"" -ForegroundColor White
Write-Host "  2. Run: gateclaw" -ForegroundColor White
Write-Host "  3. Setup AI provider: gateclaw providers add" -ForegroundColor White
Write-Host "  4. Setup Telegram bot: gateclaw telegram setup" -ForegroundColor White
Write-Host ""
Write-Host "Quick commands:" -ForegroundColor Cyan
Write-Host "  gateclaw start        - Start daemon" -ForegroundColor Gray
Write-Host "  gateclaw status       - Check status" -ForegroundColor Gray
Write-Host "  gateclaw tui          - Launch TUI" -ForegroundColor Gray
Write-Host "  gateclaw web          - Open web UI" -ForegroundColor Gray
Write-Host "  gateclaw logs         - View logs" -ForegroundColor Gray
Write-Host ""

# Offer to open terminal with updated PATH
$response = Read-Host "Open new terminal window now? [y/N]"
if ($response -eq 'y' -or $response -eq 'Y') {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:Path += `";$INSTALL_DIR`"; Write-Host 'GateClaw ready!' -ForegroundColor Green; gateclaw --help"
}
