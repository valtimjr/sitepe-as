import { test, expect, type Page } from '@playwright/test';
import { mockCatalog } from './fixtures/catalog';

const ITEMS = [
  { id: 'i1', codigo_peca: 'AAA-1', name: 'Rolamento 6205', descricao: 'Rolamento dianteiro', quantidade: 2, af: '42032', company: 'usina_vale' },
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

const rowCodes = (page: Page) => page.getByTestId('parts-list-row-code');

/** Desliza o dedo na horizontal (eventos de toque reais, via CDP). */
const touchSwipe = async (page: Page, x: number, y: number, dx: number) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 12, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
};

test.describe('Minha Lista no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await mockCatalog(page);
  });

  test('cabeçalho fixo com o carrossel infinito das listas', async ({ page }) => {
    const catalogRequests: string[] = [];
    page.on('request', (req) => {
      const url = decodeURIComponent(req.url());
      if (/\/rest\/v1\/parts\?/.test(url) && !url.includes('codigo=in.')) catalogRequests.push(url);
    });

    await seedLists(page);
    await page.goto('/usina_vale/parts-list');

    const header = page.getByTestId('parts-list-mobile-header');
    const title = header.getByTestId('parts-list-mobile-title');
    await expect(header).toBeVisible({ timeout: 15000 });
    await expect(title).toHaveText('Caminhão 42032');
    await expect(header.getByTestId('parts-list-mobile-summary')).toContainText('4 peças');
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByTestId('list-chip-new')).toHaveCount(0);

    // O carrossel fica dentro do cabeçalho fixo e os cartões são 4x3
    const region = header.getByRole('region', { name: 'Navegação de Listas de Peças' });
    await expect(region).toBeVisible();
    const card = (await region.getByTestId('list-carousel-card').first().boundingBox())!;
    expect(card.width / card.height).toBeCloseTo(4 / 3, 1);

    const box = (await region.boundingBox())!;
    const y = box.y + box.height - 24;
    const x = box.x + box.width / 2;

    // Arrastar com o mouse: próxima lista
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 20, y, { steps: 4 });
    await page.mouse.move(x - card.width * 0.8, y, { steps: 12 });
    await page.mouse.up();
    await expect(title).toHaveText('Preventiva');
    await expect(page.getByTestId('parts-list-empty')).toContainText('Sua lista está vazia');

    // Deslizar o dedo a partir da última lista volta para a primeira
    await touchSwipe(page, x, y, -card.width * 0.8);
    await expect(title).toHaveText('Caminhão 42032');

    // Setas do teclado
    await region.focus();
    await page.keyboard.press('ArrowRight');
    await expect(title).toHaveText('Preventiva');
    await page.keyboard.press('ArrowLeft');
    await expect(title).toHaveText('Caminhão 42032');

    // Nova Lista pelo carrossel
    await header.getByRole('button', { name: 'Nova Lista' }).click();
    const dialog = page.getByRole('dialog', { name: 'Criar Nova Lista' });
    await dialog.getByLabel('Nome da Lista').fill('Nova E2E');
    await dialog.getByRole('button', { name: 'Criar Lista' }).click();
    await expect(title).toHaveText('Nova E2E');

    expect(catalogRequests).toEqual([]);
  });

  test('Limpar lista pelo cabeçalho pede confirmação', async ({ page }) => {
    await seedLists(page);
    await page.goto('/usina_vale/parts-list');
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4, { timeout: 15000 });

    const clear = page.getByTestId('parts-list-clear-button');
    await clear.click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText('Todas as 4 peças de "Caminhão 42032" serão removidas');
    await confirm.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4);

    await clear.click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Limpar' }).click();
    await expect(page.getByTestId('parts-list-empty')).toBeVisible();
    await expect(clear).toBeDisabled();
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
    // Digitadas à mão sem nome: só o código
    await expect(page.getByTestId('parts-list-row-name')).toHaveCount(0);
  });

  test('"Uma peça detalhada" abre o formulário e guarda o nome', async ({ page }) => {
    await seedLists(page, []);
    await page.goto('/usina_vale/parts-list');
    await expect(page.getByTestId('parts-list-empty')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('parts-list-fab').click();
    await page.getByTestId('add-part-sheet').getByRole('button', { name: /Uma peça detalhada/ }).click();
    const detailed = page.getByTestId('add-part-detailed-sheet');
    await expect(detailed).toBeVisible();
    await detailed.getByLabel('Cód. Peça').fill('DET-1');
    await detailed.getByLabel('Nome da Peça').fill('Mancal');
    await detailed.getByLabel('Descrição').fill('Peça detalhada');
    await detailed.getByRole('button', { name: 'Adicionar à Lista' }).click();

    await expect(detailed).toBeHidden();
    await expect(page.getByTestId('parts-list-row-title')).toHaveText('DET-1 · Mancal');
    await expect(page.getByTestId('parts-list-row-desc')).toHaveText('Peça detalhada');
  });

  test('cartão mostra código · nome e a descrição embaixo', async ({ page }) => {
    await seedLists(page);
    await page.goto('/usina_vale/parts-list');
    const rows = page.getByTestId('parts-list-row');
    await expect(rows).toHaveCount(4, { timeout: 15000 });

    await expect(rows.nth(0).getByTestId('parts-list-row-title')).toHaveText('AAA-1 · Rolamento 6205');
    await expect(rows.nth(0).getByTestId('parts-list-row-desc')).toHaveText('Rolamento dianteiro');
    await expect(rows.nth(1).getByTestId('parts-list-row-title')).toHaveText('BBB-2');
    await expect(rows.nth(1).getByTestId('parts-list-row-name')).toHaveCount(0);
  });

  test('quantidade persiste e remover pede confirmação', async ({ page }) => {
    await seedLists(page);
    await page.goto('/usina_vale/parts-list');
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4, { timeout: 15000 });

    await page.getByRole('button', { name: 'Aumentar quantidade de BBB-2' }).click();
    await expect(page.getByRole('spinbutton', { name: 'Quantidade de BBB-2' })).toHaveValue('2');
    await page.waitForTimeout(600); // espera de 400 ms da gravação
    await page.reload();
    await expect(page.getByRole('spinbutton', { name: 'Quantidade de BBB-2' })).toHaveValue('2', { timeout: 15000 });

    await page.getByRole('button', { name: 'Remover BBB-2' }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText('A peça "BBB-2" será removida desta lista.');
    await confirm.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4);

    await page.getByRole('button', { name: 'Remover BBB-2' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click();
    await expect(rowCodes(page)).toHaveText(['AAA-1', 'CCC-3', 'DDD-4']);
    await expect(page.getByTestId('part-removed-notice')).toHaveCount(0);

    // "Excluir peça" na edição também pede confirmação
    await page.getByRole('button', { name: 'Editar CCC-3' }).click();
    const edit = page.getByTestId('part-edit-sheet');
    await expect(edit).toBeVisible();
    await edit.getByRole('button', { name: 'Excluir peça' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click();
    await expect(edit).toBeHidden();
    await expect(rowCodes(page)).toHaveText(['AAA-1', 'DDD-4']);
  });

  test('arrastar pela alça, sem filtro e agrupar por AF no Ordenar', async ({ page }) => {
    await seedLists(page);
    await page.goto('/usina_vale/parts-list');
    await expect(page.getByTestId('parts-list-row')).toHaveCount(4, { timeout: 15000 });
    await expect(page.getByLabel('Filtrar nesta lista')).toHaveCount(0);

    // Arrasta a 1ª peça pela alça até abaixo da 2ª
    const handleBox = (await page.getByRole('button', { name: 'Arrastar AAA-1' }).boundingBox())!;
    const targetBox = (await page.getByTestId('parts-list-row').nth(1).boundingBox())!;
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 10, { steps: 5 });
    await page.mouse.move(handleBox.x + handleBox.width / 2, targetBox.y + targetBox.height * 0.8, { steps: 15 });
    await page.mouse.up();
    await expect(rowCodes(page)).toHaveText(['BBB-2', 'AAA-1', 'CCC-3', 'DDD-4']);

    await page.getByTestId('parts-list-sort-button').click();
    const sortSheet = page.getByTestId('parts-list-sort-sheet');
    await expect(sortSheet).toBeVisible();
    await sortSheet.getByTestId('parts-list-group-af').click();
    await page.keyboard.press('Escape');
    await expect(sortSheet).toBeHidden();

    const groups = page.getByTestId('parts-list-af-group');
    await expect(groups).toHaveCount(2);
    await expect(groups.nth(0).locator('h2')).toHaveText('AF 42032 (2)');
    await expect(groups.nth(1).locator('h2')).toHaveText('Sem AF (2)');
    await expect(page.getByTestId('drag-handle-disabled')).toHaveCount(4);
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

  test('carrossel desliza arrastando e os cartões são 4x3', async ({ page }) => {
    await mockCatalog(page);
    await seedLists(page);
    await page.goto('/usina_vale/parts-list');

    const region = page.getByRole('region', { name: 'Navegação de Listas de Peças' });
    await expect(region).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Lista: Caminhão 42032' })).toBeVisible();

    const card = (await region.getByTestId('list-carousel-card').first().boundingBox())!;
    expect(card.width / card.height).toBeCloseTo(4 / 3, 1);

    // Arrasta para a esquerda: vai para a próxima lista
    const box = (await region.boundingBox())!;
    const y = box.y + box.height - 20;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 20, y, { steps: 4 });
    await page.mouse.move(x - card.width * 0.8, y, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByRole('heading', { name: 'Lista: Preventiva' })).toBeVisible();

    // Infinito: depois da última vem a primeira, e as bordas sempre têm cartões
    await page.getByRole('button', { name: 'Próxima lista' }).click();
    await expect(page.getByRole('heading', { name: 'Lista: Caminhão 42032' })).toBeVisible();
    // Da primeira, voltar leva à última
    await page.getByRole('button', { name: 'Lista anterior' }).click();
    await expect(page.getByRole('heading', { name: 'Lista: Preventiva' })).toBeVisible();

    const edgeCovered = await region.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cards = Array.from(el.querySelectorAll('[data-testid="list-carousel-card"]')).map((c) => c.getBoundingClientRect());
      return {
        // tolerância do espaço de 12 px entre cartões
        left: cards.some((c) => c.left <= r.left + 13 && c.right > r.left),
        right: cards.some((c) => c.right >= r.right - 13 && c.left < r.right),
      };
    });
    expect(edgeCovered).toEqual({ left: true, right: true });
  });
});
