
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3300';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN; // Admin token required for writes

export let options = {
    scenarios: {
        write_race: {
            executor: 'constant-vus',
            vus: 50,
            duration: '1m',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'], // Fail if more than 1% errors (excluding 409/400 business errors)
        checks: ['rate>0.99'],
    },
};

export default function () {
    const params = {
        headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
        },
    };

    // Shared ID or Resource to target for collisions
    const collisionId = 99999; 
    const randomSuffix = Math.floor(Math.random() * 1000);

    // 1. Parallel CREATE (Collision on Unique Field e.g. number)
    // We try to create a test with the SAME number to trigger race condition / duplicate check
    const createPayload = JSON.stringify({
        title: `Race Test ${randomSuffix}`,
        number: 888888, // Fixed number to force collision
    });

    let resCreate = http.post(`${BASE_URL}/api/v1/tests`, createPayload, params);
    
    // 201 = Created, 409 = Conflict (Handled), 400 = Bad Request
    // 500 = FAIL
    check(resCreate, {
        'create status handled': (r) => [201, 409, 400].includes(r.status),
        'no 500 on create': (r) => r.status !== 500,
    });

    // 2. Parallel UPDATE
    // Try to update the same resource
    const updatePayload = JSON.stringify({
        title: `Updated Title ${Date.now()}`,
    });
    
    // Use a valid ID that exists (e.g., 1)
    let resUpdate = http.patch(`${BASE_URL}/api/v1/tests/1`, updatePayload, params);
    
    check(resUpdate, {
        'update status handled': (r) => [200, 404, 400].includes(r.status),
        'no 500 on update': (r) => r.status !== 500,
    });

    sleep(0.5);
}
