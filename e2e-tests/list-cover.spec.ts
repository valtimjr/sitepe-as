import { test, expect, type Page } from '@playwright/test';
import { mockCatalog } from './fixtures/catalog';

// PNG 1x1 usado como imagem de capa nos testes
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const GOOD_IMAGE = 'https://example.com/capa-e2e.png';
const BROKEN_IMAGE = 'https://example.com/quebrada.png';

/** Dispensa avisos e simula a Edge Function e as imagens remotas. */
async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('welcome_notice_accepted', 'true');
    localStorage.setItem('cookie_consent_given', 'true');
  });
  await page.route(/\/functions\/v1\/list-covers/, (route) =>
    route.fulfill({ json: { categories: [], photos: [], hasMore: false } }),
  );
  await page.route(/images\.pexels\.com/, (route) => route.fulfill({ body: PNG_1X1, contentType: 'image/png' }));
  await page.route(GOOD_IMAGE, (route) => route.fulfill({ body: PNG_1X1, contentType: 'image/png' }));
  await page.route(BROKEN_IMAGE, (route) => route.fulfill({ status: 404, body: 'not found' }));
}

test.describe('Capa da Minha Lista no computador', () => {
  test.use({ viewport: { width: 1280, height: 800 }, actionTimeout: 15000 });

  test('gradiente persiste ao recarregar e fica só na lista dela', async ({ page }) => {
    test.setTimeout(60000);
    await setup(page);
    await page.goto('/usina_vale/parts-list');

    const area = page.getByTestId('parts-list-cover-area');
    await area.hover({ timeout: 15000 });
    await area.getByTestId('add-cover-button').click();
    const picker = page.getByTestId('cover-picker');
    await expect(picker).toBeVisible();
    await picker.getByTestId('cover-preset-gradient').first().click();
    await expect(picker).toBeHidden();

    const cover = page.getByTestId('list-cover');
    await expect(cover).toHaveAttribute('data-cover-kind', 'gradient');

    await page.reload();
    await expect(page.getByTestId('list-cover')).toHaveAttribute('data-cover-kind', 'gradient', { timeout: 15000 });

    // Uma lista nova (que vira a ativa) começa sem capa
    await page.getByRole('button', { name: 'Nova Lista' }).click();
    const dialog = page.getByRole('dialog', { name: 'Criar Nova Lista' });
    await dialog.getByLabel('Nome da Lista').fill('Sem capa E2E');
    await dialog.getByRole('button', { name: 'Criar Lista' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Lista: Sem capa E2E' })).toBeVisible();
    await expect(page.getByTestId('list-cover')).toHaveCount(0);
  });

  test('link inválido mostra erro; link válido, reposicionar e remover', async ({ page }) => {
    test.setTimeout(60000);
    await setup(page);
    await page.goto('/usina_vale/parts-list');

    const area = page.getByTestId('parts-list-cover-area');
    await area.hover({ timeout: 15000 });
    await area.getByTestId('add-cover-button').click();
    const picker = page.getByTestId('cover-picker');
    await picker.getByRole('tab', { name: 'Link' }).click();

    const input = picker.getByLabel('Link da imagem');
    await input.fill(BROKEN_IMAGE);
    await picker.getByRole('button', { name: 'Usar imagem' }).click();
    await expect(picker.getByTestId('cover-link-error')).toBeVisible();

    await input.fill(GOOD_IMAGE);
    await picker.getByRole('button', { name: 'Usar imagem' }).click();
    await expect(picker).toBeHidden();

    const image = page.getByTestId('list-cover-image');
    await expect(image).toHaveAttribute('src', GOOD_IMAGE);
    await expect(image).toHaveCSS('object-position', '50% 50%');

    // Reposicionar: arrasta para baixo e salva
    const cover = page.getByTestId('list-cover');
    await cover.hover();
    await cover.getByTestId('cover-reposition-button').click();
    const dragTarget = page.getByTestId('cover-reposition-image');
    const box = (await dragTarget.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80, { steps: 5 });
    await page.mouse.up();
    await page.getByTestId('cover-reposition-save').click();
    await expect(page.getByTestId('list-cover-image')).not.toHaveCSS('object-position', '50% 50%');

    // Remover
    await cover.hover();
    await cover.getByTestId('cover-change-button').click();
    await page.getByTestId('cover-picker').getByTestId('cover-remove').click();
    await expect(page.getByTestId('list-cover')).toHaveCount(0);
    await expect(area.getByTestId('add-cover-button')).toHaveCount(1);
  });
});

test.describe('Capa da Minha Lista no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, actionTimeout: 15000 });

  test('gaveta reta e capa de ponta a ponta', async ({ page }) => {
    test.setTimeout(60000);
    await setup(page);
    await page.goto('/usina_vale/parts-list');

    await page.getByTestId('parts-list-mobile-header').getByTestId('add-cover-button').click({ timeout: 15000 });
    const picker = page.getByTestId('cover-picker');
    await expect(picker).toBeVisible();
    await expect(picker).toHaveClass(/rounded-none/);
    await picker.getByTestId('cover-preset-gradient').first().click();
    await expect(picker).toBeHidden();

    const cover = page.getByTestId('list-cover');
    await expect(cover).toBeVisible();
    const box = (await cover.boundingBox())!;
    // De ponta a ponta: ocupa toda a largura útil (sem a barra de rolagem)
    const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(Math.abs(box.x)).toBeLessThan(1);
    expect(box.width).toBeGreaterThanOrEqual(pageWidth - 1);
    expect(box.height).toBeGreaterThanOrEqual(120);
    expect(box.height).toBeLessThanOrEqual(170);

    // No celular, Alterar/Reposicionar ficam no menu de 3 pontos
    await expect(cover.getByRole('button', { name: 'Alterar' })).toHaveCount(0);
    await cover.getByTestId('cover-menu-button').click();
    await page.getByRole('menuitem', { name: 'Alterar' }).click();
    await expect(page.getByTestId('cover-picker')).toBeVisible();
    await page.getByTestId('cover-picker').getByTestId('cover-remove').click();
    await expect(page.getByTestId('list-cover')).toHaveCount(0);
  });
});

test.describe('Capa da Lista Personalizada', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visitante vê a capa sem botões de edição', async ({ page }) => {
    await mockCatalog(page);
    // Registrada depois do mockCatalog, esta rota tem prioridade
    await page.route(/\/rest\/v1\/custom_lists\?.*id=eq\.e2e-list-cover/, async (route) => {
      const list = {
        id: 'e2e-list-cover',
        title: 'Lista com Capa',
        company: 'usina_vale',
        icon: null,
        cover: { kind: 'gradient', source: 'gallery', value: 'linear-gradient(135deg, #0f766e 0%, #2563eb 100%)' },
        items_data: [],
      };
      const accept = route.request().headers()['accept'] || '';
      await route.fulfill({ json: accept.includes('vnd.pgrst.object') ? list : [list] });
    });
    await page.goto('/usina_vale/custom-list/e2e-list-cover');

    await expect(page.getByTestId('custom-list-title')).toHaveText('Lista com Capa', { timeout: 15000 });
    const cover = page.getByTestId('list-cover');
    await expect(cover).toHaveAttribute('data-cover-kind', 'gradient');
    await cover.hover();
    await expect(page.getByTestId('cover-change-button')).toHaveCount(0);
    await expect(page.getByTestId('add-cover-button')).toHaveCount(0);
  });
});
