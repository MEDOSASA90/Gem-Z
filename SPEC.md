# GEM Z - GLOBAL FITNESS OPERATING SYSTEM - SPECIFICATION
## Version 5.0 - Enterprise Specification

---

## 1. PROJECT OVERVIEW

GEM Z is a modular monolith enterprise fitness operating system built with NestJS + TypeScript.
It serves millions of users across multiple countries with multi-currency support, AI intelligence,
and a complete fitness ecosystem including gyms, marketplace, social features, and creator economy.

### Core Philosophy
- **Architecture**: Modular Monolith (NOT microservices)
- **Communication**: Event-driven via Redis Pub/Sub
- **Database**: PostgreSQL primary + Redis + ClickHouse + Elasticsearch
- **Every module**: reusable, event-driven, isolated, scalable, observable, documented, testable

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend Framework | NestJS 10.x + TypeScript (strict mode) |
| Primary Database | PostgreSQL 16 |
| Cache/Session/Queue | Redis 7 |
| Analytics Database | ClickHouse |
| Search Engine | Elasticsearch |
| Message Broker | Redis Pub/Sub (Event Bus) |
| Authentication | JWT + MFA + Device Fingerprinting |
| API Documentation | Swagger/OpenAPI |
| Testing | Jest |
| Containerization | Docker + Docker Compose |

---

## 3. PROJECT STRUCTURE

```
gemz-os/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── elasticsearch.config.ts
│   │   ├── clickhouse.config.ts
│   │   └── app.config.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── middleware/
│   │   ├── pipes/
│   │   ├── dto/
│   │   ├── enums/
│   │   ├── interfaces/
│   │   └── utils/
│   ├── core/
│   │   ├── event-bus/
│   │   ├── orchestrator/
│   │   ├── audit/
│   │   ├── security/
│   │   └── health/
│   ├── modules/
│   │   ├── identity/
│   │   ├── fitness/
│   │   ├── economy/
│   │   ├── marketplace/
│   │   ├── social/
│   │   ├── ai/
│   │   ├── saas/
│   │   └── enterprise/
│   └── shared/
│       ├── types/
│       ├── constants/
│       └── helpers/
├── migrations/
├── seeds/
├── test/
└── docs/
```

---

## 4. MODULE SPECIFICATIONS

### 4.1 CORE MODULES (Event Bus, Orchestrator, Audit, Security)

#### 4.1.1 Event Bus Module (`src/core/event-bus/`)
- **Purpose**: Central event-driven communication using Redis Pub/Sub
- **Files**:
  - `event-bus.module.ts` - NestJS module definition
  - `event-bus.service.ts` - Publish/subscribe logic
  - `event-bus.controller.ts` - Health check endpoint
  - `event.types.ts` - Event type definitions
  - `event.decorators.ts` - @OnEvent() decorator
  - `event.store.ts` - Event persistence (ClickHouse)
- **Key Classes**:
  - `EventBusService`: publish(event), subscribe(pattern, handler)
  - `EventEnvelope`: { event_id, correlation_id, actor_id, source_module, timestamp, device_metadata, fraud_metadata, payload }
- **Events**: UserRegistered, WalletDebited, CashbackIssued, GymCheckedIn, BookingCreated, OrderDispatched, KYCApproved, FraudDetected

#### 4.1.2 Orchestrator Module (`src/core/orchestrator/`)
- **Purpose**: Distributed saga workflows, rollback, retry management
- **Files**:
  - `orchestrator.module.ts`
  - `orchestrator.service.ts`
  - `saga.types.ts`
  - `saga.builder.ts`
  - `compensation.service.ts`
- **Key Classes**:
  - `GemZOrchestrator`: executeSaga(), rollback(), retry()
  - `SagaBuilder`: step(), compensation(), retryPolicy()

#### 4.1.3 Audit Module (`src/core/audit/`)
- **Purpose**: Immutable audit logging for all actions
- **Files**:
  - `audit.module.ts`
  - `audit.service.ts`
  - `audit.entity.ts`
  - `audit.repository.ts`
- **Key Classes**:
  - `AuditService`: log(action, actor, resource, changes), query(filters)
- **Entity**: AuditLog { id, action, actor_id, actor_type, resource_type, resource_id, changes, ip_address, user_agent, timestamp, risk_score }

#### 4.1.4 Security Module (`src/core/security/`)
- **Purpose**: Device fingerprinting, fraud scoring, rate limiting
- **Files**:
  - `security.module.ts`
  - `device.service.ts`
  - `fraud.service.ts`
  - `rate-limit.service.ts`
  - `security.types.ts`
- **Key Classes**:
  - `DeviceService`: fingerprint(deviceInfo), validate(deviceId)
  - `FraudService`: score(event), checkThreshold(score), signals
  - `RateLimitService`: check(key, limit, window)

---

### 4.2 IDENTITY MODULE (`src/modules/identity/`)

#### Purpose
Authentication, Authorization, KYC, Session Management, RBAC

#### Sub-modules

##### 4.2.1 Auth Sub-module (`identity/auth/`)
**Files:**
- `auth.module.ts`, `auth.service.ts`, `auth.controller.ts`
- `auth.dto.ts`, `auth.guard.ts`, `auth.decorator.ts`
- `jwt.strategy.ts`, `refresh.strategy.ts`
- `mfa.service.ts`, `mfa.controller.ts`

**DTOs:**
```typescript
// Login
class LoginDto { email: string; password: string; deviceInfo: DeviceInfoDto; }
class LoginResponseDto { accessToken: string; refreshToken: string; user: UserProfileDto; mfaRequired: boolean; }

// Register
class RegisterDto { email: string; phone: string; password: string; firstName: string; lastName: string; country: string; }

// MFA
class MFAVerifyDto { code: string; method: 'sms' | 'email' | 'totp'; }
class MFASetupDto { method: 'sms' | 'email' | 'totp'; }

// Refresh
class RefreshTokenDto { refreshToken: string; }

// Device Info
class DeviceInfoDto { fingerprint: string; userAgent: string; ip: string; geo: GeoLocationDto; }
class GeoLocationDto { country: string; city: string; lat: number; lon: number; }
```

**Services:**
- `AuthService`: login(dto), register(dto), refresh(token), logout(deviceId), validateToken(token)
- `MFAService`: setup(userId, method), verify(userId, code), generateSecret(), sendCode(userId, method)

##### 4.2.2 RBAC Sub-module (`identity/rbac/`)
**Files:**
- `rbac.module.ts`, `rbac.service.ts`, `rbac.controller.ts`
- `role.entity.ts`, `permission.entity.ts`, `user-role.entity.ts`
- `rbac.dto.ts`, `rbac.guard.ts`, `rbac.decorator.ts`
- `role.repository.ts`, `permission.repository.ts`

**Entities:**
```typescript
// Role
class Role { id: UUID; name: string; slug: string; description: string; level: number; permissions: Permission[]; created_at; updated_at; deleted_at; }

// Permission
class Permission { id: UUID; scope: string; action: string; resource: string; description: string; category: PermissionCategory; }

// UserRole
class UserRole { id: UUID; user_id: UUID; role_id: UUID; assigned_by: UUID; scope_regions: string[]; expires_at: Date; }
```

**Permission Scopes:**
- Finance: wallet:read, wallet:reconcile, payout:approve, refund:approve
- KYC: kyc:review, kyc:escalate, kyc:override
- Operations: gym:approve, store:approve, logistics:manage
- Security: fraud:investigate, device:block, user:suspend
- Content: reels:moderate, creator:suspend, ads:approve

**Services:**
- `RBACService`: assignRole(userId, roleId, regions), checkPermission(userId, scope), getRoles(userId), revokeRole(userId, roleId)

##### 4.2.3 KYC Sub-module (`identity/kyc/`)
**Files:**
- `kyc.module.ts`, `kyc.service.ts`, `kyc.controller.ts`
- `kyc.entity.ts`, `kyc.dto.ts`, `kyc.repository.ts`
- `kyc.processor.ts` (OCR + Face matching)
- `document-validator.ts`

**KYC Types:** USER_KYC, GYM_KYC, STORE_KYC, TRAINER_KYC, CORPORATE_KYC

**Entity:**
```typescript
class KYCSubmission {
  id: UUID;
  user_id: UUID;
  type: KYCType;
  status: KYCStatus; // PENDING, APPROVED, REJECTED, ESCALATED
  documents: KYCDocument[];
  ocr_data: OCRResult;
  face_match_score: number;
  liveness_score: number;
  fraud_score: number;
  reviewed_by: UUID;
  review_notes: string;
  submitted_at: Date;
  reviewed_at: Date;
}
```

**Services:**
- `KYCService`: submit(userId, type, documents), review(kycId, decision, notes), checkStatus(userId), validateDocument(doc)
- `KYCProcessor`: extractOCR(document), matchFaces(doc1, doc2), detectLiveness(video), calculateFraudScore(submission)

##### 4.2.4 Session Sub-module (`identity/session/`)
**Files:**
- `session.module.ts`, `session.service.ts`, `session.entity.ts`
- `session.repository.ts`, `session.dto.ts`

**Entity:**
```typescript
class Session {
  id: UUID;
  user_id: UUID;
  device_fingerprint: string;
  ip_address: string;
  user_agent: string;
  geo_country: string;
  token_hash: string;
  refresh_token_hash: string;
  expires_at: Date;
  last_active_at: Date;
  is_active: boolean;
  mfa_verified: boolean;
}
```

**Services:**
- `SessionService`: create(userId, deviceInfo), validate(sessionId), revoke(sessionId), revokeAll(userId), listActive(userId)

---

### 4.3 ECONOMY MODULE (`src/modules/economy/`)

#### Purpose
Wallets, Multi-Currency, FX Engine, Treasury, Cashback, Rewards, Escrow, Payouts

##### 4.3.1 Wallet Sub-module (`economy/wallet/`)
**Files:**
- `wallet.module.ts`, `wallet.service.ts`, `wallet.controller.ts`
- `wallet.entity.ts`, `transaction.entity.ts`, `ledger-entry.entity.ts`
- `wallet.repository.ts`, `transaction.repository.ts`, `ledger.repository.ts`
- `wallet.dto.ts`, `wallet.validator.ts`

**Entities:**
```typescript
class Wallet {
  id: UUID;
  user_id: UUID;
  currency: Currency; // EGP, SAR, USD, EUR
  balance: Decimal;
  held_balance: Decimal; // escrow/frozen
  status: WalletStatus; // ACTIVE, FROZEN, SUSPENDED
  type: WalletType; // CONSUMER, MERCHANT, ESCROW, TREASURY
  snapshot_version: number;
  created_at; updated_at;
}

class Transaction {
  id: UUID;
  wallet_id: UUID;
  type: TransactionType; // DEBIT, CREDIT, TRANSFER, EXCHANGE, ESCROW_HOLD, ESCROW_RELEASE
  amount: Decimal;
  currency: Currency;
  description: string;
  reference_id: UUID;
  reference_type: string;
  balance_after: Decimal;
  status: TransactionStatus; // PENDING, COMPLETED, FAILED, REVERSED
  metadata: Record<string, any>;
  created_at;
}

class LedgerEntry {
  id: UUID;
  transaction_id: UUID;
  entry_type: 'DEBIT' | 'CREDIT';
  account: string; // wallet:{id}, escrow:{id}, revenue:{type}
  amount: Decimal;
  currency: Currency;
  description: string;
  created_at;
}
```

**Services:**
- `WalletService`: create(userId, currency), getBalance(walletId), deposit(walletId, amount), withdraw(walletId, amount), transfer(fromId, toId, amount), freeze(walletId), unfreeze(walletId)
- `TransactionService`: record(dto), getHistory(walletId, filters), reverse(transactionId), getByReference(refId, refType)
- `LedgerService`: postEntry(dto), reconcile(), getSnapshot(walletId)

**CRITICAL**: Every wallet operation uses Redis distributed lock: `lock:wallet:{walletId}`
**CRITICAL**: Double-entry ledger - every transaction creates 2 ledger entries (debit + credit)

##### 4.3.2 FX Engine Sub-module (`economy/fx/`)
**Files:**
- `fx.module.ts`, `fx.service.ts`, `fx.controller.ts`
- `fx-rate.entity.ts`, `fx.repository.ts`, `fx.dto.ts`

**Entity:**
```typescript
class FXRate {
  id: UUID;
  from_currency: Currency;
  to_currency: Currency;
  rate: Decimal;
  spread: Decimal;
  effective_rate: Decimal;
  source: string; // provider name
  expires_at: Date;
  created_at;
}
```

**Services:**
- `FXService`: getRate(from, to), convert(amount, from, to), updateRates(), getConversionFee(amount, from, to)

**Supported Currencies**: EGP, SAR, USD, EUR (extensible)

##### 4.3.3 Escrow Sub-module (`economy/escrow/`)
**Files:**
- `escrow.module.ts`, `escrow.service.ts`, `escrow.entity.ts`, `escrow.repository.ts`

**Entity:**
```typescript
class Escrow {
  id: UUID;
  wallet_id: UUID;
  amount: Decimal;
  currency: Currency;
  order_id: UUID;
  seller_id: UUID;
  status: EscrowStatus; // HELD, RELEASED, REFUNDED, DISPUTED
  hold_reason: string;
  release_conditions: ReleaseCondition[];
  created_at;
  expires_at; // typically 14 days
}
```

**Services:**
- `EscrowService`: hold(walletId, orderId, amount), release(escrowId), refund(escrowId), getStatus(orderId)

##### 4.3.4 Cashback & Rewards Sub-module (`economy/rewards/`)
**Files:**
- `rewards.module.ts`, `cashback.service.ts`, `points.service.ts`, `rewards.controller.ts`
- `cashback-rule.entity.ts`, `points-balance.entity.ts`, `points-transaction.entity.ts`

**Services:**
- `CashbackService`: calculateCashback(userId, amount, category), issueCashback(walletId, amount), getActiveRules()
- `PointsService`: earn(userId, amount, source), spend(userId, amount, purpose), getBalance(userId), convertToWallet(userId, points)

**GEM Points Sources**: workouts, attendance, challenges, referrals, nutrition_compliance, creator_engagement

---

### 4.4 FITNESS MODULE (`src/modules/fitness/`)

#### Purpose
Gym Management, Booking, Attendance, Franchise, POS, Nutrition

##### 4.4.1 Gym SaaS Sub-module (`fitness/gym/`)
**Files:**
- `gym.module.ts`, `gym.service.ts`, `gym.controller.ts`
- `gym.entity.ts`, `branch.entity.ts`, `membership.entity.ts`, `membership-plan.entity.ts`
- `gym.repository.ts`, `gym.dto.ts`, `gym.validator.ts`

**Entities:**
```typescript
class Gym {
  id: UUID;
  owner_id: UUID;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  status: GymStatus; // PENDING, ACTIVE, SUSPENDED, CLOSED
  kyc_status: KYCStatus;
  settings: GymSettings;
  analytics: GymAnalytics;
  created_at; updated_at; deleted_at;
}

class GymBranch {
  id: UUID;
  gym_id: UUID;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  location: { lat: number; lon: number };
  facilities: string[];
  operating_hours: OperatingHours;
  status: BranchStatus;
  settings: BranchSettings;
  created_at; updated_at;
}

class MembershipPlan {
  id: UUID;
  gym_id: UUID;
  branch_ids: UUID[]; // null = all branches
  name: string;
  description: string;
  duration_months: number;
  price: Decimal;
  currency: Currency;
  features: string[];
  is_active: boolean;
  max_members: number;
  created_at; updated_at;
}

class Membership {
  id: UUID;
  user_id: UUID;
  gym_id: UUID;
  branch_id: UUID;
  plan_id: UUID;
  status: MembershipStatus; // ACTIVE, EXPIRED, CANCELLED, FROZEN
  start_date: Date;
  end_date: Date;
  auto_renew: boolean;
  payment_method: string;
  created_at; updated_at;
}
```

**Services:**
- `GymService`: create(dto), update(id, dto), list(filters), getById(id), getBranches(gymId)
- `BranchService`: create(gymId, dto), update(id, dto), getByGym(gymId)
- `MembershipService`: subscribe(userId, planId), cancel(membershipId), renew(membershipId), getActive(userId), checkAccess(userId, gymId)

##### 4.4.2 Booking Engine Sub-module (`fitness/booking/`)
**Files:**
- `booking.module.ts`, `booking.service.ts`, `booking.controller.ts`
- `slot.entity.ts`, `booking.entity.ts`, `waitlist.entity.ts`
- `booking.repository.ts`, `booking.dto.ts`

**Entities:**
```typescript
class ClassSlot {
  id: UUID;
  gym_id: UUID;
  branch_id: UUID;
  trainer_id: UUID;
  name: string;
  description: string;
  category: string;
  max_capacity: number;
  booked_count: number;
  waitlist_count: number;
  start_time: Date;
  end_time: Date;
  room: string;
  equipment_needed: string[];
  status: SlotStatus; // AVAILABLE, FULL, CANCELLED, COMPLETED
  recurrence_rule: string; // for recurring classes
  created_at; updated_at;
}

class Booking {
  id: UUID;
  user_id: UUID;
  slot_id: UUID;
  status: BookingStatus; // CONFIRMED, CANCELLED, NO_SHOW, ATTENDED
  check_in_time: Date;
  check_in_method: 'QR' | 'MANUAL' | 'BIOMETRIC';
  cancellation_reason: string;
  penalty_amount: Decimal;
  created_at; updated_at;
}

class WaitlistEntry {
  id: UUID;
  user_id: UUID;
  slot_id: UUID;
  position: number;
  status: WaitlistStatus; // WAITING, CONVERTED, EXPIRED
  created_at;
}
```

**Services:**
- `SlotService`: create(dto), update(id, dto), listAvailable(gymId, date, category), getById(id)
- `BookingService`: book(userId, slotId), cancel(bookingId, reason), checkIn(bookingId, method), getUserBookings(userId), getSlotBookings(slotId)
- `WaitlistService`: join(userId, slotId), leave(waitlistId), processWaitlist(slotId)

**CRITICAL**: Booking uses Redis lock: `lock:slot:{slotId}`
**CRITICAL**: Overbooking prevention via atomic check-and-set

##### 4.4.3 Attendance Sub-module (`fitness/attendance/`)
**Files:**
- `attendance.module.ts`, `attendance.service.ts`, `attendance.controller.ts`
- `attendance.entity.ts`, `attendance.repository.ts`, `qr.service.ts`

**Services:**
- `AttendanceService`: recordEntry(userId, gymId, method), recordExit(userId, gymId), getHistory(userId, gymId)
- `QRService`: generateCheckInCode(userId, gymId), validateCode(code), generateMembershipCard(userId)

---

### 4.5 MARKETPLACE MODULE (`src/modules/marketplace/`)

#### Purpose
Products, Orders, Logistics, Disputes, Refunds

##### 4.5.1 Product Catalog Sub-module (`marketplace/product/`)
**Files:**
- `product.module.ts`, `product.service.ts`, `product.controller.ts`
- `product.entity.ts`, `category.entity.ts`, `product.repository.ts`, `product.dto.ts`

**Entity:**
```typescript
class Product {
  id: UUID;
  seller_id: UUID;
  store_id: UUID;
  name: string;
  slug: string;
  description: string;
  type: ProductType; // PHYSICAL, DIGITAL, SERVICE, SUBSCRIPTION
  category_id: UUID;
  price: Decimal;
  currency: Currency;
  compare_at_price: Decimal;
  cost_per_item: Decimal;
  sku: string;
  barcode: string;
  track_quantity: boolean;
  quantity: number;
  weight: number;
  images: string[];
  attributes: Record<string, any>;
  status: ProductStatus; // DRAFT, ACTIVE, ARCHIVED
  seo_title: string;
  seo_description: string;
  tags: string[];
  rating_average: number;
  rating_count: number;
  sales_count: number;
  created_at; updated_at; deleted_at;
}
```

##### 4.5.2 Order Management Sub-module (`marketplace/order/`)
**Files:**
- `order.module.ts`, `order.service.ts`, `order.controller.ts`
- `order.entity.ts`, `order-item.entity.ts`, `order.repository.ts`, `order.dto.ts`
- `oms.service.ts`

**Entity:**
```typescript
class Order {
  id: UUID;
  buyer_id: UUID;
  seller_id: UUID;
  store_id: UUID;
  status: OrderStatus; // CREATED, CONFIRMED, PACKED, SHIPPED, DELIVERED, RETURNED, DISPUTED, REFUNDED, ESCROW_RELEASED
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  currency: Currency;
  subtotal: Decimal;
  shipping_cost: Decimal;
  tax_amount: Decimal;
  discount_amount: Decimal;
  total: Decimal;
  items: OrderItem[];
  shipping_address: Address;
  billing_address: Address;
  notes: string;
  metadata: Record<string, any>;
  created_at; updated_at;
}

class OrderItem {
  id: UUID;
  order_id: UUID;
  product_id: UUID;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: Decimal;
  total_price: Decimal;
  currency: Currency;
  metadata: Record<string, any>;
}
```

**OMS Lifecycle**: CREATED → CONFIRMED → PACKED → SHIPPED → DELIVERED → ESCROW_RELEASED

**Services:**
- `OrderService`: create(dto), updateStatus(orderId, status), getById(id), listByBuyer(userId), listBySeller(userId)
- `OMSService`: processOrderCreated(order), processPaymentConfirmed(order), processShipped(order), processDelivered(order), processDispute(order)

---

### 4.6 SOCIAL MODULE (`src/modules/social/`)

#### Purpose
Feed, Reels, Stories, Challenges, Communities, Messaging

##### 4.6.1 Challenges Sub-module (`social/challenges/`)
**Files:**
- `challenges.module.ts`, `challenges.service.ts`, `challenges.controller.ts`
- `challenge.entity.ts`, `challenge-participant.entity.ts`, `challenge.repository.ts`

**Entity:**
```typescript
class Challenge {
  id: UUID;
  creator_id: UUID;
  sponsor_id: UUID; // nullable
  title: string;
  description: string;
  type: ChallengeType; // GLOBAL, SPONSORED, REGIONAL, CREATOR
  category: string;
  goal_type: GoalType; // STEPS, DISTANCE, CALORIES, WORKOUTS, TIME
  goal_value: number;
  start_date: Date;
  end_date: Date;
  prize_pool: Decimal;
  prize_currency: Currency;
  max_participants: number;
  participant_count: number;
  rules: string[];
  cover_image: string;
  status: ChallengeStatus; // DRAFT, ACTIVE, COMPLETED, CANCELLED
  region_scope: string[];
  created_at; updated_at;
}
```

##### 4.6.2 Feed Sub-module (`social/feed/`)
**Files:**
- `feed.module.ts`, `feed.service.ts`, `feed.controller.ts`
- `post.entity.ts`, `feed-item.entity.ts`, `like.entity.ts`, `comment.entity.ts`

---

### 4.7 AI MODULE (`src/modules/ai/`)

#### Purpose
AI Coach, Fraud Detection, Recommendations, Analytics

##### 4.7.1 AI Coach Sub-module (`ai/coach/`)
**Files:**
- `coach.module.ts`, `coach.service.ts`, `coach.controller.ts`
- `workout-plan.entity.ts`, `nutrition-plan.entity.ts`, `coach.dto.ts`

**Services:**
- `CoachService`: generateWorkoutPlan(userId, goals), generateNutritionPlan(userId, preferences), getRecoveryRecommendations(userId), analyzeFatigue(userId)

##### 4.7.2 Fraud AI Sub-module (`ai/fraud/`)
**Files:**
- `fraud-ai.module.ts`, `fraud-ai.service.ts`
- `fraud-pattern.entity.ts`, `fraud.model.ts`

**Services:**
- `FraudAIService`: analyzeTransaction(tx), detectFakeGPS(activity), detectEmulator(deviceInfo), scoreKYC(kycData), detectRewardAbuse(userId, activity)

---

### 4.8 ENTERPRISE MODULE (`src/modules/enterprise/`)

#### Purpose
Employee Management, Operations Center, Compliance

##### 4.8.1 Employee Sub-module (`enterprise/employee/`)
**Files:**
- `employee.module.ts`, `employee.service.ts`, `employee.controller.ts`
- `employee.entity.ts`, `department.entity.ts`, `employee.repository.ts`

**Entity:**
```typescript
class Employee {
  id: UUID;
  user_id: UUID;
  employee_code: string;
  department_id: UUID;
  role_id: UUID;
  permission_scopes: string[];
  region_scopes: string[];
  action_logs: ActionLog[];
  ip_tracking: IPLog[];
  device_fingerprint_logs: DeviceLog[];
  login_history: LoginRecord[];
  mfa_required: boolean;
  status: EmployeeStatus; // ACTIVE, SUSPENDED, TERMINATED
  hired_at: Date;
  created_at; updated_at;
}
```

##### 4.8.2 Operations Center Sub-module (`enterprise/ops/`)
**Files:**
- `ops.module.ts`, `ops.service.ts`, `ops.controller.ts`
- `dlq-monitor.service.ts`, `escalation.service.ts`, `refund-approval.service.ts`

**Services:**
- `DLQMonitorService`: getFailedEvents(), replay(eventId), getAnalytics()
- `EscalationService`: escalate(issueId, level), getEscalations(filters), resolve(escalationId)
- `RefundApprovalService`: requestRefund(orderId, amount), approve(refundId), reject(refundId, reason)

---

## 5. DATABASE SCHEMA

### 5.1 PostgreSQL Schema

#### Users & Identity
```sql
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  country VARCHAR(2) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  kyc_status VARCHAR(20) DEFAULT 'PENDING',
  kyc_level INTEGER DEFAULT 0,
  fraud_score INTEGER DEFAULT 0,
  trusted_devices JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- permissions
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(100) UNIQUE NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- role_permissions
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- user_roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  scope_regions TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  geo_country VARCHAR(2),
  token_hash VARCHAR(255) NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  mfa_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- kyc_submissions
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  documents JSONB DEFAULT '[]',
  ocr_data JSONB DEFAULT '{}',
  face_match_score DECIMAL(5,2),
  liveness_score DECIMAL(5,2),
  fraud_score INTEGER DEFAULT 0,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Economy - Wallets
```sql
-- wallets
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL,
  balance DECIMAL(18,4) NOT NULL DEFAULT 0,
  held_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  type VARCHAR(20) DEFAULT 'CONSUMER',
  snapshot_version INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type VARCHAR(50),
  balance_after DECIMAL(18,4),
  status VARCHAR(20) DEFAULT 'PENDING',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ledger_entries
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  entry_type VARCHAR(10) NOT NULL, -- DEBIT or CREDIT
  account VARCHAR(100) NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- fx_rates
CREATE TABLE fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18,8) NOT NULL,
  spread DECIMAL(18,8) NOT NULL DEFAULT 0,
  effective_rate DECIMAL(18,8) NOT NULL,
  source VARCHAR(50),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- escrows
CREATE TABLE escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id),
  amount DECIMAL(18,4) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  order_id UUID,
  seller_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'HELD',
  hold_reason TEXT,
  release_conditions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
);

-- gem_points
CREATE TABLE gem_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  snapshot_version INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- points_transactions
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL, -- EARN or SPEND
  amount INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL,
  description TEXT,
  reference_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Fitness
```sql
-- gyms
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  kyc_status VARCHAR(20) DEFAULT 'PENDING',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- gym_branches
CREATE TABLE gym_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(2) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  location_lat DECIMAL(10,8),
  location_lon DECIMAL(11,8),
  facilities TEXT[] DEFAULT '{}',
  operating_hours JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- membership_plans
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  branch_ids UUID[] DEFAULT '{}',
  name VARCHAR(200) NOT NULL,
  description TEXT,
  duration_months INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  max_members INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- memberships
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES gyms(id),
  branch_id UUID REFERENCES gym_branches(id),
  plan_id UUID REFERENCES membership_plans(id),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_method VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- class_slots
CREATE TABLE class_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id),
  branch_id UUID REFERENCES gym_branches(id),
  trainer_id UUID REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  max_capacity INTEGER NOT NULL DEFAULT 20,
  booked_count INTEGER NOT NULL DEFAULT 0,
  waitlist_count INTEGER NOT NULL DEFAULT 0,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  room VARCHAR(100),
  equipment_needed TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'AVAILABLE',
  recurrence_rule VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES class_slots(id),
  status VARCHAR(20) DEFAULT 'CONFIRMED',
  check_in_time TIMESTAMPTZ,
  check_in_method VARCHAR(20),
  cancellation_reason TEXT,
  penalty_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- attendance_records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  gym_id UUID REFERENCES gyms(id),
  branch_id UUID REFERENCES gym_branches(id),
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ,
  method VARCHAR(20) NOT NULL,
  qr_code VARCHAR(255),
  verified_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Marketplace
```sql
-- product_categories
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES product_categories(id),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id),
  store_id UUID,
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  category_id UUID REFERENCES product_categories(id),
  price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  compare_at_price DECIMAL(12,2),
  cost_per_item DECIMAL(12,2),
  sku VARCHAR(100),
  barcode VARCHAR(100),
  track_quantity BOOLEAN DEFAULT TRUE,
  quantity INTEGER DEFAULT 0,
  weight DECIMAL(10,2),
  images TEXT[] DEFAULT '{}',
  attributes JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'DRAFT',
  seo_title VARCHAR(200),
  seo_description TEXT,
  tags TEXT[] DEFAULT '{}',
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  store_id UUID,
  status VARCHAR(20) DEFAULT 'CREATED',
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  fulfillment_status VARCHAR(20) DEFAULT 'PENDING',
  currency VARCHAR(3) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- order_items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(300) NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  metadata JSONB DEFAULT '{}'
);
```

#### Enterprise
```sql
-- departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id),
  role_id UUID REFERENCES roles(id),
  permission_scopes TEXT[] DEFAULT '{}',
  region_scopes TEXT[] DEFAULT '{}',
  mfa_required BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  hired_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  actor_id UUID,
  actor_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  changes JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

### 5.2 Indexes

```sql
-- Users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_country ON users(country) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_kyc_status ON users(kyc_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- Sessions
CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Wallets
CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);
CREATE INDEX idx_wallets_status ON wallets(status);

-- Transactions
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_reference ON transactions(reference_id, reference_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- Ledger (partitioned)
CREATE INDEX idx_ledger_tx ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account);
CREATE INDEX idx_ledger_created ON ledger_entries(created_at);

-- Gyms
CREATE INDEX idx_gyms_owner ON gyms(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gyms_slug ON gyms(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_gyms_status ON gyms(status) WHERE deleted_at IS NULL;

-- Branches
CREATE INDEX idx_branches_gym ON gym_branches(gym_id);
CREATE INDEX idx_branches_location ON gym_branches(location_lat, location_lon);
CREATE INDEX idx_branches_city ON gym_branches(city, country);

-- Bookings
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_slot ON bookings(slot_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Orders
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Audit logs (partitioned)
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

### 5.3 Redis Key Patterns
```
session:{token_hash} -> user data
lock:wallet:{walletId} -> distributed lock
lock:slot:{slotId} -> distributed lock
lock:inventory:{productId} -> distributed lock
rate_limit:{ip}:{endpoint} -> request count
cache:user:{userId} -> user profile
cache:gym:{gymId} -> gym data
queue:events -> event queue
dlq:events -> dead letter queue
offline:sync:{deviceId} -> offline actions
fraud:device:{fingerprint} -> device reputation
```

---

## 6. API ENDPOINTS

### 6.1 Auth API
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/mfa/setup
POST /api/v1/auth/mfa/verify
POST /api/v1/auth/mfa/disable
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
GET  /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id
```

### 6.2 User API
```
GET    /api/v1/users/me
PUT    /api/v1/users/me
GET    /api/v1/users/me/wallets
GET    /api/v1/users/me/memberships
GET    /api/v1/users/me/bookings
GET    /api/v1/users/me/points
GET    /api/v1/users/:id (admin only)
PUT    /api/v1/users/:id/status (admin only)
```

### 6.3 KYC API
```
POST   /api/v1/kyc/submit
GET    /api/v1/kyc/status
GET    /api/v1/kyc/submissions (admin)
GET    /api/v1/kyc/submissions/:id (admin)
PUT    /api/v1/kyc/submissions/:id/review (admin)
POST   /api/v1/kyc/documents/upload
DELETE /api/v1/kyc/documents/:id
```

### 6.4 Wallet API
```
POST   /api/v1/wallets
GET    /api/v1/wallets
GET    /api/v1/wallets/:id
GET    /api/v1/wallets/:id/balance
GET    /api/v1/wallets/:id/transactions
POST   /api/v1/wallets/:id/deposit
POST   /api/v1/wallets/:id/withdraw
POST   /api/v1/wallets/transfer
POST   /api/v1/wallets/:id/freeze (admin)
POST   /api/v1/wallets/:id/unfreeze (admin)
```

### 6.5 FX API
```
GET    /api/v1/fx/rates
GET    /api/v1/fx/rates/:from/:to
POST   /api/v1/fx/convert
GET    /api/v1/fx/currencies
```

### 6.6 Gym API
```
POST   /api/v1/gyms
GET    /api/v1/gyms
GET    /api/v1/gyms/:id
PUT    /api/v1/gyms/:id
DELETE /api/v1/gyms/:id
GET    /api/v1/gyms/:id/branches
POST   /api/v1/gyms/:id/branches
GET    /api/v1/gyms/:id/plans
POST   /api/v1/gyms/:id/plans
GET    /api/v1/gyms/nearby
```

### 6.7 Booking API
```
GET    /api/v1/slots
GET    /api/v1/slots/:id
POST   /api/v1/slots/:id/book
GET    /api/v1/bookings
GET    /api/v1/bookings/:id
PUT    /api/v1/bookings/:id/cancel
POST   /api/v1/bookings/:id/checkin
GET    /api/v1/bookings/upcoming
```

### 6.8 Marketplace API
```
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/:id
PUT    /api/v1/products/:id
DELETE /api/v1/products/:id
GET    /api/v1/categories
POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/:id
PUT    /api/v1/orders/:id/status
```

### 6.9 Enterprise API (Admin)
```
GET    /api/v1/admin/users
PUT    /api/v1/admin/users/:id/status
GET    /api/v1/admin/employees
POST   /api/v1/admin/employees
PUT    /api/v1/admin/employees/:id
GET    /api/v1/admin/roles
POST   /api/v1/admin/roles
GET    /api/v1/admin/audit-logs
GET    /api/v1/admin/dlq
POST   /api/v1/admin/dlq/:id/replay
GET    /api/v1/admin/analytics
GET    /api/v1/admin/fraud-alerts
PUT    /api/v1/admin/fraud-alerts/:id/resolve
```

---

## 7. EVENT DEFINITIONS

### 7.1 Event Types
```typescript
type DomainEvent =
  | UserRegisteredEvent
  | UserLoggedInEvent
  | UserKYCSubmittedEvent
  | UserKYCApprovedEvent
  | WalletCreatedEvent
  | WalletCreditedEvent
  | WalletDebitedEvent
  | TransactionCompletedEvent
  | CashbackIssuedEvent
  | PointsEarnedEvent
  | PointsSpentEvent
  | GymCreatedEvent
  | GymApprovedEvent
  | MembershipPurchasedEvent
  | MembershipExpiredEvent
  | SlotCreatedEvent
  | BookingCreatedEvent
  | BookingCancelledEvent
  | BookingCheckedInEvent
  | OrderCreatedEvent
  | OrderPaidEvent
  | OrderShippedEvent
  | OrderDeliveredEvent
  | EscrowHeldEvent
  | EscrowReleasedEvent
  | RefundRequestedEvent
  | RefundApprovedEvent
  | FraudDetectedEvent
  | SecurityAlertEvent
  | ChallengeCreatedEvent
  | ChallengeJoinedEvent
  | ChallengeCompletedEvent;
```

### 7.2 Event Envelope Structure
```typescript
interface EventEnvelope<T extends DomainEvent> {
  event_id: string;        // UUID v4
  correlation_id: string;  // UUID v4 - for tracing
  actor_id: string;        // UUID - who triggered
  actor_type: string;      // user, system, admin
  source_module: string;   // identity, economy, fitness, etc.
  event_type: string;      // UserRegistered, WalletDebited, etc.
  timestamp: string;       // ISO 8601
  device_metadata: {
    fingerprint: string;
    ip: string;
    user_agent: string;
    geo: { country: string; city: string };
  };
  fraud_metadata: {
    score: number;
    signals: string[];
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  payload: T;
}
```

---

## 8. SECURITY REQUIREMENTS

### 8.1 Authentication Flow
1. User submits credentials + device info
2. System validates credentials
3. System checks device fingerprint
4. If new device → MFA required
5. If fraud score > 50 → additional verification
6. Issue JWT access token (15 min expiry) + refresh token (7 days)
7. Store session in Redis + PostgreSQL

### 8.2 Authorization
- RBAC with permission scopes
- @RequirePermissions() decorator on controllers
- Region-based access control
- Resource ownership validation

### 8.3 Fraud Protection
- Device fingerprinting on every request
- IP reputation check
- Velocity checking (requests per minute)
- Geo consistency validation
- Impossible movement detection
- Multi-device collision detection

### 8.4 Rate Limiting
```
Auth endpoints: 5 requests / minute
API general: 100 requests / minute
Sensitive operations: 3 requests / minute
Admin operations: 30 requests / minute
```

---

## 9. DEPLOYMENT

### 9.1 Docker Services
```yaml
services:
  api: NestJS application
  postgres: PostgreSQL 16
  redis: Redis 7
  clickhouse: ClickHouse
  elasticsearch: Elasticsearch
  nginx: Reverse proxy
```

### 9.2 Environment Variables
```env
# App
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/gemz
POSTGRES_USER=gemz
POSTGRES_PASSWORD=<secure>
POSTGRES_DB=gemz

# Redis
REDIS_URL=redis://redis:6379

# ClickHouse
CLICKHOUSE_URL=http://clickhouse:8123

# Elasticsearch
ELASTICSEARCH_URL=http://elasticsearch:9200

# JWT
JWT_SECRET=<secure_random>
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security
BCRYPT_ROUNDS=12
MFA_ISSUER=GEMZ

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

---

## 10. TESTING STRATEGY

- Unit Tests: Every service, every util
- Integration Tests: API endpoints, database operations
- E2E Tests: Critical user flows
- Load Tests: Booking engine, wallet operations
- Security Tests: Auth bypass, injection attacks
- Chaos Tests: Redis failure, DB failover

---

## 11. EXECUTION PLAN

### Phase 1: Infrastructure
1. Docker Compose setup
2. NestJS project initialization
3. Database configuration (PostgreSQL, Redis, ClickHouse, Elasticsearch)
4. Event Bus implementation
5. Audit system
6. Security foundation

### Phase 2: Core Modules
7. Identity module (Auth, RBAC, Session, KYC)
8. Economy module (Wallet, FX, Escrow, Rewards)
9. Fitness module (Gym, Booking, Attendance)
10. Marketplace module (Product, Order, OMS)

### Phase 3: Advanced Features
11. AI module (Coach, Fraud AI)
12. Social module (Challenges, Feed)
13. Enterprise module (Employees, Ops Center)

### Phase 4: Integration & Polish
14. Event-driven workflows
15. Testing
16. Documentation
17. Deployment
