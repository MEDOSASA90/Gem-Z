# ╔══════════════════════════════════════════════════════════╗
# ║  Gem Z - Step 1: Change All Passwords                    ║
# ║  Just double-click this file to run!                    ║
# ╚══════════════════════════════════════════════════════════╝

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Step 1: Change All Passwords                            ║" -ForegroundColor Cyan
Write-Host "║  This script will help you change passwords securely     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Change PostgreSQL Password ──────────────────────
Write-Host "Step 1/3: Change PostgreSQL Database Password" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────"
Write-Host ""

$newDbPass = Read-Host "Enter NEW database password (minimum 12 characters)" -AsSecureString
$newDbPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($newDbPass))

if ($newDbPassPlain.Length -lt 12) {
    Write-Host "Password too short! Must be at least 12 characters." -ForegroundColor Red
    pause
    exit
}

Write-Host ""
Write-Host "Option A: Change password directly on VPS (requires SSH access)" -ForegroundColor Cyan
Write-Host "Option B: Save password to .env file only (change DB later)" -ForegroundColor Cyan
Write-Host ""
$choice = Read-Host "Choose A or B"

if ($choice -eq "A" -or $choice -eq "a") {
    Write-Host ""
    Write-Host "Connecting to VPS and changing password..." -ForegroundColor Green
    
    $sshUser = Read-Host "Enter SSH username (default: root)"
    if (-not $sshUser) { $sshUser = "root" }
    
    $sshHost = "72.61.167.3"
    $sqlCommand = "ALTER USER gemz_admin WITH PASSWORD '$newDbPassPlain';"
    
    Write-Host ""
    Write-Host "Running: ssh $sshUser@$sshHost \"sudo -u postgres psql -c \"$sqlCommand\"\"" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $result = ssh "$sshUser@$sshHost" "sudo -u postgres psql -c `"$sqlCommand`"" 2>&1
        Write-Host "Result: $result" -ForegroundColor Green
        Write-Host "✅ Database password changed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Could not connect via SSH. Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual command to run on VPS:" -ForegroundColor Yellow
        Write-Host "sudo -u postgres psql -c \"ALTER USER gemz_admin WITH PASSWORD '$newDbPassPlain';\"" -ForegroundColor White
    }
} else {
    Write-Host "Skipping direct database change. You'll need to do it manually later." -ForegroundColor Yellow
}

# ─── Step 2: Update .env file ────────────────────────────────
Write-Host ""
Write-Host "Step 2/3: Updating .env file with new password..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────"
Write-Host ""

$envPath = "backend\.env"

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    
    # Replace old password in DATABASE_URL
    $newDbUrl = "postgresql://gemz_admin:$newDbPassPlain@72.61.167.3:5432/gemz_db"
    $content = $content -replace "DATABASE_URL=.*", "DATABASE_URL=$newDbUrl"
    
    Set-Content $envPath $content -NoNewline
    Write-Host "✅ .env file updated with new password!" -ForegroundColor Green
} else {
    Write-Host "Creating new .env file..." -ForegroundColor Yellow
    
    # Generate random JWT secrets
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    $refreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    
    $envContent = @"
# ============================================
# GEM Z - Environment Variables
# NEVER commit this file to Git!
# ============================================

DATABASE_URL=postgresql://gemz_admin:$newDbPassPlain@72.61.167.3:5432/gemz_db

JWT_SECRET=$jwtSecret
REFRESH_SECRET=$refreshSecret

NODE_ENV=production
PORT=5000

CLIENT_URL=https://gemz.app
API_URL=https://api.gemz.app

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Gem Z <noreply@gemz.app>

OPENAI_API_KEY=sk-your-openai-key

REDIS_URL=redis://localhost:6379

VPS_HOST=72.61.167.3
VPS_USER=root
VPS_SSH_KEY=C:\Users\$env:USERNAME\.ssh\gemz_deploy
"@
    
    Set-Content $envPath $envContent
    Write-Host "✅ New .env file created with secure secrets!" -ForegroundColor Green
}

# ─── Step 3: Generate SSH Key (optional) ──────────────────────
Write-Host ""
Write-Host "Step 3/3: SSH Key Setup (Recommended)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────"
Write-Host ""

$sshChoice = Read-Host "Generate SSH key for secure deployment? (Y/N)"
if ($sshChoice -eq "Y" -or $sshChoice -eq "y") {
    $sshPath = "$env:USERPROFILE\.ssh\gemz_deploy"
    
    if (Test-Path "$sshPath.pub") {
        Write-Host "SSH key already exists at $sshPath" -ForegroundColor Green
    } else {
        Write-Host "Generating SSH key..." -ForegroundColor Yellow
        ssh-keygen -t ed25519 -f $sshPath -N '""' -C "gemz-deploy"
        Write-Host "✅ SSH key generated!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "To copy SSH key to VPS, run this command manually:" -ForegroundColor Cyan
    Write-Host "ssh-copy-id -i `"$sshPath.pub`" root@72.61.167.3" -ForegroundColor White
}

# ─── Summary ───────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           Passwords Updated Successfully! ✅              ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Run '2-setup.ps1' to install dependencies" -ForegroundColor Cyan
Write-Host ""
pause
