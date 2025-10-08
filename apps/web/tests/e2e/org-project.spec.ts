import { test, expect } from '@playwright/test';

test.describe('Organization and Project Management', () => {
  test.beforeEach(async ({ page, request }) => {
    // Login as owner
    await request.post('http://localhost:4000/test/login-as', {
      data: { email: 'owner@demo.local' },
    });
  });

  test('should create a new project', async ({ page }) => {
    await page.goto('/dashboard');

    // Go to Demo Org
    await page.getByText('Demo Org').click();

    // Click create project button
    await page.getByRole('button', { name: 'Create Project' }).click();

    // Fill project form
    const projectName = `Test Project ${Date.now()}`;
    await page.getByLabel('Project Name').fill(projectName);
    await page.getByLabel('Repository').fill('demo-org/test-repo');
    await page.getByLabel('Description').fill('Test project for E2E testing');

    // Submit form
    await page.getByRole('button', { name: 'Create Project' }).click();

    // Should see success message and new project
    await expect(page.getByText('Project created successfully')).toBeVisible();
    await expect(page.getByText(projectName)).toBeVisible();
  });

  test('should view project details', async ({ page }) => {
    await page.goto('/dashboard');

    // Go to Demo Org
    await page.getByText('Demo Org').click();

    // Click on Frontend App project
    await page.getByText('Frontend App').click();

    // Should see project details
    await expect(page.getByText('Frontend App')).toBeVisible();
    await expect(page.getByText('demo-org/frontend-app')).toBeVisible();
  });
});
