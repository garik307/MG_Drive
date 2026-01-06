
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'http://localhost:3300';
const USER_TOKEN = __ENV.TOKEN;

export let options = {
    scenarios: {
        cold_start: {
            executor: 'shared-iterations',
            vus: 10,
            iterations: 100, // First 100 requests
            maxDuration: '30s',
        },
    },
    thresholds: {
        // Cold start might be slower, but p95 shouldn't be catastrophic
        http_req_duration: ['p(95)<1000'], // Allow up to 1s for cold start (DB connection, etc)
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const params = {
        headers: {
            'Authorization': `Bearer ${USER_TOKEN}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache', // Try to bypass client side, though server has Redis
        },
    };

    // Access list endpoint
    let res = http.get(`${BASE_URL}/api/v1/tests`, params);
    
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time acceptable': (r) => r.timings.duration < 2000,
    });
}
