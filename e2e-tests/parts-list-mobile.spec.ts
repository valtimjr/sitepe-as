import { test, expect, type Page } from '@playwright/test';
import { mockCatalog } from './fixtures/catalog';

const ITEMS = [
  { id: 'i1', codigo_peca: 'AAA-1', descricao: 'Rolamento dianteiro', quantidade: 2, af: '42032', company: 'usina_vale' },
  { id: 'i2', codigo_peca: 'BBB-2', descricao: 'Filtro de óleo', quantidade: 1, company: 'usina_vale' },
  { id: 'i3', codigo_peca: 'CCC-3', descricao: 'Correia', quantidade: 1, af: '42032', company: 'usina_vale' },
  { id: 'i4', codigo_peca: 'DDD-4', descricao: 'Válvula', quantidade: 3, company: 'usina_vale' },
];

/** Cria duas listas só na 1ª visita (recarregar a página mantém o que o teste mudou). */
const seedLists = async (page: Page, items = ITEMS) => {
  await page.addInitScript((seedItems) => {
    if (localStorage.getItem('autoboard_lists_v2_usina_vale')) return;
    const now = new Date().toISOString();
    localStorage.setItem(
      'autoboard_lists_v2_usina_vale',
      JSON.stringify({
        activeListId: 'l1',
        lists: [
          { id: 'l1', name: 'Caminhão 42032', createdAt: now, updatedAt: now, items: seedItems },
          { id: 'l2', name: 'Preventiva', createdAt: now, updatedAt: now, items: [] },
        ],
      }),
    );
  }, items);
};

const rowCodes = (page: Page) => page.getByTestId('parts-list-row').locator('span.font-bold');

test.describe('Minha Lista no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await mockCatalog(page);
  });

  test('cabeçalho fixo, chips e troca de lista', async ({ page }) => {
    const catalogRequests: string[] = [];
    page.on('request', (req) => {
      const url = decodeURIComponent(req.url());
      if (/\/rest\/v1\/parts\?/.test(url) && !url.includes('codigo=in.')) catalogRequests.push(url);
    });

    await seedLists(page);
    await page.goto('/usina_vale/parts-list');

    const header = page.getByTestId('parts-list-mobile-header');
    await expect(header).toBeVisible({ timeout: 15000 });
    await expect(header.getByTestId('parts-list-mobile-title')).toHaveText('Caminhão 42032');
    await expect(header.getByTestId('parts-list-mobile-summary')).toContainText('4 peças');
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4);
    await expect(page.getByText('Título da Lista')).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Navegação de Listas de Peças' })).toHaveCount(0);

    await header.getByRole('button', { name: 'Preventiva' }).click();
    await expect(header.getByTestId('parts-list-mobile-title')).toHaveText('Preventiva');
    await expect(header.getByTestId('parts-list-mobile-summary')).toContainText('0 peças');
    await expect(page.getByTestId('parts-list-empty')).toContainText('Sua lista está vazia');

    await page.getByTestId('list-chip-new').click();
    const dialog = page.getByRole('dialog', { name: 'Criar Nova Lista' });
    await dialog.getByLabel('Nome da Lista').fill('Nova E2E');
    await dialog.getByRole('button', { name: 'Criar Lista' }).click();
    await expect(header.getByTestId('parts-list-mobile-title')).toHaveText('Nova E2E');
    await expect(header.getByRole('button', { name: 'Nova E2E' })).toHaveAttribute('aria-pressed', 'true');

    // Tocar no chip ativo abre as opções da lista
    await header.getByRole('button', { name: 'Nova E2E' }).click();
    await expect(page.getByTestId('list-options-sheet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Renomear / Ícone' })).toBeVisible();

    expect(catalogRequests).toEqual([]);
  });

  test('FAB adiciona várias peças com AF', async ({ page }) => {
    await seedLists(page, []);
    await page.goto('/usina_vale/parts-list');
    await expect(page.getByTestId('parts-list-empty')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('parts-list-fab').click();
    const sheet = page.getByTestId('add-part-sheet');
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('parts-list-fab')).toHaveCount(0);

    for (const [code, desc] of [['NEW-1', 'Peça nova um'], ['NEW-2', 'Peça nova dois']]) {
      await sheet.getByRole('button', { name: /Digitar à mão/i }).click();
      await sheet.getByLabel('Código', { exact: true }).fill(code);
      await sheet.getByLabel('Descrição', { exact: true }).fill(desc);
      await sheet.getByRole('button', { name: 'Adicionar à seleção' }).click();
    }
    await sheet.getByPlaceholder('AF (opcional)').fill('7788');
    await sheet.getByRole('button', { name: 'Concluir (2)' }).click();

    await expect(sheet).toBeHidden();
    await expect(page.getByTestId('parts-list-row')).toHaveCount(2);
    await expect(page.getByTestId('parts-list-row-af')).toHaveText(['AF 7788', 'AF 7788']);
  });

  test('"Uma peça detalhada" abre o formulário na gaveta', async ({ page }) => {
    await seedLists(page, []);
    await page.goto('/usina_vale/parts-list');
    await expect(page.getByTestId('parts-list-empty')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('parts-list-fab').click();
    await page.getByTestId('add-part-sheet').getByRole('button', { name: /Uma peça detalhada/ }).click();
    const detailed = page.getByTestId('add-part-detailed-sheet');
    await expect(detailed).toBeVisible();
    await detailed.getByLabel('Cód. Peça').fill('DET-1');
    await detailed.getByLabel('Descrição').fill('Peça detalhada');
    await detailed.getByRole('button', { name: 'Adicionar à Lista' }).click();

    await expect(detailed).toBeHidden();
    await expect(page.getByTestId('parts-list-row')).toContainText('DET-1');
  });

  test('quantidade persiste e remover tem Desfazer', async ({ page }) => {
    await seedLists(page);
    await page.goto('/usina_vale/parts-list');
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4, { timeout: 15000 });

    await page.getByRole('button', { name: 'Aumentar quantidade de BBB-2' }).click();
    await expect(page.getByRole('spinbutton', { name: 'Quantidade de BBB-2' })).toHaveValue('2');
    await page.waitForTimeout(600); // espera de 400 ms da gravação
    await page.reload();
    await expect(page.getByRole('spinbutton', { name: 'Quantidade de BBB-2' })).toHaveValue('2', { timeout: 15000 });

    await page.getByRole('button', { name: 'Remover BBB-2' }).click();
    await expect(page.getByTestId('parts-list-row')).toHaveCount(3);
    await page.getByTestId('part-removed-notice').getByRole('button', { name: 'Desfazer' }).click();
    await expect(rowCodes(page)).toHaveText(['AAA-1', 'BBB-2', 'CCC-3', 'DDD-4']);
  });

  test('arrastar pela alça, filtro e agrupar por AF', async ({ page }) => {
    await seedLists(page);
    await page.goto('/usina_vale/parts-list');
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4, { timeout: 15000 });

    // Arrasta a 1ª peça pela alça até abaixo da 2ª
    const handleBox = (await page.getByRole('button', { name: 'Arrastar AAA-1' }).boundingBox())!;
    const targetBox = (await page.getByTestId('parts-list-row').nth(1).boundingBox())!;
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 10, { steps: 5 });
    await page.mouse.move(handleBox.x + handleBox.width / 2, targetBox.y + targetBox.height * 0.8, { steps: 15 });
    await page.mouse.up();
    await expect(rowCodes(page)).toHaveText(['BBB-2', 'AAA-1', 'CCC-3', 'DDD-4']);

    await page.getByLabel('Filtrar nesta lista').fill('valvula');
    await expect(page.getByTestId('parts-list-row')).toHaveCount(1);
    await expect(page.getByTestId('parts-list-row')).toContainText('DDD-4');
    await expect(page.getByTestId('drag-handle-disabled')).toHaveCount(1);
    await expect(page.getByTestId('drag-handle')).toHaveCount(0);

    await page.getByLabel('Filtrar nesta lista').fill('xyz');
    await expect(page.getByTestId('parts-list-no-results')).toContainText('Nenhuma peça com "xyz"');
    await page.getByRole('button', { name: 'Limpar filtro' }).last().click();

    await page.getByTestId('parts-list-group-af').click();
    const groups = page.getByTestId('parts-list-af-group');
    await expect(groups).toHaveCount(2);
    await expect(groups.nth(0).locator('h2')).toHaveText('AF 42032 (2)');
    await expect(groups.nth(1).locator('h2')).toHaveText('Sem AF (2)');
  });

  test('Compartilhar mostra as ações e desativa as de envio com a lista vazia', async ({ page }) => {
    await seedLists(page);
    await page.goto('/usina_vale/parts-list');
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4, { timeout: 15000 });

    await page.getByTestId('parts-list-share-button').click();
    const share = page.getByTestId('parts-list-share-sheet');
    await expect(share).toBeVisible();
    await expect(page.getByTestId('parts-list-fab')).toHaveCount(0);
    for (const name of ['Copiar texto', 'Enviar no WhatsApp', 'Exportar PDF', 'Exportar Excel', 'Exportar CSV', 'Exportar JSON', 'Importar planilha / JSON…', 'Salvar na nuvem', 'Carregar da nuvem', 'Limpar lista']) {
      await expect(share.getByRole('button', { name, exact: true })).toBeEnabled();
    }

    await share.getByRole('button', { name: 'Limpar lista', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Limpar' }).click();
    await expect(page.getByTestId('parts-list-empty')).toBeVisible();

    await page.getByTestId('parts-list-share-button').click();
    await expect(share.getByRole('button', { name: 'Copiar texto', exact: true })).toBeDisabled();
    await expect(share.getByRole('button', { name: 'Exportar PDF', exact: true })).toBeDisabled();
    await expect(share.getByRole('button', { name: 'Importar planilha / JSON…', exact: true })).toBeEnabled();
    await expect(share.getByRole('button', { name: 'Carregar da nuvem', exact: true })).toBeEnabled();
  });
});

test.describe('Minha Lista no computador', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('mantém o layout atual', async ({ page }) => {
    await mockCatalog(page);
    await seedLists(page);
    await page.goto('/usina_vale/parts-list');

    await expect(page.getByRole('region', { name: 'Navegação de Listas de Peças' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Adicionar Item à Lista de Peças')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('button', { name: /Copiar Lista/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Limpar Lista/ })).toBeVisible();
    await expect(page.getByTestId('parts-list-fab')).toHaveCount(0);
    await expect(page.getByTestId('parts-list-mobile-header')).toHaveCount(0);
  });
});
