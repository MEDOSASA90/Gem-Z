# ╔══════════════════════════════════════════════════════════╗
# ║  Gem Z - Step 3: Launch the Project!                     ║
# ║  Double-click to run the platform!                       ║
# ╚══════════════════════════════════════════════════════════╝

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Step 3: Launch Gem Z! 🚀                                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Menu ──────────────────────────────────────────────────────
Write-Host "What do you want to do?" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1️⃣  Start Backend (API Server)" -ForegroundColor White
Write-Host "  2️⃣  Start Frontend (Web App)" -ForegroundColor White
Write-Host "  3️⃣  Start Both (in separate windows)" -ForegroundColor White
Write-Host "  4️⃣  Start with Docker (Recommended for Production)" -ForegroundColor Green
Write-Host "  5️⃣  Deploy to VPS" -ForegroundColor Cyan
Write-Host "  6️⃣  Open API Documentation" -ForegroundColor Magenta
Write-Host ""
$choice = Read-Host "Enter 1, 2, 3, 4, 5, or 6"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green
        Write-Host "   API will be available at: http://localhost:5000" -ForegroundColor Cyan
        Write-Host "   API Docs: http://localhost:5000/api-docs" -ForegroundColor Cyan
        Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
        Write-Host ""
        Set-Location backend
        npm start
    }
    "2" {
        Write-Host ""
        Write-Host "🚀 Starting Frontend Development Server..." -ForegroundColor Green
        Write-Host "   App will be available at: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
        Write-Host ""
        Set-Location frontend
        npm run dev
    }
    "3" {
        Write-Host ""
        Write-Host "🚀 Starting Backend + Frontend in separate windows..." -ForegroundColor Green
        Write-Host ""
        
        # Start Backend in new window
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Backend...' -ForegroundColor Green; Set-Location '$PWD\backend'; npm start"
        
        Start-Sleep -Seconds 3
        
        # Start Frontend in new window
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Frontend...' -ForegroundColor Green; Set-Location '$PWD\frontend'; npm run dev"
        
        Write-Host ""
        Write-Host "  ✅ Both servers started in separate windows!" -ForegroundColor Green
        Write-Host "  Backend: http://localhost:5000" -ForegroundColor Cyan
        Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "  API Docs: http://localhost:5000/api-docs" -ForegroundColor Cyan
        Write-Host ""
        pause
    }
    "4" {
        Write-Host ""
        Write-Host "🐳 Starting with Docker..." -ForegroundColor Green
        Write-Host ""
        
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Host "❌ Docker is not installed!" -ForegroundColor Red
            Write-Host "   Download: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Cyan
            pause
            exit 1
        }
        
        Write-Host "  Building Docker containers..." -ForegroundColor Yellow
        Write-Host "  This may take 10-20 minutes first time..." -ForegroundColor Yellow
        Write-Host ""
        
        docker compose -f docker-compose.yml up --build -d 2>&1
        
        Write-Host ""
        Write-Host "  ✅ Docker containers started!" -ForegroundColor Green
        Write-Host "  Backend: http://localhost:5000" -ForegroundColor Cyan
        Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor Cyan
        Write-Host "  Redis: localhost:6379" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  To stop: docker compose -f docker-compose.yml down" -ForegroundColor Gray
        Write-Host ""
        pause
    }
    "5" {
        Write-Host ""
        Write-Host "📤 Deploy to VPS" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Choose deployment method:" -ForegroundColor Yellow
        Write-Host "  1. Full deployment (backend + database + restart)" -ForegroundColor White
        Write-Host "  2. Backend only" -ForegroundColor White
        Write-Host ""
        $deployChoice = Read-Host "Enter 1 or 2"
        
        if ($deployChoice -eq "1") {
            Write-Host ""
            Write-Host "🚀 Starting full deployment..." -ForegroundColor Green
            node deploy_vps_full.mjs
        } else {
            Write-Host ""
            Write-Host "🚀 Deploying backend only..." -ForegroundColor Green
            node deploy_backend_vps.mjs
        }
        
        Write-Host ""
        pause
    }
    "6" {
        Write-Host ""
        Write-Host "📖 Opening API Documentation..." -ForegroundColor Magenta
        Start-Process "http://localhost:5000/api-docs"
        Write-Host "  ✅ Opened in browser!" -ForegroundColor Green
        Write-Host ""
        pause
    }
    default {
        Write-Host ""
        Write-Host "❌ Invalid choice. Please run the script again." -ForegroundColor Red
        pause
    }
}
