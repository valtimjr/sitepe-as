import { test, expect } from '@playwright/test';

test.describe('Minha Lista: nuvem pelo menu do cartão', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('welcome_notice_accepted', 'true');
      localStorage.setItem('cookie_consent_given', 'true');
    });
  });

  test('Salvar na nuvem pede login quando o usuário não está logado', async ({ page }) => {
    await page.goto('/usina_vale/parts-list', { timeout: 15000 });

    await page
      .getByRole('region', { name: 'Navegação de Listas de Peças' })
      .getByRole('button', { name: 'Opções da lista' })
      .first()
      .click({ timeout: 15000 });

    // Lista nova ainda não tem cópia na nuvem
    await expect(page.getByRole('menuitem', { name: 'Atualizar na nuvem' })).toHaveAttribute('data-disabled', '');

    await page.getByRole('menuitem', { name: 'Salvar na nuvem' }).click();
    await expect(page.getByRole('dialog', { name: 'Entrar no AutoBoard' })).toBeVisible();
  });
});
