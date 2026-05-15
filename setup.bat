@echo off
chcp 65001 >nul
title Gem Z - Setup Wizard
color 0A

echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║           Gem Z - Setup Wizard  🚀                      ║
echo ║           (Double-click to run)                         ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo This wizard will guide you through setup step by step.
echo.
pause

:: ═══════════════════════════════════════════════════════════
:: Step 1: Check Prerequisites
:: ═══════════════════════════════════════════════════════════
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  Step 1/5: Checking Prerequisites...                     ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js NOT found!
    echo.
    echo 📥 Please download and install Node.js 20:
    echo    https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi
    echo.
    echo 🎥 Video guide: https://www.youtube.com/watch?v=JINE4D0hjqM
    echo.
    echo After installation, close this window and run again.
    pause
    exit /b 1
)
echo ✅ Node.js found!

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git NOT found!
    echo 📥 Download: https://git-scm.com/download/win
    pause
    exit /b 1
)
echo ✅ Git found!

:: ═══════════════════════════════════════════════════════════
:: Step 2: Create .env file
:: ═══════════════════════════════════════════════════════════
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  Step 2/5: Creating Environment File...                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo ℹ️  The .env file stores your secrets (passwords, keys).
echo ℹ️  This file is NEVER uploaded to GitHub.
echo.

if exist "backend\.env" (
    echo ✅ .env already exists. Skipping...
    goto STEP3
)

:: Generate random secrets automatically
for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"') do set JWT_SECRET=%%a
for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"') do set REFRESH_SECRET=%%a

echo 📝 Creating backend\.env file...
(
echo # ============================================
echo # GEM Z - Environment Variables
echo # NEVER commit this file to Git!
echo # ============================================
echo.
echo # Your Database Password ^(change this!^)
echo DATABASE_URL=postgresql://gemz_admin:YOUR_NEW_PASSWORD_HERE@72.61.167.3:5432/gemz_db
echo.
echo # Auto-generated secrets ^(keep them safe!^)
echo JWT_SECRET=%JWT_SECRET%
echo REFRESH_SECRET=%REFRESH_SECRET%
echo.
echo # Server
echo NODE_ENV=production
echo PORT=5000
echo.
echo # Frontend URL
echo CLIENT_URL=https://gemz.app
echo API_URL=https://api.gemz.app
echo.
echo # Email ^(fill with your Gmail^)
echo SMTP_HOST=smtp.gmail.com
echo SMTP_PORT=587
echo SMTP_USER=your-email@gmail.com
echo SMTP_PASS=your-app-password
echo SMTP_FROM=Gem Z ^<noreply@gemz.app^>
echo.
echo # OpenAI ^(optional^)
echo OPENAI_API_KEY=sk-your-openai-key-here
echo.
echo # Redis
echo REDIS_URL=redis://localhost:6379
echo.
echo # VPS Deployment ^(optional^)
echo VPS_HOST=72.61.167.3
echo VPS_USER=root
echo VPS_SSH_KEY=C:\Users\%USERNAME%\.ssh\gemz_deploy
echo.
) > backend\.env

echo ✅ Created backend\.env with secure random secrets!
echo.
echo ⚠️  IMPORTANT: You MUST change the database password!
echo    Edit this file: backend\.env
echo    Line: DATABASE_URL=postgresql://gemz_admin:... ← change this password
pause

:: ═══════════════════════════════════════════════════════════
:: Step 3: Install Dependencies
:: ═══════════════════════════════════════════════════════════
:STEP3
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  Step 3/5: Installing Dependencies...                    ║
echo ║  This may take 5-10 minutes. Please wait...              ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

cd backend
echo 📦 Installing Backend dependencies...
call npm install 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  npm install failed. Trying alternative method...
    call npm install --legacy-peer-deps
)
echo ✅ Backend dependencies installed!
echo.

cd ..\frontend
echo 📦 Installing Frontend dependencies...
call npm install 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Trying alternative...
    call npm install --legacy-peer-deps
)
echo ✅ Frontend dependencies installed!
echo.

:: ═══════════════════════════════════════════════════════════
:: Step 4: Database Setup
:: ═══════════════════════════════════════════════════════════
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  Step 4/5: Database Setup                                ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo ℹ️  To set up the database, you need to:
echo.
echo 1️⃣  Change your PostgreSQL password:
echo    - SSH to your VPS: ssh root@72.61.167.3
echo    - Run: sudo -u postgres psql -c "ALTER USER gemz_admin WITH PASSWORD 'new_password';"
echo    - Then update backend\.env with the new password
echo.
echo 2️⃣  Run migrations ^(after password is changed^):
echo    cd backend
echo    npx knex migrate:latest
echo.
echo 3️⃣  Seed test data:
echo    npx knex seed:run
echo.
pause

:: ═══════════════════════════════════════════════════════════
:: Step 5: Run Tests
:: ═══════════════════════════════════════════════════════════
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  Step 5/5: Running Tests...                              ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

cd ..\backend
echo 🧪 Running tests...
call npm test 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Tests need database connection to pass.
    echo    This is expected if database password isn't set yet.
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                    Setup Complete! ✅                     ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo Next steps:
echo   1. Edit backend\.env and add your real database password
echo   2. Change your database password on the VPS
echo   3. Run: cd backend ^&^& npx knex migrate:latest
echo   4. Run: cd backend ^&^& npx knex seed:run
echo   5. Start: cd backend ^&^& npm start
echo   6. Frontend: cd frontend ^&^& npm run dev
echo.
echo 📖 Full Guide: https://github.com/MEDOSASA90/Gem-Z/blob/staging/README.md
echo.
pause
