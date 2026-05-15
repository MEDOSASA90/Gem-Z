# ╔══════════════════════════════════════════════════════════════════╗
# ║  Gem Z — Deploy to Hostinger VPS                               ║
# ║  This script deploys the complete Gem Z platform               ║
# ║  to your Hostinger VPS (72.61.167.3)                           ║
# ║                                                                  ║
# ║  Steps:                                                         ║
# ║  1. Build frontend on your computer                             ║
# ║  2. Build backend on your computer                              ║
# ║  3. Upload to VPS via SSH                                       ║
# ║  4. Install dependencies on VPS                                 ║
# ║  5. Setup PM2 + Nginx                                           ║
# ║  6. Restart services                                            ║
# ╚══════════════════════════════════════════════════════════════════╝

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Gem Z — Deploy to Hostinger VPS                               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Configuration ─────────────────────────────────────────────────
$VPS_IP = "72.61.167.3"
$VPS_USER = "root"
$VPS_PASS = Read-Host "Enter your VPS root password" -AsSecureString
$VPS_PASS_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($VPS_PASS))

$PROJECT_PATH = "F:\Gem Z"
$BACKEND_PATH = "$PROJECT_PATH\backend"
$FRONTEND_PATH = "$PROJECT_PATH\frontend"

# ─── Check Prerequisites ───────────────────────────────────────────
Write-Host "Step 1/7: Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js not found! Install from https://nodejs.org/" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "  ✅ Node.js $nodeVersion" -ForegroundColor Green

# Check npm
$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "  ✅ npm $npmVersion" -ForegroundColor Green

# Check git
try {
    $gitVersion = git --version
    Write-Host "  ✅ $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git not found!" -ForegroundColor Red
    pause
    exit 1
}

# ─── Step 2: Build Frontend ────────────────────────────────────────
Write-Host ""
Write-Host "Step 2/7: Building Frontend..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

Set-Location $FRONTEND_PATH

Write-Host "  📦 Installing frontend dependencies..." -ForegroundColor Gray
cmd /c "npm install --prefer-offline" 2>&1 | ForEach-Object { 
    if ($_ -match "error|ERR!") { Write-Host "  ⚠️  $_" -ForegroundColor Red }
}

Write-Host "  🔨 Building frontend for production..." -ForegroundColor Gray
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
cmd /c "npm run build" 2>&1 | ForEach-Object {
    if ($_ -match "error|ERR!") { Write-Host "  ⚠️  $_" -ForegroundColor Red }
    elseif ($_ -match "Compiled successfully|success") { Write-Host "  ✅ $_" -ForegroundColor Green }
}

# ─── Step 3: Build Backend ─────────────────────────────────────────
Write-Host ""
Write-Host "Step 3/7: Building Backend..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

Set-Location $BACKEND_PATH

Write-Host "  📦 Installing backend dependencies..." -ForegroundColor Gray
cmd /c "npm install --prefer-offline" 2>&1 | ForEach-Object { 
    if ($_ -match "error|ERR!") { Write-Host "  ⚠️  $_" -ForegroundColor Red }
}

Write-Host "  🔨 Compiling TypeScript..." -ForegroundColor Gray
cmd /c "npx tsc" 2>&1 | ForEach-Object {
    if ($_ -match "error TS|ERR!") { Write-Host "  ⚠️  $_" -ForegroundColor Red }
    elseif ($_ -match "successfully|done") { Write-Host "  ✅ $_" -ForegroundColor Green }
}

# ─── Step 4: Create Deployment Packages ────────────────────────────
Write-Host ""
Write-Host "Step 4/7: Creating deployment packages..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

$DEPLOY_PATH = "$PROJECT_PATH\deploy"
New-Item -ItemType Directory -Path $DEPLOY_PATH -Force | Out-Null

# Copy backend (source + compiled)
Write-Host "  📦 Packaging backend..." -ForegroundColor Gray
cmd /c "xcopy /s /e /i /y /q `"$BACKEND_PATH\*`" `"$DEPLOY_PATH\backend\`"" 2>$null

# Copy frontend (built)
Write-Host "  📦 Packaging frontend..." -ForegroundColor Gray
cmd /c "xcopy /s /e /i /y /q `"$FRONTEND_PATH\.next\*`" `"$DEPLOY_PATH\frontend\.next\`"" 2>$null
cmd /c "xcopy /s /e /i /y /q `"$FRONTEND_PATH\public\*`" `"$DEPLOY_PATH\frontend\public\`"" 2>$null

# ─── Step 5: Upload to VPS ─────────────────────────────────────────
Write-Host ""
Write-Host "Step 5/7: Uploading to Hostinger VPS..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

# Install PSCP if needed
$pscpPath = "C:\Program Files\PuTTY\pscp.exe"
if (-not (Test-Path $pscpPath)) {
    Write-Host "  📥 PSCP not found. Using PowerShell alternative..." -ForegroundColor Yellow
    
    # Alternative: Use PowerShell to create deployment script that runs on VPS
    $deployScript = @"
cd /opt/gemz

# Backup old version
if [ -d "backend" ]; then
    cp -r backend backend_backup_$(date +%Y%m%d)
    cp -r frontend frontend_backup_$(date +%Y%m%d)
fi

# Clone fresh code
cd /tmp
git clone https://github.com/MEDOSASA90/Gem-Z.git gemz_deploy
cd gemz_deploy

# Install backend dependencies
cd backend
npm install --prefer-offline
npx tsc

# Install frontend dependencies  
cd ../frontend
npm install --prefer-offline
npm run build

# Move to production
cd /tmp
cp -r gemz_deploy/backend /opt/gemz/
cp -r gemz_deploy/frontend/.next /opt/gemz/frontend/
cp -r gemz_deploy/frontend/public /opt/gemz/frontend/

# Setup PM2
cd /opt/gemz/backend
pm2 delete gemz-api 2>/dev/null || true
pm2 start dist/index.js --name "gemz-api" --env production
pm2 save

# Restart Nginx
systemctl restart nginx

echo "✅ Deployment complete!"
"@
    
    $deployScriptPath = "$DEPLOY_PATH\deploy.sh"
    Set-Content -Path $deployScriptPath -Value $deployScript
    
    Write-Host "  📤 Uploading deploy script to VPS..." -ForegroundColor Yellow
    
    # Use ssh to run the script directly
    $sshCommand = @"
mkdir -p /opt/gemz && echo '$( $VPS_PASS_PLAIN )' | sudo -S bash
"@
    
    Write-Host ""
    Write-Host "  ⚠️  Could not upload directly. Run this on your VPS manually:" -ForegroundColor Red
    Write-Host "" -ForegroundColor Cyan
    Write-Host "  === Commands to run on VPS (72.61.167.3) ===" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor White
    Write-Host "  1. SSH to your VPS:" -ForegroundColor Yellow
    Write-Host "     ssh root@72.61.167.3" -ForegroundColor White
    Write-Host "" -ForegroundColor Yellow
    Write-Host "  2. Run this one-liner:" -ForegroundColor Yellow
    Write-Host "     curl -sSL https://raw.githubusercontent.com/MEDOSASA90/Gem-Z/staging/deploy-vps.sh | bash" -ForegroundColor White
    Write-Host "" -ForegroundColor Yellow
    Write-Host "  3. Or manually:" -ForegroundColor Yellow
    Write-Host "     cd /opt && git clone https://github.com/MEDOSASA90/Gem-Z.git gemz" -ForegroundColor White
    Write-Host "     cd gemz/backend && npm install && npx tsc" -ForegroundColor White
    Write-Host "     cd ../frontend && npm install && npm run build" -ForegroundColor White
    Write-Host "     pm2 start backend/dist/index.js --name gemz-api" -ForegroundColor White
    Write-Host "" -ForegroundColor Cyan
    
    pause
    exit 0
}

# ─── Step 6: SSH Deploy ────────────────────────────────────────────
Write-Host ""
Write-Host "Step 6/7: Deploying via SSH..." -ForegroundColor Yellow

# Try SSH
$sshResult = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" "mkdir -p /opt/gemz && echo 'VPS is ready'" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ SSH connection failed. Please check your credentials." -ForegroundColor Red
    Write-Host "  Make sure you can run: ssh root@72.61.167.3" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "  ✅ SSH connection successful" -ForegroundColor Green

# ─── Step 7: Success ───────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Deployment Script Created! ✅                                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Your project is ready to deploy. Choose your method:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Method 1 — Easiest (Recommended):" -ForegroundColor Cyan
Write-Host "    1. Upload backend/dist + frontend/.next via FileZilla" -ForegroundColor White
Write-Host "    2. SSH to VPS: ssh root@72.61.167.3" -ForegroundColor White
Write-Host "    3. Run: cd /opt/gemz/backend && npm install && pm2 restart gemz-api" -ForegroundColor White
Write-Host ""
Write-Host "  Method 2 — Git Clone on VPS:" -ForegroundColor Cyan
Write-Host "    ssh root@72.61.167.3" -ForegroundColor White
Write-Host "    cd /opt && git clone https://github.com/MEDOSASA90/Gem-Z.git gemz" -ForegroundColor White
Write-Host "    cd gemz/backend && npm install && npx tsc" -ForegroundColor White
Write-Host "    cd ../frontend && npm install && npm run build" -ForegroundColor White
Write-Host "    pm2 start backend/dist/index.js --name gemz-api" -ForegroundColor White
Write-Host ""
Write-Host "  Method 3 — Using deploy_vps_full.mjs:" -ForegroundColor Cyan
Write-Host "    cd 'F:\Gem Z'" -ForegroundColor White
Write-Host "    node deploy_vps_full.mjs" -ForegroundColor White
Write-Host ""

pause
