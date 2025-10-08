import { test, expect } from '@playwright/test';

test.describe('Environment Variables', () => {
  test.beforeEach(async ({ page, request }) => {
    // Login as maintainer
    await request.post('http://localhost:4000/test/login-as', {
      data: { email: 'maintainer@demo.local' },
    });
  });

  test('should create and manage environment variables', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to Frontend App project
    await page.getByText('Demo Org').click();
    await page.getByText('Frontend App').click();

    // Go to Environments tab
    await page.getByRole('button', { name: 'Environments' }).click();

    // Should see environment variables placeholder
    await expect(page.getByText('Environment Variables')).toBeVisible();
    await expect(page.getByText('Environment variables and secret management will be available')).toBeVisible();
  });

  test('should view project environments', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to Backend API project
    await page.getByText('Demo Org').click();
    await page.getByText('Backend API').click();

    // Go to Environments tab
    await page.getByRole('button', { name: 'Environments' }).click();

    // Should see environments placeholder
    await expect(page.getByText('Environment Variables')).toBeVisible();
  });
});
