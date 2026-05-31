# GEM Z - Global Fitness Operating System
## Version 5.0 - Enterprise

---

## نظرة عامة

GEM Z هو نظام تشغيل عالمي للياقة البدنية مبني كـ **Modular Monolith** باستخدام NestJS + TypeScript.
النظام يخدم ملايين المستخدمين عبر دول متعددة مع دعم متعدد العملات، ذكاء اصطناعي، ونظام لياقة متكامل يشمل إدارة الجيمات، متجر إلكتروني، شبكة اجتماعية، واقتصاد المحتوى.

### المميزات الرئيسية

| الميزة | الوصف |
|--------|-------|
| 🔐 نظام الهوية | مصادقة متعددة (JWT, MFA, Biometric)، RBAC مع 8 أدوار و23 صلاحية |
| 🏋️ إدارة الجيمات | نظام SaaS كامل للجيمات مع الفروع، العضويات، والامتياز |
| 📅 محرك الحجوزات | Slots ديناميكية، Waitlists، QR Check-in، منع الحجز المزدوج |
| 💰 محافظ متعددة العملات | EGP, SAR, USD, EUR مع دفتر محاسبة مزدوج |
| 🛒 متجر إلكتروني | منتجات فيزيائية ورقمية وخدمات مع إدارة طلبات كاملة |
| 🤖 ذكاء اصطناعي | مدرب AI، كشف احتيال، توصيات مخصصة |
| 🎮 نظام تحفيزي | GEM Points، تحديات، كاش باك |
| 🏢 لوحات تحكم متعددة | User, Gym Owner, Trainer, Admin, Finance, Fraud Ops |
| 🌍 دعم متعدد الدول | مصري، سعودي، أمريكي، أوروبي مع compliance إقليمي |
| 🔒 أمان enterprise | MFA، Device Fingerprinting، Fraud Scoring، Rate Limiting |

---

## التقنيات المستخدمة

| Layer | Technology |
|-------|-----------|
| Backend Framework | NestJS 10.x + TypeScript (strict mode) |
| Primary Database | PostgreSQL 16 |
| Cache/Session/Queue | Redis 7 |
| Analytics Database | ClickHouse |
| Search Engine | Elasticsearch 8 |
| Message Broker | Redis Pub/Sub |
| Authentication | JWT + MFA + Device Fingerprinting |
| API Documentation | Swagger/OpenAPI 3.0 |
| Testing | Jest |
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx |

---

## هيكل المشروع

```
src/
├── main.ts                          # نقطة الدخول + Swagger + Middleware
├── app.module.ts                    # Root Module
│
├── config/                          # إعدادات التطبيق
│   ├── app.config.ts
│   ├── database.config.ts           # PostgreSQL + TypeORM
│   ├── redis.config.ts              # Redis + Pub/Sub
│   ├── elasticsearch.config.ts      # Elasticsearch
│   └── clickhouse.config.ts         # ClickHouse
│
├── common/                          # أدوات مشتركة
│   ├── decorators/                  # @CurrentUser, @Public, @RequirePermissions
│   ├── filters/                     # Exception Filters
│   ├── guards/                      # AuthGuard, PermissionGuard, RateLimitGuard
│   ├── interceptors/                # Logging, Transform, Cache, Timing
│   ├── middleware/                  # Logger, Security Headers, Correlation ID
│   ├── pipes/                       # Validation, ParseUUID
│   ├── dto/                         # Pagination, ApiResponse
│   ├── enums/                       # Currency, Status, ErrorCode, Action
│   ├── interfaces/                  # RequestWithUser, PaginatedResult, DeviceInfo
│   └── utils/                       # Hashing, Encryption, UUID, Date, Decimal, Mask
│
├── core/                            # الأنظمة الأساسية
│   ├── event-bus/                   # Redis Pub/Sub + ClickHouse Store
│   ├── orchestrator/                # Saga Pattern + Compensation
│   ├── audit/                       # Immutable Audit Logging
│   ├── security/                    # Device Fingerprint + Fraud AI + Rate Limit
│   └── health/                      # Health Checks (DB, Redis, ES, ClickHouse)
│
└── modules/                         # وحدات الأعمال
    ├── identity/                    # Auth + RBAC + KYC + Session + User
    ├── economy/                     # Wallet + FX + Escrow + Rewards
    ├── marketplace/                 # Product Catalog + Order Management + OMS
    ├── fitness/                     # Gym SaaS + Booking + Attendance + Nutrition
    ├── enterprise/                  # Employee + Ops Center + DLQ Monitor
    └── ai/                          # AI Coach + Fraud AI (future)
```

---

## البنية التحتية

### Docker Services

```bash
docker-compose up -d
```

| Service | Port | الوصف |
|---------|------|-------|
| API | 3000 | تطبيق NestJS |
| PostgreSQL | 5432 | قاعدة البيانات الرئيسية |
| Redis | 6379 | Cache, Sessions, Queues, Locks |
| ClickHouse | 8123 | Analytics |
| Elasticsearch | 9200 | Search |
| Nginx | 80/443 | Reverse Proxy |

### أدوات CLI

```bash
# تشغيل المigrations
npm run migration:run

# إنشاء migration جديد
npm run migration:generate -- src/migrations/NameHere

# تشغيل في development
npm run start:dev

# بناء للـ production
npm run build
npm run start:prod

# اختبار
npm run test
npm run test:cov
npm run test:e2e
```

---

## الوحدات (Modules)

### 1. 🔐 Identity Module

**مسار:** `src/modules/identity/`

#### Auth (`auth/`)
- تسجيل الدخول/الخروج مع JWT (15 دقيقة expiry) + Refresh Token (7 أيام)
- MFA: TOTP (Authenticator App) + SMS + Email
- Device Fingerprinting + Trusted Devices
- Brute Force Protection (5 محاولات → حظر 30 دقيقة)
- Password Reset via secure token

**API Endpoints:**
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/mfa/setup
POST /api/v1/auth/mfa/verify
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
```

#### RBAC (`rbac/`)
- 8 أدوار افتراضية: super_admin, finance_officer, kyc_reviewer, moderator, support_agent, regional_manager, operations_engineer, fraud_analyst
- 23 صلاحية في 5 فئات: Finance, KYC, Operations, Security, Content
- Region-based access control

**API Endpoints:**
```
GET    /api/v1/admin/roles
POST   /api/v1/admin/roles
PUT    /api/v1/admin/roles/:id
GET    /api/v1/admin/permissions
POST   /api/v1/admin/users/:id/roles
DELETE /api/v1/admin/users/:id/roles/:roleId
```

#### KYC (`kyc/`)
- 5 أنواع: User, Gym, Store, Trainer, Corporate
- OCR extraction + Face matching + Liveness detection
- Fraud scoring 0-100
- Auto-approval للـ scores المنخفضة

**API Endpoints:**
```
POST   /api/v1/kyc/submit
GET    /api/v1/kyc/status
POST   /api/v1/kyc/documents/upload
GET    /api/v1/admin/kyc/submissions
PUT    /api/v1/admin/kyc/submissions/:id/review
```

#### Session (`session/`)
- JWT + Redis dual validation
- Multi-device management
- Geo tracking
- Auto-expiry cleanup

---

### 2. 💰 Economy Module

**مسار:** `src/modules/economy/`

#### Wallet (`wallet/`)
- **محاسبة مزدوجة**: كل transaction تنشئ 2 ledger entries (debit + credit)
- **Redis Distributed Lock**: `lock:wallet:{walletId}`
- **Currencies**: EGP, SAR, USD, EUR
- **Wallet Types**: CONSUMER, MERCHANT, ESCROW, TREASURY
- **Snapshots**: كل 50 event
- **Decimal(18,4)**: لا floating point

**API Endpoints:**
```
POST   /api/v1/wallets                          # إنشاء محفظة
GET    /api/v1/wallets                           # قائمة المحافظ
GET    /api/v1/wallets/:id                       # تفاصيل المحفظة
GET    /api/v1/wallets/:id/balance               # الرصيد
GET    /api/v1/wallets/:id/transactions          # المعاملات
POST   /api/v1/wallets/:id/deposit               # إيداع
POST   /api/v1/wallets/:id/withdraw              # سحب
POST   /api/v1/wallets/transfer                  # تحويل
POST   /api/v1/admin/wallets/:id/freeze          # تجميد (admin)
POST   /api/v1/admin/wallets/:id/unfreeze        # فك التجميد (admin)
```

#### FX Engine (`fx/`)
- Cross-rate calculation
- Spread + Effective rate
- Conversion fees
- Rate caching في Redis

**API Endpoints:**
```
GET    /api/v1/fx/rates                          # كل الأسعار
GET    /api/v1/fx/rates/:from/:to                # سعر تحويل
POST   /api/v1/fx/convert                        # تحويل مبلغ
```

#### Escrow (`escrow/`)
- Hold funds for 14 days
- Auto-release after delivery window
- Refund support
- Dispute freezing

#### Rewards (`rewards/`)
- **GEM Points**: اكتسب من workouts, attendance, challenges, referrals
- **Cashback**: قواعد مخصصة حسب الفئة
- **Conversion**: Points → Wallet credit

**API Endpoints:**
```
GET    /api/v1/rewards/points/balance             # رصيد النقاط
POST   /api/v1/rewards/points/convert             # تحويل لمحفظة
GET    /api/v1/rewards/cashback/rules             # قواعد الكاش باك
GET    /api/v1/rewards/cashback/calculate         # حساب الكاش باك
```

---

### 3. 🛒 Marketplace Module

**مسار:** `src/modules/marketplace/`

#### Product Catalog (`product/`)
- 4 أنواع: PHYSICAL, DIGITAL, SERVICE, SUBSCRIPTION
- Hierarchical categories
- Elasticsearch search
- Inventory tracking
- SEO metadata

**API Endpoints:**
```
GET    /api/v1/products                           # قائمة المنتجات
POST   /api/v1/products                           # إضافة منتج
GET    /api/v1/products/:id                       # تفاصيل منتج
PUT    /api/v1/products/:id                       # تحديث منتج
DELETE /api/v1/products/:id                       # حذف منتج
GET    /api/v1/products/search                    # بحث
GET    /api/v1/categories                         # الفئات
```

#### Order Management (`order/`)
- **OMS Lifecycle**: CREATED → CONFIRMED → PACKED → SHIPPED → DELIVERED → ESCROW_RELEASED
- Escrow integration
- Auto-status transitions via Event Bus

**API Endpoints:**
```
POST   /api/v1/orders                             # إنشاء طلب
GET    /api/v1/orders                             # قائمة الطلبات
GET    /api/v1/orders/:id                         # تفاصيل طلب
PUT    /api/v1/orders/:id/status                  # تحديث الحالة
PUT    /api/v1/orders/:id/cancel                  # إلغاء
```

---

### 4. 🏋️ Fitness Module

**مسار:** `src/modules/fitness/`

#### Gym SaaS (`gym/`)
- Gym + Branches + Membership Plans + Memberships
- Franchise support
- Branch-level RBAC
- Analytics per gym

**API Endpoints:**
```
POST   /api/v1/gyms                               # إنشاء جيم
GET    /api/v1/gyms                               # قائمة الجيمات
GET    /api/v1/gyms/:id                           # تفاصيل جيم
PUT    /api/v1/gyms/:id                           # تحديث جيم
GET    /api/v1/gyms/:id/branches                  # الفروع
POST   /api/v1/gyms/:id/branches                  # إضافة فرع
GET    /api/v1/gyms/:id/plans                     # خطط العضوية
POST   /api/v1/gyms/:id/plans                     # إضافة خطة
GET    /api/v1/gyms/nearby                        # جيمات قريبة
```

#### Booking Engine (`booking/`)
- Dynamic slots with capacity management
- Redis lock: `lock:slot:{slotId}`
- Waitlist with auto-conversion
- Penalty for late cancellation
- Overbooking prevention

**API Endpoints:**
```
GET    /api/v1/slots                              # Slots متاحة
POST   /api/v1/slots/:id/book                    # حجز
GET    /api/v1/bookings                           # حجوزاتي
PUT    /api/v1/bookings/:id/cancel               # إلغاء
POST   /api/v1/bookings/:id/checkin              # Check-in
GET    /api/v1/bookings/upcoming                  # القادمة
```

#### Attendance (`attendance/`)
- QR Check-in (JWT-based, 5 min expiry)
- Manual + Biometric check-in
- Entry/Exit tracking
- Membership card generation

#### Nutrition (`nutrition/`)
- Meal plans
- Daily nutrition log
- Calorie/macro tracking

---

### 5. 🏢 Enterprise Module

**مسار:** `src/modules/enterprise/`

#### Employee (`employee/`)
- Employee records linked to users
- Departments hierarchy
- Permission + Region scoping
- MFA required for all employees

**API Endpoints:**
```
GET    /api/v1/admin/employees                    # الموظفين
POST   /api/v1/admin/employees                    # إضافة موظف
PUT    /api/v1/admin/employees/:id                # تحديث
PUT    /api/v1/admin/employees/:id/status         # تغيير الحالة
```

#### Operations Center (`ops/`)
- **DLQ Monitor**: Failed events replay + analytics
- **Escalation**: Multi-level issue escalation
- **Refund Approval**: Dual approval for > $500

**API Endpoints:**
```
GET    /api/v1/admin/audit-logs                   # Audit logs
GET    /api/v1/admin/dlq                          # Dead Letter Queue
POST   /api/v1/admin/dlq/:id/replay               # Replay event
GET    /api/v1/admin/fraud-alerts                 # Fraud alerts
PUT    /api/v1/admin/fraud-alerts/:id/resolve      # Resolve alert
GET    /api/v1/admin/analytics                    # Analytics
```

---

## الأنظمة الأساسية (Core)

### Event Bus (`src/core/event-bus/`)
- Redis Pub/Sub للـ real-time events
- 40+ event type مع typed payloads
- Event persistence في ClickHouse
- @OnEvent() decorator للـ subscription

### Orchestrator (`src/core/orchestrator/`)
- Saga Pattern لـ distributed transactions
- Compensation/Rollback support
- Builder pattern لإنشاء workflows
- Timeout + Retry policies

### Audit (`src/core/audit/`)
- Immutable logging لكل الـ HTTP requests
- Partitioned monthly في PostgreSQL
- Query by actor, resource, action, date range

### Security (`src/core/security/`)
- **Device Fingerprinting**: Generate + Validate trusted devices
- **Fraud Scoring**: Heuristic-based 0-100 score
  - >75 = BLOCK
  - >50 = CHALLENGE
  - <=50 = ALLOW
- **Rate Limiting**: Redis-based distributed rate limiting

---

## الأحداث (Events)

| Event | الوصف |
|-------|-------|
| UserRegistered | مستخدم جديد سجل |
| UserLoggedIn | مستخدم سجل دخول |
| WalletCreated | محفظة جديدة |
| WalletCredited | إيداع في محفظة |
| WalletDebited | سحب من محفظة |
| GymCreated | جيم جديد |
| GymApproved | جيم تمت الموافقة عليه |
| MembershipPurchased | اشتراك جديد |
| MembershipExpired | انتهاء اشتراك |
| BookingCreated | حجز جديد |
| BookingCancelled | إلغاء حجز |
| BookingCheckedIn | Check-in |
| OrderCreated | طلب جديد |
| OrderPaid | دفع طلب |
| OrderShipped | شحن طلب |
| OrderDelivered | توصيل طلب |
| EscrowReleased | تحرير الضمان |
| CashbackIssued | كاش باك |
| PointsEarned | كسب نقاط |
| FraudDetected | كشف احتيال |

---

## الأمان

### Authentication Flow
```
1. User submits credentials + device info
2. Validate credentials (bcrypt)
3. Check device fingerprint
4. If new device → MFA required
5. If fraud score > 50 → additional verification
6. Issue JWT (15 min) + Refresh Token (7 days)
7. Store session in Redis + PostgreSQL
```

### Authorization
- `@RequirePermissions('wallet:read', 'payout:approve')`
- `@RequireRoles('super_admin', 'finance_officer')`
- Region-based access: `@RequireRegions('EG', 'SA')`

### Rate Limiting
```
Auth endpoints:     5 req/min
General API:       100 req/min
Sensitive ops:      3 req/min
Admin operations:  30 req/min
```

---

## التشغيل

### المتطلبات
- Docker + Docker Compose
- Node.js 20+ (للتطوير المحلي)

### خطوات التشغيل

```bash
# 1. Clone the repository
git clone <repository-url>
cd gemz-os

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your secrets

# 3. Start infrastructure
docker-compose up -d postgres redis clickhouse elasticsearch

# 4. Run migrations
npm install
npm run migration:run

# 5. Seed data (optional)
npm run seed

# 6. Start application
npm run start:dev

# Or run everything with Docker
docker-compose up -d
```

### API Documentation

بعد التشغيل، افتح:
```
http://localhost:3000/api/docs
```

Swagger UI مع كل الـ endpoints documented.

---

## الاختبار

```bash
# Unit tests
npm run test

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

---

## المساهمة

1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Commit changes: `git commit -am "Add feature"`
4. Push: `git push origin feature/name`
5. Create Pull Request

### Coding Standards
- TypeScript strict mode
- كل module: controller, service, repository, entity, dto, tests
- Controllers لا تحتوي على DB logic
- Cross-module communication via Event Bus فقط
- لا SELECT *
- Soft deletes لكل الجداول
- Indexes على كل العلاقات

---

## الترخيص

Private - Enterprise License

---

## فريق GEM Z

Built with passion for fitness and technology.

**GEM Z - Not a normal fitness application. It's a Global Fitness Operating System.**
