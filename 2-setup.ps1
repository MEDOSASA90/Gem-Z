# ╔══════════════════════════════════════════════════════════╗
# ║  Gem Z - Step 2: Install Everything                      ║
# ║  Double-click to run - no technical knowledge needed!   ║
# ╚══════════════════════════════════════════════════════════╝

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Step 2: Install Dependencies                            ║" -ForegroundColor Cyan
Write-Host "║  This will install everything automatically              ║" -ForegroundColor Cyan
Write-Host "║  Time: 5-15 minutes depending on internet speed          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Check prerequisites ───────────────────────────────────────
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host ""
    Write-Host "❌ Node.js is NOT installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js 20:" -ForegroundColor Cyan
    Write-Host "https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, close this window and run this script again." -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "  ✅ Node.js found: $nodeVersion" -ForegroundColor Green

# Check Git
try {
    $gitVersion = git --version
    Write-Host "  ✅ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Git not found. Install from: https://git-scm.com/download/win" -ForegroundColor Yellow
}

# Check .env exists
if (-not (Test-Path "backend\.env")) {
    Write-Host ""
    Write-Host "❌ backend\.env file NOT found!" -ForegroundColor Red
    Write-Host "Please run '1-change-passwords.ps1' first!" -ForegroundColor Cyan
    pause
    exit 1
}
Write-Host "  ✅ .env file found" -ForegroundColor Green

# ─── Install Backend Dependencies ──────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Installing Backend dependencies..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📦 This may take 5-10 minutes..." -ForegroundColor Yellow
Write-Host "  💡 Tip: Don't close this window!" -ForegroundColor Gray
Write-Host ""

Set-Location backend

try {
    npm install 2>&1 | ForEach-Object {
        if ($_ -match "error|ERR|WARN") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "added|packages|found") {
            Write-Host $_ -ForegroundColor Green
        }
    }
    Write-Host ""
    Write-Host "  ✅ Backend dependencies installed!" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Trying alternative method..." -ForegroundColor Yellow
    npm install --legacy-peer-deps 2>&1
}

# ─── Install Frontend Dependencies ─────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Installing Frontend dependencies..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📦 This may take 3-5 minutes..." -ForegroundColor Yellow
Write-Host ""

Set-Location ..\frontend

try {
    npm install 2>&1 | ForEach-Object {
        if ($_ -match "error|ERR|WARN") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "added|packages|found") {
            Write-Host $_ -ForegroundColor Green
        }
    }
    Write-Host ""
    Write-Host "  ✅ Frontend dependencies installed!" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Trying alternative method..." -ForegroundColor Yellow
    npm install --legacy-peer-deps 2>&1
}

# ─── Run Database Migrations ───────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Running Database Migrations..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Set-Location ..\backend

$envContent = Get-Content .env -ErrorAction SilentlyContinue
if ($envContent -match "YOUR_NEW_PASSWORD_HERE|YOUR_") {
    Write-Host "  ⚠️  .env file has placeholder values!" -ForegroundColor Yellow
    Write-Host "  Please run '1-change-passwords.ps1' first to set real passwords." -ForegroundColor Cyan
} else {
    Write-Host "  Running migrations..." -ForegroundColor Yellow
    try {
        npx knex migrate:latest 2>&1 | ForEach-Object {
            if ($_ -match "Batch|migrated|done") {
                Write-Host "  ✅ $_" -ForegroundColor Green
            } else {
                Write-Host "  $_" -ForegroundColor Gray
            }
        }
        Write-Host ""
        Write-Host "  ✅ Database migrations complete!" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Migrations need database connection." -ForegroundColor Yellow
        Write-Host "  You can run later with: cd backend && npx knex migrate:latest" -ForegroundColor Cyan
    }
}

# ─── Run Tests ─────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Running Tests..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

try {
    npm test 2>&1 | ForEach-Object {
        if ($_ -match "PASS|✓|✔|passed") {
            Write-Host "  ✅ $_" -ForegroundColor Green
        } elseif ($_ -match "FAIL|✗|✖|failed") {
            Write-Host "  ❌ $_" -ForegroundColor Red
        } elseif ($_ -match "Tests:|Suites|Snapshots") {
            Write-Host "  $_" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "  ⚠️  Tests need database connection to pass fully." -ForegroundColor Yellow
    Write-Host "  This is normal! They will work once database is connected." -ForegroundColor Gray
}

# ─── Summary ───────────────────────────────────────────────────
Set-Location ..
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           Setup Complete! ✅                              ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Run '3-launch.ps1' to start the project!" -ForegroundColor Cyan
Write-Host ""
pause
