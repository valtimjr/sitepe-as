import { test, expect } from '@playwright/test';

test.describe('Critical User Journey - Parts List Management', () => {
  test('should search for a part, add it to the list, and verify it in the parts list page', async ({ page }) => {
    // 1. Navigate to the home page
    await page.goto('/usina_vale');

    // 2. Verify we are on the home page and the branding is visible
    await expect(page.locator('h1 img')).toBeVisible();

    // 3. Locate the search input in the header and search for a part
    const searchInput = page.getByPlaceholder('Pesquisar peça');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('4840');

    // 4. Wait for the search results dropdown to appear
    const resultItem = page.getByText('POLIA ELEVADOR JOHN DEERE CB11421303 - LISA');
    await expect(resultItem).toBeVisible();

    // 5. Click the "+" button to open the rapid-add popover
    const addBtn = page.locator('.rapid-add-popover-content').isHidden() 
      ? page.getByTitle('Adicionar rápido à lista').first()
      : page.locator('button').filter({ hasText: 'Plus' }).first();
    await addBtn.click();

    // 6. Fill in the quantity and AF/Frota in the popover
    const qtyInput = page.getByLabel('Quantidade');
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill('3');

    const afInput = page.getByLabel('AF / Frota (Opcional)');
    await expect(afInput).toBeVisible();
    await afInput.fill('AF123');

    // 7. Click "Adicionar" to add the part to the list
    const submitBtn = page.getByRole('button', { name: 'Adicionar', exact: true });
    await submitBtn.click();

    // 8. Verify success toast or that the popover closed
    await expect(qtyInput).not.toBeVisible();

    // 9. Navigate to the parts list page
    await page.goto('/usina_vale/parts-list');

    // 10. Verify that the added part is visible in the list
    await expect(page.getByText('POLIA ELEVADOR JOHN DEERE CB11421303 - LISA')).toBeVisible();
    await expect(page.getByText('AF123')).toBeVisible();
  });
});
