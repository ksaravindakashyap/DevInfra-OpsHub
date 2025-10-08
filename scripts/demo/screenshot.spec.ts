import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// Ensure screenshots directory exists
const screenshotsDir = join(process.cwd(), 'docs', 'screenshots');
mkdirSync(screenshotsDir, { recursive: true });

test.describe('Demo Screenshots', () => {
  test('generate demo screenshots', async ({ page, request }) => {
    // Login as demo user
    await request.post('http://localhost:4000/test/login-as', {
      data: { email: 'owner@demo.local' },
    });

    // 1. Dashboard
    await page.goto('/dashboard');
    await expect(page.getByText('Demo Org')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/01-dashboard.png' });

    // 2. Organization view
    await page.getByText('Demo Org').click();
    await expect(page.getByText('Frontend App')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/02-org.png' });

    // 3. Project settings
    await page.getByText('Frontend App').click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('GitHub Webhook')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/03-settings.png' });

    // 4. Environment variables
    await page.getByRole('button', { name: 'Environments' }).click();
    await expect(page.getByText('Environment Variables')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/04-envs.png' });

    // 5. Health monitoring
    await page.getByRole('button', { name: 'Health' }).click();
    await expect(page.getByText('Health Monitoring')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/05-health.png' });

    // 6. Analytics
    await page.getByRole('button', { name: 'Analytics' }).click();
    await expect(page.getByText('Deploy Analytics')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/06-analytics.png' });

    // 7. Deployments (after opening a PR)
    await page.getByRole('button', { name: 'Deployments' }).click();
    await expect(page.getByText('Deployments')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/07-deployments.png' });
  });
});
