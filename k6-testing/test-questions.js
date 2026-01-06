import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

/* ========== METRICS ========== */

const bizSuccess = new Counter('biz_success');
const biz4xx = new Counter('biz_4xx');
const biz5xx = new Counter('biz_5xx');

/* ========== CONFIG ========== */

export const options = {
  scenarios: {
    test_questions: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '40s', target: 50 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.99'],

    // Heavy endpoint SLA
    http_req_duration: [
      'p(90)<200',
      'p(95)<400',
      'p(99)<700',
    ],
  },
};

const BASE_URL = 'http://localhost:3300';
const TOKEN = 'PASTE_REAL_JWT_HERE';

/* ========== TEST ========== */

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    expected_response: true,
  };

  const res = http.get(`${BASE_URL}/api/v1/tests/2`, params);

  if (res.status >= 200 && res.status < 300) bizSuccess.add(1);
  else if (res.status >= 400 && res.status < 500) biz4xx.add(1);
  else biz5xx.add(1);

  check(res, {
    'status 200': r => r.status === 200,
    'questions field exists': r => r.json('questions') !== undefined,
    'no 5xx': r => r.status < 500,
  });


  sleep(1);
}
