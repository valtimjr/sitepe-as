import { test, expect } from '@playwright/test';

test.describe('Minha Lista: ícone personalizado', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('welcome_notice_accepted', 'true');
      localStorage.setItem('cookie_consent_given', 'true');
    });
  });

  test('cria uma lista com ícone Lucide e cor de fundo', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/usina_vale/parts-list', { timeout: 15000 });

    await page.getByRole('button', { name: 'Nova Lista' }).click({ timeout: 15000 });
    const dialog = page.getByRole('dialog', { name: 'Criar Nova Lista' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Nome da Lista').fill('Ícone E2E');

    // Escolhe o ícone Truck pela busca em PT
    await dialog.getByTestId('edit-list-icon').click();
    const picker = page.getByTestId('icon-picker');
    await picker.getByRole('tab', { name: 'Lucide' }).click();
    await picker.getByTestId('lucide-icon-search').fill('caminhão');
    await picker.getByTestId('lucide-icon-Truck').click({ timeout: 15000 });
    await expect(picker).toBeHidden();

    const preview = dialog.getByTestId('list-icon');
    await expect(preview).toHaveAttribute('data-icon-value', 'Truck');

    // Cor de fundo azul pela paleta
    await dialog.getByTestId('list-icon-background').click();
    const colorDialog = page.getByTestId('color-picker-dialog');
    await expect(colorDialog).toBeVisible();
    await colorDialog.getByRole('button', { name: 'Cor #3b82f6' }).click();
    await expect(colorDialog).toBeHidden();

    await dialog.getByRole('button', { name: 'Criar Lista' }).click();
    await expect(dialog).toBeHidden();

    const cardIcon = page
      .getByRole('region', { name: 'Navegação de Listas de Peças' })
      .locator('[data-testid="list-icon"][data-icon-source="lucide"][data-icon-value="Truck"]')
      .first();
    await expect(cardIcon).toBeVisible({ timeout: 15000 });
    await expect(cardIcon).toHaveCSS('background-color', 'rgb(59, 130, 246)');
  });
});
