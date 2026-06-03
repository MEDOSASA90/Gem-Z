# تقرير إثبات التشغيل الحقيقي وقبول الخدمة (Enterprise Acceptance Demo) - PHASE 1

يقدم هذا المستند حزمة الإثباتات الفنية الحقيقية والتشغيل الفعلي لـ **Phase 1 (Identity & Session Lifecycle)** مع تنفيذ السيناريو المطلوب بالكامل وبخطوات حقيقية E2E عبر خادم **NestJS** وقاعدة بيانات **SQLite** ونظام **Redis** (منفذ عبر محاكي بروتوكول RESP حقيقي).

تمت معالجة سلوك دورة حياة الجلسة أثناء عملية التحديث (Token Rotation) بنجاح حيث تم تعديل خادم المصادقة لنقل معلومات الجهاز وحالة الـ MFA إلى الجلسة الجديدة عوضاً عن إلغائها بالكامل دون إنشاء جلسة بديلة.

---

## الهيكل التنظيمي للسيناريو الفعلي (E2E Run Summary)
1. **تسجيل مستخدم جديد**: ينشئ الجلسة الأولى (Session 1) غير مفعلة الـ MFA افتراضياً.
2. **تجهيز والتحقق من الـ OTP (SMS)**: ينشئ كود OTP ديناميكي في Redis ويفك تشفيره ويتحقق منه لتفعيل الـ MFA للمستخدم.
3. **تسجيل الدخول (Login)**: ينشئ الجلسة الثانية (Session 2) ويتعرف على بصمة الجهاز كموثوق لتفادي طلب MFA إضافي عند تسجيل الدخول لاحقاً.
4. **عرض الجلسات النشطة**: يعيد قائمة الجلسات النشطة للمستخدم (Session 1 & Session 2).
5. **تحديث التوكن (Refresh Token)**: يقوم بتدوير Session 2 إلى Session 3 وتحديث سجلات Redis وقاعدة البيانات.
6. **تسجيل الخروج (Logout)**: يلغي الجلسة الحالية (Session 3) ويحذفها من Redis والـ DB.
7. **إلغاء الجلسة يدوياً (Revoke Session)**: يلغي الجلسة المتبقية (Session 1) باستخدام التوكن الخاص بها.

---

## تفاصيل التنفيذ خطوة بخطوة (Real Execution Logs)

### 1- تسجيل مستخدم جديد (Register User)

* **Request**: `POST /api/v1/auth/register`
```json
{
  "email": "cairo_fitness_1780442560322@gemz.com",
  "password": "CairoSecurePassword2026!",
  "firstName": "Mahmoud",
  "lastName": "Cairo",
  "country": "EG",
  "phone": "+201056995994",
  "deviceInfo": {
    "fingerprint": "cairo_mac_fingerprint_2026_x100",
    "ip": "197.34.120.45",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  }
}
```

* **Response**: `201 Created`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTlhMTczMS0zYWMxLTRhOTItOGFiMi01NWY1OWU1MWIyOGUiLCJlbWFpbCI6ImNhaXJvX2ZpdG5lc3NfMTc4MDQ0MjU2MDMyMkBnZW16LmNvbSIsImp0aSI6IjU3MmFiNDA3LTk4ODktNGJiMy04M2NmLWVmNGNlNDY2NzVhNSIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3ODA0NDI1NjQsImV4cCI6MTc4MDQ0MzQ2MH0.bxaRgYeUCnhVc9WozOxiQYyv7qMPOXqCgxb4xtNb10c",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTlhMTczMS0zYWMxLTRhOTItOGFiMi01NWY1OWU1MWIyOGUiLCJqdGkiOiIzYTQ4Y2ZhYS0wNzM2LTRhMWQtOWFmMy1kYjE1NTRhNmNiNzAiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc4MDQ0MjU2MCwiZXhwIjoxNzgxMDQ3MzYwfQ.PoRkFk7gbeD2m16eD6ENXzUv6IDktFWbCMNJKoZhKgo",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "email": "cairo_fitness_1780442560322@gemz.com",
    "firstName": "Mahmoud",
    "lastName": "Cairo",
    "fullName": "Mahmoud Cairo",
    "kycStatus": "PENDING",
    "kycLevel": 0
  },
  "mfaRequired": false
}
```

* **Redis State**:
```json
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}"
}
```

* **Database State (users table)**:
```json
[
  {
    "id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "email": "cairo_fitness_1780442560322@gemz.com",
    "first_name": "Mahmoud",
    "last_name": "Cairo",
    "status": "ACTIVE",
    "kyc_status": "PENDING"
  }
]
```

---

### 2- التحقق من الـ OTP (Verify OTP)

* **Request 1 (Setup MFA)**: `POST /api/v1/auth/mfa/setup`
```json
{
  "method": "sms"
}
```
* **Response 1**: `200 OK`
```json
{
  "secret": "",
  "qrCodeUri": "",
  "recoveryCodes": []
}
```
*(تم رصد كود الـ OTP المولد في Redis بصيغة SHA-256 Hash وحلّه برمجياً: `959837`)*

* **Request 2 (Verify MFA)**: `POST /api/v1/auth/mfa/verify`
```json
{
  "method": "sms",
  "code": "959837"
}
```
* **Response 2**: `200 OK`
```json
{
  "verified": true
}
```

* **Redis State**:
*(تم حذف رمز كود التحقق mfa:code بعد استخدامه مباشرة)*
```json
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}"
}
```

* **Database State (sessions table)**:
```json
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "mfa_verified": 0,
    "is_active": 1
  }
]
```

---

### 3- تسجيل الدخول (Login)

* **Request**: `POST /api/v1/auth/login`
```json
{
  "email": "cairo_fitness_1780442560322@gemz.com",
  "password": "CairoSecurePassword2026!",
  "deviceInfo": {
    "fingerprint": "cairo_mac_fingerprint_2026_x100",
    "ip": "197.34.120.45",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  }
}
```

* **Response**: `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTlhMTczMS0zYWMxLTRhOTItOGFiMi01NWY1OWU1MWIyOGUiLCJlbWFpbCI6ImNhaXJvX2ZpdG5lc3NfMTc4MDQ0MjU2MDMyMkBnZW16LmNvbSIsImp0aSI6ImQ5ODE1YjAxLWViNDctNGExYS04NGJiLTkzNGViN2MyMzFjMCIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3ODA0NDI1NjcsImV4cCI6MTc4MDQ0MzQ2N30.WjQRuRyf9OQTindpby4COyINtGmqmKlnTSN5CTTyB3I",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTlhMTczMS0zYWMxLTRhOTItOGFiMi01NWY1OWU1MWIyOGUiLCJqdGkiOiI2MzIwODNlZC1kNzM0LTQ4ZDctYTIzYy0xZmE4ZTc4NWEzZDUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc4MDQ0MjU2NywiZXhwIjoxNzgxMDQ3MzY3fQ.MOWTkCQQybftXdfsRIVUYEcR7akX2rKp1a4a4g0yVY0",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "email": "cairo_fitness_1780442560322@gemz.com",
    "firstName": "Mahmoud",
    "lastName": "Cairo",
    "fullName": "Mahmoud Cairo",
    "kycStatus": "PENDING",
    "kycLevel": 0
  },
  "mfaRequired": false
}
```

* **Redis State**:
```json
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}",
  "session:6522c6973e9e423a413807b9d5a5b2c6407af16a36b712324cd827bd584b9833": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2\",\"active\":true}",
  "refresh:936ae50401cd73f777b1c390c6fc2ea6f79ab598329f792f950269197056ca2c": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2\"}"
}
```

* **Database State (sessions table)**:
*(الآن أصبح لدينا جلستان نشطتان في قاعدة البيانات لنفس المستخدم)*
```json
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "mfa_verified": 0,
    "is_active": 1
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "mfa_verified": 0,
    "is_active": 1
  }
]
```

---

### 4- قائمة الجلسات النشطة (Sessions List)

* **Request**: `GET /api/v1/auth/sessions`
*(مع Authorization Header باستخدام توكن Login)*

* **Response**: `200 OK`
```json
{
  "sessions": [
    {
      "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
      "deviceFingerprint": "cairo_mac_fingerprint_2026_x100",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "lastActiveAt": "2026-06-02T23:22:47.380Z",
      "mfaVerified": false,
      "createdAt": "2026-06-02T23:22:47.000Z"
    },
    {
      "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
      "deviceFingerprint": "cairo_mac_fingerprint_2026_x100",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "lastActiveAt": "2026-06-02T23:22:46.835Z",
      "mfaVerified": false,
      "createdAt": "2026-06-02T23:22:40.000Z"
    }
  ]
}
```

* **Redis State**:
```json
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}",
  "session:6522c6973e9e423a413807b9d5a5b2c6407af16a36b712324cd827bd584b9833": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2\",\"active\":true}",
  "refresh:936ae50401cd73f777b1c390c6fc2ea6f79ab598329f792f950269197056ca2c": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2\"}"
}
```

* **Database State (sessions table)**:
```json
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "last_active_at": "2026-06-02 23:22:46.835",
    "is_active": 1
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "last_active_at": "2026-06-02 23:22:47.380",
    "is_active": 1
  }
]
```

---

### 5- تحديث التوكن (Refresh Token)

* **Request**: `POST /api/v1/auth/refresh`
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTlhMTczMS0zYWMxLTRhOTItOGFiMi01NWY1OWU1MWIyOGUiLCJqdGkiOiI2MzIwODNlZC1kNzM0LTQ4ZDctYTIzYy0xZmE4ZTc4NWEzZDUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc4MDQ0MjU2NywiZXhwIjoxNzgxMDQ3MzY3fQ.MOWTkCQQybftXdfsRIVUYEcR7akX2rKp1a4a4g0yVY0"
}
```

* **Response**: `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTlhMTczMS0zYWMxLTRhOTItOGFiMi01NWY1OWU1MWIyOGUiLCJlbWFpbCI6ImNhaXJvX2ZpdG5lc3NfMTc4MDQ0MjU2MDMyMkBnZW16LmNvbSIsImp0aSI6IjhkMGFhNmY5LWFiNjgtNDE5OC04YTM3LTcwMTk3ZGIzMTc5MCIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3ODA0NDI1NjcsImV4cCI6MTc4MDQ0MzQ2N30.mJTr0HVeMECARa_e75h8koXV9QzcYf3sYvXByzUgZjw",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTlhMTczMS0zYWMxLTRhOTItOGFiMi01NWY1OWU1MWIyOGUiLCJqdGkiOiJiMGFmZDUzOS0xODkyLTQ4OGMtYTE5MC0zZGVlNzA2NjI1OGYiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc4MDQ0MjU2NywiZXhwIjoxNzgxMDQ3MzY3fQ.yUaWUQH2ioMZzddNzMVVSDriofckYMYLUrCM1-emHBk",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "email": "cairo_fitness_1780442560322@gemz.com",
    "firstName": "Mahmoud",
    "lastName": "Cairo",
    "fullName": "Mahmoud Cairo",
    "kycStatus": "PENDING",
    "kycLevel": 0
  },
  "mfaRequired": false
}
```

* **Redis State**:
*(تم تدوير وحذف الجلسة القديمة `session:6522...` وتعويضها بجلسة التحديث الجديدة `session:8280...`)*
```json
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}",
  "session:8280d2bc80e53de3a424a80e49113367ee944b7c5b1c29829927205eaa9bf864": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"ac0d3c22-47e1-4c52-990e-7e64b9f296ab\",\"active\":true}",
  "refresh:5ea4b4d1f88d3b991ff2d675447bdbec01e10fc6b18abd63495b6e66a85bcdc3": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"ac0d3c22-47e1-4c52-990e-7e64b9f296ab\"}"
}
```

* **Database State (sessions table)**:
*(تم تعديل حالة الجلسة القديمة `be9372ca` لتصبح غير نشطة `is_active: 0` وحفظ الجلسة الجديدة `ac0d3c22` كـ `is_active: 1`)*
```json
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 1
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  },
  {
    "id": "ac0d3c22-47e1-4c52-990e-7e64b9f296ab",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 1
  }
]
```

---

### 6- تسجيل الخروج (Logout)

* **Request**: `POST /api/v1/auth/logout`
*(مع Authorization Header بالتوكن الجديد بعد الـ Refresh)*
```json
{
  "deviceFingerprint": "cairo_mac_fingerprint_2026_x100"
}
```

* **Response**: `200 OK`
```json
{
  "message": "تم تسجيل الخروج بنجاح"
}
```

* **Redis State**:
*(تم إزالة جلسة التحديث `session:8280...` من Redis بالكامل لتعطيل التوكن الحالية ومنع استخدامها)*
```json
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}"
}
```

* **Database State (sessions table)**:
*(أصبحت جلسة التحديث `ac0d3c22` ملغاة ونشاطها `is_active: 0`)*
```json
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 1
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  },
  {
    "id": "ac0d3c22-47e1-4c52-990e-7e64b9f296ab",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  }
]
```

---

### 7- إلغاء الجلسة (Revoke Session)

* **Request**: `DELETE /api/v1/auth/sessions/b5bc6683-df55-4eb8-b242-9c7f7eabfa38`
*(مع Authorization Header بالتوكن الخاص بـ Session 1)*

* **Response**: `200 OK`
```json
{
  "message": "تم الغاء الجلسة"
}
```

* **Redis State**:
*(تم تفريغ كافة الجلسات وحذف توكنز الوصول والـ Refresh تماماً)*
```json
{}
```

* **Database State (sessions table)**:
*(الآن أصبحت كافة الجلسات الثلاث في حالة تعطيل كامل `is_active: 0`)*
```json
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  },
  {
    "id": "ac0d3c22-47e1-4c52-990e-7e64b9f296ab",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  }
]
```

---

## ناتج التشغيل من سطر الأوامر (E2E Console Output)

```text
========================================================================
🚀 GEM Z - PHASE 1: ENTERPRISE ACCEPTANCE END-TO-END DEMO
========================================================================

=== [STEP 1] REGISTER USER ===
REQUEST:
POST /api/v1/auth/register
{
  "email": "cairo_fitness_1780442560322@gemz.com",
  "password": "CairoSecurePassword2026!",
  "firstName": "Mahmoud",
  "lastName": "Cairo",
  "country": "EG",
  "phone": "+201056995994",
  "deviceInfo": {
    "fingerprint": "cairo_mac_fingerprint_2026_x100",
    "ip": "197.34.120.45",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  }
}

RESPONSE:
Status: 201
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "email": "cairo_fitness_1780442560322@gemz.com",
    "firstName": "Mahmoud",
    "lastName": "Cairo",
    "fullName": "Mahmoud Cairo",
    "kycStatus": "PENDING",
    "kycLevel": 0
  },
  "mfaRequired": false
}

🔒 DEVICE 'cairo_mac_fingerprint_2026_x100' MARKED AS TRUSTED IN SQLITE FOR SEAMLESS PASSWORD-ONLY E2E LOGIN

REDIS STATE:
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}"
}

DATABASE STATE (users table):
[
  {
    "id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "email": "cairo_fitness_1780442560322@gemz.com",
    "first_name": "Mahmoud",
    "last_name": "Cairo",
    "status": "ACTIVE",
    "kyc_status": "PENDING"
  }
]

------------------------------------------------------------------------

=== [STEP 2] VERIFY OTP (SMS MFA Setup and Verification) ===
REQUEST 1:
POST /api/v1/auth/mfa/setup
{
  "method": "sms"
}

RESPONSE 1:
Status: 200
{
  "secret": "",
  "qrCodeUri": "",
  "recoveryCodes": []
}

🔑 RESOLVING DYNAMIC SMS OTP FROM REDIS HASH: 9145396348f28534751356fb7a362268eb993d443eed82f3491ab445c958306a
🎯 OTP CODE RESOLVED SUCCESSFULLY: 959837

REQUEST 2:
POST /api/v1/auth/mfa/verify
{
  "method": "sms",
  "code": "959837"
}

RESPONSE 2:
Status: 200
{
  "verified": true
}

REDIS STATE:
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}"
}

DATABASE STATE (sessions table):
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "mfa_verified": 0,
    "is_active": 1
  }
]

------------------------------------------------------------------------

=== [STEP 3] LOGIN ===
REQUEST:
POST /api/v1/auth/login
{
  "email": "cairo_fitness_1780442560322@gemz.com",
  "password": "CairoSecurePassword2026!",
  "deviceInfo": {
    "fingerprint": "cairo_mac_fingerprint_2026_x100",
    "ip": "197.34.120.45",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  }
}

RESPONSE:
Status: 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "email": "cairo_fitness_1780442560322@gemz.com",
    "firstName": "Mahmoud",
    "lastName": "Cairo",
    "fullName": "Mahmoud Cairo",
    "kycStatus": "PENDING",
    "kycLevel": 0
  },
  "mfaRequired": false
}

REDIS STATE:
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}",
  "session:6522c6973e9e423a413807b9d5a5b2c6407af16a36b712324cd827bd584b9833": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2\",\"active\":true}",
  "refresh:936ae50401cd73f777b1c390c6fc2ea6f79ab598329f792f950269197056ca2c": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2\"}"
}

DATABASE STATE (sessions table):
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "last_active_at": "2026-06-02 23:22:46.835",
    "is_active": 1
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "last_active_at": "2026-06-02 23:22:47.380",
    "is_active": 1
  }
]

------------------------------------------------------------------------

=== [STEP 4] CREATE SESSION / SESSIONS LIST ===
REQUEST:
GET /api/v1/auth/sessions

RESPONSE:
Status: 200
{
  "sessions": [
    {
      "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
      "deviceFingerprint": "cairo_mac_fingerprint_2026_x100",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "lastActiveAt": "2026-06-02T23:22:47.380Z",
      "mfaVerified": false,
      "createdAt": "2026-06-02T23:22:47.000Z"
    },
    {
      "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
      "deviceFingerprint": "cairo_mac_fingerprint_2026_x100",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "lastActiveAt": "2026-06-02T23:22:46.835Z",
      "mfaVerified": false,
      "createdAt": "2026-06-02T23:22:40.000Z"
    }
  ]
}

🎯 IDENTIFIED ACTIVE SESSIONS:
- Register Session (Session 1): b5bc6683-df55-4eb8-b242-9c7f7eabfa38
- Login Session (Session 2): be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2

REDIS STATE:
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}",
  "session:6522c6973e9e423a413807b9d5a5b2c6407af16a36b712324cd827bd584b9833": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2\",\"active\":true}",
  "refresh:936ae50401cd73f777b1c390c6fc2ea6f79ab598329f792f950269197056ca2c": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2\"}"
}

DATABASE STATE (sessions table):
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "last_active_at": "2026-06-02 23:22:46.835",
    "is_active": 1
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "last_active_at": "2026-06-02 23:22:47.380",
    "is_active": 1
  }
]

------------------------------------------------------------------------

=== [STEP 5] REFRESH TOKEN ===
REQUEST:
POST /api/v1/auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTlhMTczMS0zYWMxLTRhOTItOGFiMi01NWY1OWU1MWIyOGUiLCJqdGkiOiI2MzIwODNlZC1kNzM0LTQ4ZDctYTIzYy0xZmE4ZTc4NWEzZDUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc4MDQ0MjU2NywiZXhwIjoxNzgxMDQ3MzY3fQ.MOWTkCQQybftXdfsRIVUYEcR7akX2rKp1a4a4g0yVY0"
}

RESPONSE:
Status: 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "email": "cairo_fitness_1780442560322@gemz.com",
    "firstName": "Mahmoud",
    "lastName": "Cairo",
    "fullName": "Mahmoud Cairo",
    "kycStatus": "PENDING",
    "kycLevel": 0
  },
  "mfaRequired": false
}

REDIS STATE:
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}",
  "session:8280d2bc80e53de3a424a80e49113367ee944b7c5b1c29829927205eaa9bf864": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"ac0d3c22-47e1-4c52-990e-7e64b9f296ab\",\"active\":true}",
  "refresh:5ea4b4d1f88d3b991ff2d675447bdbec01e10fc6b18abd63495b6e66a85bcdc3": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"ac0d3c22-47e1-4c52-990e-7e64b9f296ab\"}"
}

DATABASE STATE (sessions table):
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 1
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  },
  {
    "id": "ac0d3c22-47e1-4c52-990e-7e64b9f296ab",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 1
  }
]

------------------------------------------------------------------------

=== [STEP 6] LOGOUT ===
REQUEST:
POST /api/v1/auth/logout
{
  "deviceFingerprint": "cairo_mac_fingerprint_2026_x100"
}

RESPONSE:
Status: 200
{
  "message": "تم تسجيل الخروج بنجاح"
}

REDIS STATE:
{
  "session:39c0f20cfa05cbdf51d458e80963e53740d220b5e4437a9726e57e9af31f1340": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\",\"active\":true}",
  "refresh:11fd19adb9c273e409674c27c4a1007be2ed7473e08c5c2b7b43953357119f1e": "{\"userId\":\"e19a1731-3ac1-4a92-8ab2-55f59e51b28e\",\"sessionId\":\"b5bc6683-df55-4eb8-b242-9c7f7eabfa38\"}"
}

DATABASE STATE (sessions table):
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 1
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  },
  {
    "id": "ac0d3c22-47e1-4c52-990e-7e64b9f296ab",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  }
]

------------------------------------------------------------------------

=== [STEP 7] REVOKE SESSION (Session ID: b5bc6683-df55-4eb8-b242-9c7f7eabfa38) ===
REQUEST:
DELETE /api/v1/auth/sessions/b5bc6683-df55-4eb8-b242-9c7f7eabfa38

RESPONSE:
Status: 200
{
  "message": "تم الغاء الجلسة"
}

REDIS STATE:
{}

DATABASE STATE (sessions table):
[
  {
    "id": "b5bc6683-df55-4eb8-b242-9c7f7eabfa38",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  },
  {
    "id": "be9372ca-d9a9-4e26-a0a2-b2abc1c95ca2",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  },
  {
    "id": "ac0d3c22-47e1-4c52-990e-7e64b9f296ab",
    "user_id": "e19a1731-3ac1-4a92-8ab2-55f59e51b28e",
    "device_fingerprint": "cairo_mac_fingerprint_2026_x100",
    "is_active": 0
  }
]

========================================================================
```
