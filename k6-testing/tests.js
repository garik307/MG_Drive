import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

/* ================= METRICS ================= */

const bizSuccess = new Counter('biz_success');
const biz4xx = new Counter('biz_4xx');
const biz5xx = new Counter('biz_5xx');
const authFailures = new Counter('auth_failures');

/* ================= CONFIG ================= */

export const options = {
  scenarios: {
    auth_read: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      exec: 'readScenario',
    },
    write_ops: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      exec: 'writeScenario',
    },
  },

  thresholds: {
    http_req_duration: [
      'p(95)<200',    // Aggressive Production SLA
      'p(99)<500',
    ],
    // http_req_failed: ['rate<0.01'], // Disabled because Rate Limiting (429) is expected under saturation
    checks: ['rate>0.99'],
    biz_5xx: ['count<1'], // Zero tolerance for 500s
  },
};

const BASE_URL = 'http://localhost:3300';

/* ================= SETUP ================= */

export function setup() {
  const users = [];

  for (let i = 0; i < 20; i++) {
    const email = `k6_${Date.now()}_${i}@test.com`;
    const password = 'Test12345!';
    const phone = `0${Math.floor(10000000 + Math.random() * 90000000)}`; // 0 + 8 digits = 9 digits total
    const payload = JSON.stringify({ email, password, name: 'Load User', phone });

    const res = http.post(`${BASE_URL}/api/v1/user/signUp`, payload, {
      headers: { 'Content-Type': 'application/json' },
      expected_response: true,
    });

    if (res.status === 201) {
      users.push(res.json('token'));
    } else {
      console.log(`Setup failed for user ${i}: ${res.status} - ${res.body}`);
    }
  }

  if (!users.length) {
    throw new Error('SETUP FAILED: no users created');
  }

  return users;
}

/* ================= HELPERS ================= */

function track(res) {
  if (res.status >= 200 && res.status < 300) bizSuccess.add(1);
  else if (res.status >= 400 && res.status < 500) biz4xx.add(1);
  else biz5xx.add(1);
}

function baseChecks(res) {
  return check(res, {
    'status valid': r => [200, 201, 400, 401, 403, 404, 409, 429].includes(r.status),
    'no 5xx': r => r.status < 500,
    'json ok': r => !r.body || r.headers['Content-Type']?.includes('application/json'),
  });
}

/* ================= SCENARIOS ================= */

export function readScenario(tokens) {
  const token = tokens[Math.floor(Math.random() * tokens.length)];

  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    expected_response: true,
  };

  const res = http.get(`${BASE_URL}/api/v1/tests?page=${Math.random() * 50}`, params);
  track(res);
  baseChecks(res);

  sleep(1);
}

export function writeScenario(tokens) {
  const token = tokens[Math.floor(Math.random() * tokens.length)];

  const payload = JSON.stringify({
    title: `Test ${Math.random()}`,
    number: Math.floor(Math.random() * 100000),
  });

  const res = http.post(`${BASE_URL}/api/v1/tests`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    expected_response: true,
  });

  if (res.status === 401 || res.status === 403) {
    authFailures.add(1);
  }

  track(res);
  baseChecks(res);

  sleep(1.5);
}
