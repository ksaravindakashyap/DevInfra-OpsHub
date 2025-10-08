import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s'
};

const API = __ENV.API_BASE_URL || 'http://localhost:4000';

export default function () {
  // Hit health endpoint
  let res = http.get(`${API}/healthz`);
  check(res, { 'health 200': (r) => r.status === 200 });

  // Test orgs list (unauth 401 is OK)
  res = http.get(`${API}/orgs`);
  check(res, { 'orgs status': (r) => [200,401].includes(r.status) });

  // Test projects list (unauth 401 is OK)
  res = http.get(`${API}/projects`);
  check(res, { 'projects status': (r) => [200,401].includes(r.status) });

  // Test webhook endpoint with mock payload
  const payload = JSON.stringify({
    action: 'opened',
    number: 42,
    pull_request: { 
      number: 42, 
      head: { ref: 'feature/x' }, 
      merged: false 
    },
    repository: { 
      full_name: 'octocat/Hello-World' 
    }
  });
  
  res = http.post(`${API}/webhooks/github`, payload, {
    headers: { 
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': 'sha256=test-signature'
    }
  });
  check(res, { 'webhook accepted': (r) => [200, 202, 400].includes(r.status) });

  // Test metrics endpoint (unauth 401 is OK)
  res = http.get(`${API}/projects/test-project-id/metrics/deploy`);
  check(res, { 'metrics status': (r) => [200,401,404].includes(r.status) });

  sleep(1);
}
