import { test, expect, type Page } from '@playwright/test';
import { mockCatalog } from './fixtures/catalog';

// Administrador pelo cache local da sessão + menu e listas fixos (fixtures/catalog)
async function setupAdminMenus(page: Page) {
  await mockCatalog(page);
  await page.addInitScript(() => {
    const user = { id: 'e2e-admin', email: 'admin@e2e.test' };
    localStorage.setItem('autoboard_cached_session_v2', JSON.stringify({ access_token: 'e2e', user }));
    localStorage.setItem('autoboard_cached_user_v2', JSON.stringify(user));
    localStorage.setItem('autoboard_cached_profile_v2', JSON.stringify({ id: 'e2e-admin', role: 'admin', first_name: 'Admin' }));
  });
  // Salvamento do menu (upsert em app_config)
  await page.route(/\/rest\/v1\/app_config/, route =>
    route.request().method() === 'POST' ? route.fulfill({ status: 201, json: [] }) : route.fallback(),
  );
}

const noHorizontalScroll = async (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('Menus & Listas no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('árvore sem rolagem lateral, ⋯ em folha e "Editar na lista"', async ({ page }) => {
    await setupAdminMenus(page);
    await page.goto('/usina_vale/admin?secao=menus');

    const tree = page.getByTestId('menu-tree');
    await expect(tree).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: 'Estrutura' })).toBeVisible();

    // Expande 3 níveis
    await page.getByRole('button', { name: 'Expandir Motor' }).click();
    await page.getByRole('button', { name: 'Expandir Filtros' }).click();
    await page.getByRole('button', { name: 'Expandir Filtro de Óleo' }).click();

    const subtitle = page.getByTestId('menu-tree-subtitle').filter({ hasText: 'Sub Dinâmico' });
    await expect(subtitle).toBeVisible();
    await expect(subtitle.getByTestId('drag-handle')).toHaveCount(0);
    expect(await noHorizontalScroll(page)).toBe(true);

    // Subtítulo: ⋯ só com "Editar na lista"
    await subtitle.getByRole('button', { name: 'Ações de Sub Dinâmico' }).click();
    let sheet = page.getByTestId('action-sheet');
    await expect(sheet.getByRole('button', { name: 'Editar na lista' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Excluir' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();

    // Pasta: ⋯ com todas as ações
    await page.getByRole('button', { name: 'Ações de Motor' }).click();
    sheet = page.getByTestId('action-sheet');
    for (const name of ['Editar', 'Adicionar submenu', 'Mover para cima', 'Mover para baixo', 'Excluir']) {
      await expect(sheet.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();

    // Item ligado a uma lista: ícone só leitura e "Editar na lista"
    await page.locator('[data-testid="menu-tree-row"][data-item-id="list-oleo"]').getByTestId('menu-tree-main').click();
    const form = page.getByTestId('menu-item-form');
    await expect(form).toBeVisible();
    const linked = form.getByTestId('linked-list-icon');
    await expect(linked).toContainText('Filtro de Óleo');
    await expect(linked.getByTestId('list-icon')).toHaveAttribute('data-icon-value', '🛢️');
    await expect(form.getByTestId('edit-list-icon')).toHaveCount(0);
    await linked.getByTestId('edit-in-list').click();

    const listForm = page.getByTestId('list-form');
    await expect(listForm).toBeVisible();
    await expect(listForm.getByLabel('Título')).toHaveValue('Filtro de Óleo');
    await page.keyboard.press('Escape');
    await expect(listForm).toBeHidden();
    await expect(page.getByRole('tab', { name: 'Listas' })).toHaveAttribute('aria-selected', 'true');
  });

  test('aba Listas em cartões e editor de itens sem rolagem lateral', async ({ page }) => {
    await setupAdminMenus(page);
    await page.goto('/usina_vale/admin?secao=menus');

    await page.getByRole('tab', { name: 'Listas' }).click();
    const row = page.getByTestId('custom-list-row').filter({ hasText: 'Filtro de Óleo' });
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText('2 itens · 2 subtítulos');
    expect(await noHorizontalScroll(page)).toBe(true);

    await row.getByRole('button', { name: /Filtro de Óleo/ }).first().click();
    const editor = page.getByTestId('custom-list-editor');
    await expect(editor).toBeVisible();
    await expect(editor.getByTestId('list-item-block')).toHaveCount(4);

    // Subtítulo sem ícone herda o da lista
    const inherited = editor.locator('[data-testid="list-item-block"][data-type="subtitle"]').filter({ hasText: 'Sub Dinâmico' });
    await expect(inherited.getByTestId('icon-inherited')).toBeVisible();
    await expect(inherited.getByTestId('list-icon')).toHaveAttribute('data-icon-value', '🛢️');

    const overflow = await editor.evaluate(el => el.scrollWidth <= el.clientWidth);
    expect(overflow).toBe(true);
  });
});

test.describe('Menus & Listas na web', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('ações no hover, dropdown do ⋯ e "Mover para baixo" salva', async ({ page }) => {
    await setupAdminMenus(page);
    await page.goto('/usina_vale/admin?secao=menus');

    const motor = page.locator('[data-testid="menu-tree-row"][data-item-id="cat-motor"]');
    await expect(motor).toBeVisible({ timeout: 15000 });
    await motor.hover();
    await expect(motor.getByRole('button', { name: 'Editar', exact: true })).toBeVisible();
    await expect(motor.getByRole('button', { name: 'Submenu', exact: true })).toBeVisible();

    const saved = page.waitForRequest(req => req.url().includes('/rest/v1/app_config') && req.method() === 'POST');
    await motor.getByRole('button', { name: 'Ações de Motor' }).click();
    await page.getByRole('menuitem', { name: 'Mover para baixo' }).click();
    await saved;

    await expect(page.getByTestId('menu-tree-level-0').getByTestId('menu-tree-row').first()).toHaveAttribute('data-item-id', 'list-freio');

    await page.getByRole('tab', { name: 'Listas Personalizadas' }).click();
    const row = page.getByTestId('custom-list-row').filter({ hasText: 'Freios' });
    await expect(row.getByRole('button', { name: 'Itens', exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Editar', exact: true })).toBeVisible();
  });
});
