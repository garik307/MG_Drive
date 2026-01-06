import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '40s', target: 50 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95'],
  },
};

const BASE_URL = 'http://localhost:3300'; // ⚠️ ստուգիր՝ սա է իրական backend-ը

export default function () {
  const payload = JSON.stringify({
    email: `user_${__VU}_${Date.now()}@test.com`,
    password: 'Test12345!',
    name: `User_${__VU}`,
    // Generate random 8-digit number and prepend 0
    phone: `0${Math.floor(10000000 + Math.random() * 90000000)}`,
  });

  const res = http.post(
    `${BASE_URL}/api/v1/user/signUp`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  // 🔥 ԱՅՍ ՏՈՂԸ ՀԻՄԱ ՃԻՇՏ ՏԵՂՈՒՄ Է
  if (![201, 400, 409].includes(res.status)) {
    console.log('UNEXPECTED STATUS:', res.status);
  }

  check(res, {
    'acceptable register outcome': r =>
      r.status === 201 || r.status === 400 || r.status === 409,
    'no server error': r => r.status < 500,
  });

  sleep(1);
}
