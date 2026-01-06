
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// --- CONFIGURATION ---
const BASE_URL = 'http://localhost:3300';
const USER_TOKEN = __ENV.TOKEN; // Pass via -e TOKEN=...

export let options = {
    scenarios: {
        read_heavy: {
            executor: 'constant-vus',
            vus: 100,
            duration: '2m',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'], // ONLY 5xx
        http_req_duration: ['p(95)<200'], 
        checks: ['rate>0.95'], 
    },
};

// --- HELPER FUNCTIONS ---
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const standardCheck = (res) => {
    return {
        'acceptable response': r => 
            [200, 201, 204, 400, 404, 409, 429].includes(r.status),

        'no server error': r => r.status < 500,
    };
};

// --- MAIN TEST ---
export default function () {
    const params = {
        headers: {
            'Authorization': `Bearer ${USER_TOKEN}`,
            'Content-Type': 'application/json',
        },
        expected_response: true // CRITICAL
    };

    const rand = Math.random();

    if (rand < 0.80) {
        // 80% GET /api/v1/tests (List)
        let res = http.get(`${BASE_URL}/api/v1/tests`, params);
        check(res, standardCheck(res));
    } else if (rand < 0.95) {
        // 15% GET /api/v1/tests/:id (Single)
        const id = getRandomInt(1, 5); 
        let res = http.get(`${BASE_URL}/api/v1/tests/${id}`, params);
        check(res, standardCheck(res));
    } else {
        // 5% POST
        const payload = JSON.stringify({
            title: `Load Test ${Date.now()}-${getRandomInt(1, 10000)}`,
            number: getRandomInt(100000, 999999), 
        });

        let res = http.post(`${BASE_URL}/api/v1/tests`, payload, params);
        check(res, {
            ...standardCheck(res),
            'auth/create check': r => [201, 403, 401, 400, 409, 429].includes(r.status),
        });
    }

    sleep(1);
}
