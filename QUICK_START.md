# Gem Z — Quick Start Guide

## ⚡ 3 خطوات بسيطة

### الخطوة 1: سحب التغييرات
```bash
cd "F:\Gem Z"
git pull origin staging
```

### الخطوة 2: نصب الـ packages
```bash
# Backend (ياخد 5-10 دقايق)
cd backend
npm install

# Frontend (ياخد 3-5 دقايق)
cd ..\frontend
npm install
```

### الخطوة 3: اختبر
```bash
# في الـ Backend
cd ..\backend
npm test

# تشغيل
npm start
```

## 📋 إيه اللي اتضاف في المشروع

### 🔒 أمان (Phase 1)
- ✅ `.env.example` — ملف template لكل secrets
- ✅ `config/validation.ts` — يتحقق من كل env vars
- ✅ `config/index.ts` — مصدر واحد للـ config
- ✅ Deploy scripts — شيلت كل passwords المكشوفة
- ✅ `.gitignore` — شامل (secrets + build + large files)

### 🐳 بنية تحتية (Phase 2)
- ✅ `Dockerfile.backend` — multi-stage build
- ✅ `Dockerfile.frontend` — Next.js standalone
- ✅ `docker-compose.yml` — dev (Postgres + Redis + Backend + Frontend)
- ✅ `docker-compose.prod.yml` — prod (Nginx + SSL + replicas)
- ✅ `Makefile` — 25+ أمر
- ✅ `core/redis/` — نظام cache (ioredis)
- ✅ `core/logging/` — Pino logger (JSON)
- ✅ `core/queue/` — BullMQ (7 أنواع jobs)
- ✅ `core/middlewares/security-headers.ts` — CSP + HSTS

### 🧪 اختبارات + API Docs (Phase 3)
- ✅ `jest.config.ts` — Jest + TypeScript
- ✅ `__tests__/unit/` — 80+ unit test
- ✅ `__tests__/integration/` — 50+ integration test
- ✅ `docs/swagger.ts` — 104 endpoint documented
- ✅ `docs/schemas/` — 15+ YAML schema
- ✅ `docs/paths/` — 20+ YAML path
- ✅ `core/errors/` — 11 error class + 29 error code
- ✅ `core/utils/` — Pagination + Transaction + Graceful shutdown
- ✅ `routes/health.ts` — 4 health endpoints

### ⚛️ Frontend (Phase 3)
- ✅ `components/ui/ErrorBoundary.tsx`
- ✅ `components/ui/LoadingSkeleton.tsx`
- ✅ `components/ui/Toast.tsx`
- ✅ `components/ui/ToastProvider.tsx`
- ✅ `hooks/useApiQuery.ts` — React Query
- ✅ `hooks/useForm.ts` — Zod validation
- ✅ `app/error.tsx` — Next.js error page
- ✅ `app/loading.tsx` — Next.js loading page

### 🚀 Scripts (Phase 4)
- ✅ `1-change-passwords.ps1` — يغير passwords
- ✅ `2-setup.ps1` — ينصب كل حاجة
- ✅ `3-launch.ps1` — يشغل المشروع
