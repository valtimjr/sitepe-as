import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.describe('Mobile: barra de navegação inferior', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('welcome_notice_accepted', 'true');
      localStorage.setItem('cookie_consent_given', 'true');
    });
  });

  test('navega entre as abas pela barra inferior', async ({ page }) => {
    await page.goto('/usina_vale', { timeout: 15000 });

    const nav = page.getByTestId('bottom-nav');
    await expect(nav).toBeVisible({ timeout: 15000 });

    await page.getByTestId('bottom-nav-list').click();
    await expect(page).toHaveURL(/\/usina_vale\/parts-list$/);
    await expect(page.getByTestId('bottom-nav-list')).toHaveAttribute('aria-current', 'page');

    await page.getByTestId('bottom-nav-orders').click();
    await expect(page).toHaveURL(/\/usina_vale\/service-orders$/);

    await page.getByTestId('bottom-nav-home').click();
    await expect(page).toHaveURL(/\/usina_vale\/?$/);
  });
});
