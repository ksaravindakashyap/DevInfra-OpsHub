import { test, expect } from '@playwright/test';

test.describe('Deployments', () => {
  test.beforeEach(async ({ page, request }) => {
    // Login as developer
    await request.post('http://localhost:4000/test/login-as', {
      data: { email: 'dev@demo.local' },
    });
  });

  test('should view deployments', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to Frontend App project
    await page.getByText('Demo Org').click();
    await page.getByText('Frontend App').click();

    // Should see deployments tab (default)
    await expect(page.getByText('Deployments')).toBeVisible();
    
    // Should see existing deployments from seed data
    await expect(page.getByText('PR #100')).toBeVisible();
  });

  test('should trigger webhook for preview deployment', async ({ page, request }) => {
    // Simulate GitHub webhook for PR opened
    const webhookPayload = {
      action: 'opened',
      number: 999,
      pull_request: {
        number: 999,
        head: { ref: 'feature/test-e2e' },
        merged: false,
      },
      repository: {
        full_name: 'demo-org/frontend-app',
      },
    };

    // Send webhook (this would normally require signature verification)
    const response = await request.post('http://localhost:4000/webhooks/github', {
      data: webhookPayload,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=test-signature', // Mock signature for testing
      },
    });

    // Should accept the webhook
    expect(response.status()).toBeOneOf([200, 202]);

    // Navigate to project to see new deployment
    await page.goto('/dashboard');
    await page.getByText('Demo Org').click();
    await page.getByText('Frontend App').click();

    // Should see the new deployment (may take a moment to process)
    await expect(page.getByText('PR #999')).toBeVisible({ timeout: 10000 });
  });
});
