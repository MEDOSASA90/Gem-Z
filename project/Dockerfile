# ==========================================
# GEM Z - Multi-Stage Dockerfile
# NestJS 10.x + TypeScript Strict Mode
# ==========================================

# ------------------------------------------
# Stage 1: Dependencies
# ------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# تثبيت dependencies النظامية المطلوبة
RUN apk add --no-cache libc6-compat python3 make g++

# نسخ package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ------------------------------------------
# Stage 2: Builder
# ------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# نسخ dependencies المُثبتة
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# بناء التطبيق
RUN npm run build

# ------------------------------------------
# Stage 3: Production
# ------------------------------------------
FROM node:20-alpine AS production
WORKDIR /app

# إنشاء مستخدم غير root لأمان أفضل
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# نسخ package.json فقط للإشارة إلى الـ metadata
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# تغيير ملكية المجلد
RUN chown -R nestjs:nodejs /app
USER nestjs

# متغيرات البيئة
ENV NODE_ENV=production
ENV PORT=3000

# فتح المنفذ
EXPOSE 3000

# أمر التشغيل
CMD ["node", "dist/main"]

# ------------------------------------------
# Stage 4: Development (optional)
# ------------------------------------------
FROM node:20-alpine AS development
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
