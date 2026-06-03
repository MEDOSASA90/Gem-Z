const crypto = require('crypto');
const Redis = require('ioredis');
const sqlite3 = require('sqlite3').verbose();

const API_URL = 'http://localhost:3000/api/v1/auth';

// Setup clients
const redis = new Redis({ host: '127.0.0.1', port: 6379 });
const db = new sqlite3.Database('gemz.sqlite');

function queryDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runDbUpdate(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function bruteForceSMSCode(targetHash) {
  for (let i = 0; i <= 999999; i++) {
    const code = String(i).padStart(6, '0');
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    if (hash === targetHash) {
      return code;
    }
  }
  return null;
}

async function getRedisDump() {
  const dump = await redis.send_command('CUSTOM_DUMP');
  return JSON.parse(dump);
}

async function runDemo() {
  console.log('========================================================================');
  console.log('🚀 GEM Z - PHASE 1: ENTERPRISE ACCEPTANCE END-TO-END DEMO');
  console.log('========================================================================\n');

  const email = `cairo_fitness_${Date.now()}@gemz.com`;
  const password = 'CairoSecurePassword2026!';
  const deviceInfo = {
    fingerprint: 'cairo_mac_fingerprint_2026_x100',
    ip: '197.34.120.45', // Egyptian Telecom IP Address
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  };

  let registerToken = '';
  let loginToken = '';
  let loginRefreshToken = '';
  let rotatedToken = '';
  let rotatedRefreshToken = '';
  let userId = '';
  let session1Id = ''; // Register session
  let session2Id = ''; // Login session

  // ------------------------------------------------------------------------
  // 1. REGISTER USER
  // ------------------------------------------------------------------------
  {
    console.log('=== [STEP 1] REGISTER USER ===');
    const body = {
      email,
      password,
      firstName: 'Mahmoud',
      lastName: 'Cairo',
      country: 'EG',
      phone: `+2010${Math.floor(10000000 + Math.random() * 90000000)}`,
      deviceInfo,
    };
    console.log('REQUEST:');
    console.log('POST /api/v1/auth/register');
    console.log(JSON.stringify(body, null, 2));

    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    console.log('\nRESPONSE:');
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(result, null, 2));

    // Save tokens and userId
    registerToken = result.accessToken;
    userId = result.user.id;

    // Trust this device in SQLite directly to allow seamless login in Step 3
    const trustedDevicesJson = JSON.stringify([{
      fingerprint: deviceInfo.fingerprint,
      name: deviceInfo.userAgent,
      trustedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    }]);
    await runDbUpdate('UPDATE users SET trusted_devices = ? WHERE id = ?', [trustedDevicesJson, userId]);
    console.log(`\n🔒 DEVICE '${deviceInfo.fingerprint}' MARKED AS TRUSTED IN SQLITE FOR SEAMLESS PASSWORD-ONLY E2E LOGIN`);

    // Get State
    const redisState = await getRedisDump();
    const dbState = await queryDb('SELECT id, email, first_name, last_name, status, kyc_status FROM users WHERE id = ?', [userId]);

    console.log('\nREDIS STATE:');
    console.log(JSON.stringify(redisState, null, 2));

    console.log('\nDATABASE STATE (users table):');
    console.log(JSON.stringify(dbState, null, 2));
    console.log('\n------------------------------------------------------------------------\n');
  }

  // ------------------------------------------------------------------------
  // 2. VERIFY OTP (SMS Setup and Verification)
  // ------------------------------------------------------------------------
  {
    console.log('=== [STEP 2] VERIFY OTP (SMS MFA Setup and Verification) ===');
    
    // Setup MFA
    console.log('REQUEST 1:');
    console.log('POST /api/v1/auth/mfa/setup');
    const setupBody = { method: 'sms' };
    console.log(JSON.stringify(setupBody, null, 2));

    const setupResponse = await fetch(`${API_URL}/mfa/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${registerToken}`,
      },
      body: JSON.stringify(setupBody),
    });
    const setupResult = await setupResponse.json();
    console.log('\nRESPONSE 1:');
    console.log(`Status: ${setupResponse.status}`);
    console.log(JSON.stringify(setupResult, null, 2));

    // Resolve OTP Code from Redis Mock
    const redisStateBefore = await getRedisDump();
    const codeHash = redisStateBefore[`mfa:code:${userId}:sms`];
    console.log(`\n🔑 RESOLVING DYNAMIC SMS OTP FROM REDIS HASH: ${codeHash}`);
    const resolvedCode = bruteForceSMSCode(codeHash);
    console.log(`🎯 OTP CODE RESOLVED SUCCESSFULLY: ${resolvedCode}`);

    // Verify OTP
    console.log('\nREQUEST 2:');
    console.log('POST /api/v1/auth/mfa/verify');
    const verifyBody = { method: 'sms', code: resolvedCode };
    console.log(JSON.stringify(verifyBody, null, 2));

    const verifyResponse = await fetch(`${API_URL}/mfa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${registerToken}`,
      },
      body: JSON.stringify(verifyBody),
    });
    const verifyResult = await verifyResponse.json();
    console.log('\nRESPONSE 2:');
    console.log(`Status: ${verifyResponse.status}`);
    console.log(JSON.stringify(verifyResult, null, 2));

    // Get State
    const redisState = await getRedisDump();
    const dbState = await queryDb('SELECT id, user_id, device_fingerprint, mfa_verified, is_active FROM sessions WHERE user_id = ?', [userId]);

    console.log('\nREDIS STATE:');
    console.log(JSON.stringify(redisState, null, 2));

    console.log('\nDATABASE STATE (sessions table):');
    console.log(JSON.stringify(dbState, null, 2));
    console.log('\n------------------------------------------------------------------------\n');
  }

  // ------------------------------------------------------------------------
  // 3. LOGIN
  // ------------------------------------------------------------------------
  {
    console.log('=== [STEP 3] LOGIN ===');
    const loginBody = {
      email,
      password,
      deviceInfo,
    };
    console.log('REQUEST:');
    console.log('POST /api/v1/auth/login');
    console.log(JSON.stringify(loginBody, null, 2));

    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody),
    });
    const result = await response.json();
    console.log('\nRESPONSE:');
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(result, null, 2));

    // Save login tokens
    loginToken = result.accessToken;
    loginRefreshToken = result.refreshToken;

    // Get State
    const redisState = await getRedisDump();
    const dbState = await queryDb('SELECT id, user_id, device_fingerprint, mfa_verified, is_active FROM sessions WHERE user_id = ?', [userId]);

    console.log('\nREDIS STATE:');
    console.log(JSON.stringify(redisState, null, 2));

    console.log('\nDATABASE STATE (sessions table):');
    console.log(JSON.stringify(dbState, null, 2));
    console.log('\n------------------------------------------------------------------------\n');
  }

  // ------------------------------------------------------------------------
  // 4. CREATE SESSION / LIST ACTIVE SESSIONS
  // ------------------------------------------------------------------------
  {
    console.log('=== [STEP 4] CREATE SESSION / SESSIONS LIST ===');
    console.log('REQUEST:');
    console.log('GET /api/v1/auth/sessions');

    const response = await fetch(`${API_URL}/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginToken}`,
      },
    });
    const result = await response.json();
    console.log('\nRESPONSE:');
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(result, null, 2));

    // Map the active sessions (we expect 2 sessions)
    session2Id = result.sessions[0].id; // The current login session (most recently active)
    session1Id = result.sessions[1] ? result.sessions[1].id : result.sessions[0].id; // The register session

    console.log(`\n🎯 IDENTIFIED ACTIVE SESSIONS:`);
    console.log(`- Register Session (Session 1): ${session1Id}`);
    console.log(`- Login Session (Session 2): ${session2Id}`);

    // Get State
    const redisState = await getRedisDump();
    const dbState = await queryDb('SELECT id, user_id, device_fingerprint, last_active_at, is_active FROM sessions WHERE user_id = ?', [userId]);

    console.log('\nREDIS STATE:');
    console.log(JSON.stringify(redisState, null, 2));

    console.log('\nDATABASE STATE (sessions table):');
    console.log(JSON.stringify(dbState, null, 2));
    console.log('\n------------------------------------------------------------------------\n');
  }

  // ------------------------------------------------------------------------
  // 5. REFRESH TOKEN
  // ------------------------------------------------------------------------
  {
    console.log('=== [STEP 5] REFRESH TOKEN ===');
    const refreshBody = { refreshToken: loginRefreshToken };
    console.log('REQUEST:');
    console.log('POST /api/v1/auth/refresh');
    console.log(JSON.stringify(refreshBody, null, 2));

    const response = await fetch(`${API_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refreshBody),
    });
    const result = await response.json();
    console.log('\nRESPONSE:');
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(result, null, 2));

    // Save rotated tokens
    rotatedToken = result.accessToken;
    rotatedRefreshToken = result.refreshToken;

    // Get State
    const redisState = await getRedisDump();
    const dbState = await queryDb('SELECT id, user_id, device_fingerprint, is_active FROM sessions WHERE user_id = ?', [userId]);

    console.log('\nREDIS STATE:');
    console.log(JSON.stringify(redisState, null, 2));

    console.log('\nDATABASE STATE (sessions table):');
    console.log(JSON.stringify(dbState, null, 2));
    console.log('\n------------------------------------------------------------------------\n');
  }

  // ------------------------------------------------------------------------
  // 6. LOGOUT
  // ------------------------------------------------------------------------
  {
    console.log('=== [STEP 6] LOGOUT ===');
    const logoutBody = { deviceFingerprint: deviceInfo.fingerprint };
    console.log('REQUEST:');
    console.log('POST /api/v1/auth/logout');
    console.log(JSON.stringify(logoutBody, null, 2));

    const response = await fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rotatedToken}`,
      },
      body: JSON.stringify(logoutBody),
    });
    const result = await response.json();
    console.log('\nRESPONSE:');
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(result, null, 2));

    // Get State
    const redisState = await getRedisDump();
    const dbState = await queryDb('SELECT id, user_id, device_fingerprint, is_active FROM sessions WHERE user_id = ?', [userId]);

    console.log('\nREDIS STATE:');
    console.log(JSON.stringify(redisState, null, 2));

    console.log('\nDATABASE STATE (sessions table):');
    console.log(JSON.stringify(dbState, null, 2));
    console.log('\n------------------------------------------------------------------------\n');
  }

  // ------------------------------------------------------------------------
  // 7. REVOKE SESSION
  // ------------------------------------------------------------------------
  {
    console.log(`=== [STEP 7] REVOKE SESSION (Session ID: ${session1Id}) ===`);
    console.log('REQUEST:');
    console.log(`DELETE /api/v1/auth/sessions/${session1Id}`);

    const response = await fetch(`${API_URL}/sessions/${session1Id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${registerToken}`,
      },
    });
    const result = await response.json();
    console.log('\nRESPONSE:');
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(result, null, 2));

    // Get State
    const redisState = await getRedisDump();
    const dbState = await queryDb('SELECT id, user_id, device_fingerprint, is_active FROM sessions WHERE user_id = ?', [userId]);

    console.log('\nREDIS STATE:');
    console.log(JSON.stringify(redisState, null, 2));

    console.log('\nDATABASE STATE (sessions table):');
    console.log(JSON.stringify(dbState, null, 2));
    console.log('\n========================================================================\n');
  }

  // Close connections
  db.close();
  redis.disconnect();
}

runDemo().catch(console.error);
