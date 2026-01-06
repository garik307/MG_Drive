import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '40s', target: 50 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3300';

export default function () {
  const payload = JSON.stringify({
    email: `user_${__VU}_${Date.now()}@test.com`,
    password: 'Test12345!',
  });

  const res = http.post(
    `${BASE_URL}/api/v1/user/signIn`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'register ok': r => r.status === 200 || r.status === 201,
  });

  sleep(1);
}
