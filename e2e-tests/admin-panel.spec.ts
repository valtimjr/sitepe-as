import { test, expect, type Page } from '@playwright/test';

const PART = { id: 'part-1', codigo: 'TEST-001', descricao: 'Filtro de óleo motor', tags: '', name: '', itens_relacionados: [] };
const AF = { id: 'af-1', af_number: 'AF-123', descricao: 'Frota de teste' };

// Simula um administrador pelo cache local da sessão e responde as tabelas com dados fixos
async function setupAdmin(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('welcome_notice_accepted', 'true');
    localStorage.setItem('cookie_consent_given', 'true');
    const user = { id: 'e2e-admin', email: 'admin@e2e.test' };
    localStorage.setItem('autoboard_cached_session_v2', JSON.stringify({ access_token: 'e2e', user }));
    localStorage.setItem('autoboard_cached_user_v2', JSON.stringify(user));
    localStorage.setItem('autoboard_cached_profile_v2', JSON.stringify({ id: 'e2e-admin', role: 'admin', first_name: 'Admin' }));
  });
  await page.route(/\/rest\/v1\/parts(\?|$)/, route =>
    route.fulfill({ json: [PART], headers: { 'content-range': '0-0/1' } }),
  );
  await page.route(/\/rest\/v1\/afs(\?|$)/, route =>
    route.fulfill({ json: [AF], headers: { 'content-range': '0-0/1' } }),
  );
}

test.describe('Painel Administração', () => {
  test('celular: lista de seções, abrir Peças, editar pelo menu e voltar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAdmin(page);
    await page.goto('/usina_vale/admin');

    const list = page.getByTestId('admin-section-list');
    await expect(list).toBeVisible();
    await list.getByTestId('home-menu-row').filter({ hasText: 'Peças' }).click();

    await expect(page).toHaveURL(/secao=pecas/);
    const card = page.getByTestId('admin-item-card').filter({ hasText: 'TEST-001' });
    await expect(card).toBeVisible();

    await card.getByTestId('admin-item-actions').click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    await expect(page.getByText('Editar Peça')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByText('Editar Peça')).toBeHidden();

    await page.getByTestId('admin-section-back').click();
    await expect(page.getByTestId('admin-section-list')).toBeVisible();
    await expect(page).not.toHaveURL(/secao=/);
  });

  test('web: barra lateral troca a seção e o link direto abre AFs', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAdmin(page);
    await page.goto('/usina_vale/admin?secao=afs');

    const sidebar = page.getByTestId('admin-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole('cell', { name: 'AF-123', exact: true })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Peças' }).click();
    await expect(page).toHaveURL(/secao=pecas/);
    await expect(page.getByRole('cell', { name: 'TEST-001', exact: true })).toBeVisible();
  });
});
