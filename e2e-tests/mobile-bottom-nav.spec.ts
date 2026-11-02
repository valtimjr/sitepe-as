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

  test('Pesquisar da barra inferior abre a busca em tela cheia', async ({ page }) => {
    await page.goto('/usina_vale', { timeout: 15000 });

    await page.getByTestId('bottom-nav-search').click();
    await expect(page.getByTestId('mobile-search-overlay')).toBeVisible();
    await expect(page).toHaveURL(/\/usina_vale\/?$/);

    await page.getByRole('button', { name: 'Fechar busca' }).click();
    await expect(page.getByTestId('mobile-search-overlay')).toBeHidden();
  });

  test('menu em lista do Início leva à Minha Lista de Peças', async ({ page }) => {
    await page.goto('/usina_vale', { timeout: 15000 });

    const menu = page.getByTestId('home-menu');
    await expect(menu).toBeVisible({ timeout: 15000 });
    await expect(menu.getByText('Ordens de Serviço')).toBeVisible();

    await menu.getByText('Minha Lista de Peças').click();
    await expect(page).toHaveURL(/\/usina_vale\/parts-list$/);
  });

  test('navega pelas listas em camadas no "Mais"', async ({ page }) => {
    const menuStructure = [
      { id: 'cat-motor', parent_id: null, title: 'Motor', order_index: 0, list_id: null, itens_relacionados: [] },
      { id: 'cat-filtros', parent_id: 'cat-motor', title: 'Filtros', order_index: 0, list_id: null, itens_relacionados: [] },
      { id: 'list-oleo', parent_id: 'cat-filtros', title: 'Filtro de Óleo', order_index: 0, list_id: 'e2e-list-oleo', itens_relacionados: [] },
    ];
    await page.route(/\/rest\/v1\/app_config\?.*key=eq\.menu_structure/, async route => {
      const accept = route.request().headers()['accept'] || '';
      const row = { value: menuStructure };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accept.includes('vnd.pgrst.object') ? row : [row]),
      });
    });
    await page.route(/\/rest\/v1\/custom_lists\?.*id=in\./, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );

    await page.goto('/usina_vale', { timeout: 15000 });
    await page.getByTestId('bottom-nav-more').click();

    const drawer = page.getByTestId('mobile-more-drawer');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: /Motor/ }).click();

    const breadcrumb = drawer.getByTestId('list-browser-breadcrumb');
    await expect(breadcrumb).toContainText('Motor');
    await expect(drawer.getByText('Escala Anual')).toHaveCount(0);

    await drawer.getByRole('button', { name: /Filtros/ }).click();
    await expect(breadcrumb).toContainText('Filtros');

    await drawer.getByTestId('list-browser-back').click();
    await expect(drawer.getByRole('button', { name: /Filtros/ })).toBeVisible();

    await drawer.getByRole('button', { name: /Filtros/ }).click();
    await drawer.getByRole('link', { name: /Filtro de Óleo/ }).click();

    await expect(page).toHaveURL(/\/usina_vale\/custom-list\/e2e-list-oleo$/);
    await expect(drawer).toBeHidden();
  });
});
