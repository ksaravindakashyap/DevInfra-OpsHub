import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login with test user and see dashboard', async ({ page, request }) => {
    // Call test login endpoint
    await request.post('http://localhost:4000/test/login-as', {
      data: { email: 'owner@demo.local' },
    });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Should see the demo organization
    await expect(page.getByText('Demo Org')).toBeVisible();
    
    // Should see projects
    await expect(page.getByText('Frontend App')).toBeVisible();
    await expect(page.getByText('Backend API')).toBeVisible();
  });

  test('should create new user via test login', async ({ page, request }) => {
    // Call test login with new email
    await request.post('http://localhost:4000/test/login-as', {
      data: { email: 'newuser@demo.local' },
    });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Should see the demo organization (auto-created)
    await expect(page.getByText('Demo Org')).toBeVisible();
  });
});
