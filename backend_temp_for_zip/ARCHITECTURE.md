# GEM Z — Backend Architecture Outline (Phase 2)

## 1. Proposed Folder Structure (Node.js with Express & TypeScript)

```text
backend/
├── src/
│   ├── config/              # Environment vars, App configuration, DB config
│   ├── core/                # Core utilities, error handling, logger, custom types
│   ├── modules/             # Feature-based module grouping (Domain Driven Design)
│   │   ├── auth/            # Auth controllers, services, JWT generators
│   │   ├── users/           # User & Profile management
│   │   ├── gyms/            # Gym, Branch, Off-peak pricing features
│   │   ├── stores/          # Store & Product mgmt
│   │   ├── financial/       # Ledger, Wallets, Transactions, Split Engine
│   │   ├── subscriptions/   # Purchases of plans, attendance checks
│   │   ├── ai_fitness/      # OCR diet parsers, MediaPipe integrations
│   │   ├── social/          # Posts, comments, likes, badges, leaderboards
│   │   └── webhooks/        # Payment gateway callback handlers
│   ├── services/            # Cross-module external services (OpenAI, AWS S3, Postmark)
│   ├── db/                  # Raw SQL queries, migrations, seeds (using pg + node-postgres)
│   ├── server.ts            # Express App initialization
│   └── index.ts             # Entry point
└── package.json
```

---

## 2. Authentication & Authorization Strategy

- **Tokens**: JSON Web Tokens (JWT).
  - **Access Token:** Short-lived (e.g., 15 mins), embedded with `userId` and `role`.
  - **Refresh Token:** Long-lived (e.g., 7 days), stored securely in HttpOnly cookies and whitelisted/hashed in the database.
- **RBAC (Role-Based Access Control)**:
  - We define a generic middleware `requireRole(['trainee', 'trainer', 'gym_admin', 'store_admin', 'super_admin'])`.
  - **Context-Aware Guards**: The API ensures a `gym_admin` can only access branches linked to their `owner_user_id`. Verified via a generic ownership middleware utilizing the decoded JWT subject.

---

## 3. Financial Engine Service Architecture

- Centralized `FinancialService.ts` running all transactional logic via a PostgreSQL client `pool`.
- **Safety Measures**:
  1. We execute strict `BEGIN;` and `COMMIT;` blocks via `pg`.
  2. We read the latest balance inside the transaction utilizing `FOR UPDATE` cursor locks.
  3. All monetary types use `NUMERIC(19,4)` preventing rounding errors.
  4. Platform limits: Every ledger transaction validates that total DEBIT == total CREDIT.
  5. **Auto-commission Split**: Calculating `platform_fee_pct` directly in the backend layer to dynamically inject proper ledger entries.

*(See `f:\Gem Z\backend\src\services\financial.service.ts` for the exact code implementation)*

---

## 4. AI Service Wrappers & Data Flow

### AI Nutritionist pipeline:
1. User uploads a medical report PDF/Image via App.
2. File is sent to AWS Textract (or Google Cloud Vision) for robust **OCR extraction**.
3. Raw OCR text + user profile metrics (weight, goals, allergies) is formatted into a strict structured prompt.
4. Sent to **OpenAI `gpt-4o`** with `response_format: { type: "json_object" }` to guarantee we get an exact JSON layout mapping directly to our `ai_diet_plans` and `meals` tables.
5. Parsed schema is inserted into the DB, pushing an alert to the user.

### AI Form Correction pipeline:
1. PWA streams chunked video feed or uploads short video segment to the Backend.
2. (Alternative for fast real-time): MediaPipe runs on the client-side (frontend) processing frames at 30fps.
3. The client emits parsed bounding box / angles data via WebSockets to Node.js backend.
4. Backend analyzes the angle discrepancies (e.g., "Knee passes toe by X degrees") against predefined workout tolerances, returning a Form Score and JSON bounding box red flags in real-time.

---

## 5. Payment Gateway Adapter Layer

- Strategy using the Strategy Pattern to support multiple Egyptian gateways:
- `PaymentGatewayInterface` ensures `createPaymentIntent()` and `verifyWebhookTxn()`.
- Implementations: `InstapayGateway`, `FawryGateway`, `PaymobGateway`.
- **Webhook Handlers**: Placed under `/api/v1/webhooks/:gateway`.
  - **Idempotency checks**: The webhook attempts to query `transactions` via `gateway_ref`. If status is already `completed`, it responds 200 immediately to prevent double-funding.
  - Upon successful payment verification, the financial engine's `commitTopUpTransaction` or `commitOrderPayment` is triggered.
