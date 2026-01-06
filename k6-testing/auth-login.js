import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 20 },
    { duration: '40s', target: 100 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p95<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:330';

export default function () {
  const payload = JSON.stringify({
    email: 'karen_ask@gmail.com',
    password: 'sD120a6',
  });

  const res = http.post(
    `${BASE_URL}/api/v1/user/signUp`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'login ok': r => r.status === 200,
    'has token': r => r.json('token') !== undefined,
  });

  sleep(1);
}
