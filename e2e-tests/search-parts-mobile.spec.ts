import { test, expect, type Page } from '@playwright/test';
import { mockCatalog } from './fixtures/catalog';

type MockPart = {
  id: string;
  codigo: string;
  name: string;
  descricao: string;
  tags: string;
  itens_relacionados: { codigo: string; name: string; desc: string }[];
};

const BASE_PARTS: MockPart[] = [
  {
    id: 'p1',
    codigo: 'FLT-100',
    name: 'Filtro de óleo',
    descricao: 'Filtro oleo motor MB 1620',
    tags: 'filtro, motor; oleo',
    itens_relacionados: [
      { codigo: 'REL-9', name: 'Anel', desc: 'Anel de vedação' },
      { codigo: 'REL-8', name: 'Junta', desc: '' },
    ],
  },
  { id: 'p2', codigo: 'BRK-200', name: '', descricao: 'Filtro de ar', tags: '', itens_relacionados: [] },
];

const LOT_PARTS: MockPart[] = Array.from({ length: 45 }, (_, i) => ({
  id: `lot-${i}`,
  codigo: `LOT-${String(i).padStart(3, '0')}`,
  name: `Peça do lote ${i}`,
  descricao: `Item de lote numero ${i}`,
  tags: 'lote, grupo-a',
  itens_relacionados: [],
}));

const ALL_PARTS = [...BASE_PARTS, ...LOT_PARTS];

/** Responde a RPC de busca com paginação (p_limit / p_offset). */
const mockSearchRpc = async (page: Page) => {
  await page.route(/\/rest\/v1\/rpc\/search_parts_unaccent/, async route => {
    const body = route.request().postDataJSON() || {};
    const q = String(body.p_query || '').toLowerCase();
    const limit = Number(body.p_limit || 50);
    const offset = Number(body.p_offset || 0);
    const matches = ALL_PARTS.filter(p =>
      [p.codigo, p.name, p.descricao, p.tags].some(f => f.toLowerCase().includes(q)),
    );
    const rows = matches.slice(offset, offset + limit).map(p => ({ ...p, total_count: matches.length }));
    await route.fulfill({ json: rows });
  });
};

const seedEmptyList = async (page: Page) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('autoboard_lists_v2_usina_vale')) return;
    const now = new Date().toISOString();
    localStorage.setItem(
      'autoboard_lists_v2_usina_vale',
      JSON.stringify({ activeListId: 'l1', lists: [{ id: 'l1', name: 'Lista E2E', createdAt: now, updatedAt: now, items: [] }] }),
    );
  });
};

test.describe('Busca de peças no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await mockCatalog(page);
    await mockSearchRpc(page);
    await seedEmptyList(page);
  });

  test('busca rápida mostra o card novo, tags, relacionados e detalhes', async ({ page }) => {
    await page.goto('/usina_vale');
    await page.getByTestId('bottom-nav-search').click();
    const overlay = page.getByTestId('mobile-search-overlay');
    await expect(overlay).toBeVisible();

    const input = page.getByTestId('mobile-search-input');
    await input.fill('filtro');

    const cards = overlay.getByTestId('part-search-card');
    await expect(cards).toHaveCount(2, { timeout: 15000 });
    await expect(cards.nth(0).getByTestId('part-search-title')).toHaveText('FLT-100 · Filtro de óleo');
    await expect(cards.nth(0).getByTestId('part-search-desc')).toHaveText('Filtro oleo motor MB 1620');
    await expect(cards.nth(1).getByTestId('part-search-title')).toHaveText('BRK-200');
    await expect(cards.nth(1).getByTestId('part-search-tags-button')).toHaveCount(0);
    await expect(cards.nth(1).getByTestId('part-search-related-button')).toHaveCount(0);

    // Relacionados
    await cards.nth(0).getByTestId('part-search-related-button').click();
    const related = page.getByTestId('part-related-sheet');
    await expect(related).toBeVisible();
    await expect(related.getByTestId('related-part-item')).toHaveCount(2);
    await expect(related).toContainText('REL-9');
    await page.keyboard.press('Escape');
    await expect(related).toBeHidden();
    await expect(page.getByTestId('part-details-sheet')).toHaveCount(0);

    // Detalhes → Adicionar à Minha Lista
    await cards.nth(0).getByTestId('part-search-desc').click();
    const details = page.getByTestId('part-details-sheet');
    await expect(details).toBeVisible();
    await expect(details.getByTestId('part-details-name')).toHaveText('Filtro de óleo');
    await expect(details.getByTestId('part-tag-chip')).toHaveText(['filtro', 'motor', 'oleo']);
    await details.getByRole('button', { name: 'Adicionar à Minha Lista' }).click();
    await expect(details).toBeHidden();
    const addSheet = page.getByTestId('part-add-sheet');
    await expect(addSheet).toBeVisible();
    await addSheet.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect(addSheet).toBeHidden();

    // Tags: tocar num chip troca o texto da busca
    await cards.nth(0).getByTestId('part-search-tags-button').click();
    const tagsSheet = page.getByTestId('part-tags-sheet');
    await expect(tagsSheet).toBeVisible();
    await tagsSheet.getByTestId('part-tag-chip').filter({ hasText: 'motor' }).click();
    await expect(tagsSheet).toBeHidden();
    await expect(input).toHaveValue('motor');

    // A peça entrou na Minha Lista
    await page.getByRole('button', { name: 'Fechar busca' }).click();
    await page.getByTestId('bottom-nav-list').click();
    await expect(page.getByTestId('parts-list-row-code')).toHaveText(['FLT-100'], { timeout: 15000 });
  });

  test('página /search-parts: busca fixa, total, sem tabela e rolagem infinita', async ({ page }) => {
    await page.goto('/usina_vale/search-parts?q=lote');

    const header = page.getByTestId('search-parts-mobile-header');
    await expect(header).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('search-parts-input')).toHaveValue('lote');
    await expect(page.getByTestId('search-parts-total')).toHaveText('45 peças', { timeout: 15000 });
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByText('Voltar ao Início')).toHaveCount(0);

    const cards = page.getByTestId('part-search-card');
    await expect(cards).toHaveCount(30);
    const noHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(noHorizontalScroll).toBe(true);

    // Rolar até o fim carrega a próxima página
    await cards.nth(29).scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 2000);
    await expect(cards).toHaveCount(45, { timeout: 15000 });

    // O campo continua fixo no topo depois de rolar
    const box = (await header.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeLessThan(120);

    // Tocar numa tag atualiza o ?q=
    await cards.nth(40).getByTestId('part-search-tags-button').click();
    await page.getByTestId('part-tags-sheet').getByTestId('part-tag-chip').filter({ hasText: 'grupo-a' }).click();
    await expect(page).toHaveURL(/[?&]q=grupo-a/);
    await expect(page.getByTestId('search-parts-input')).toHaveValue('grupo-a');
  });

  test('com o campo vazio mostra as buscas recentes', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('autoboard_recent_searches', JSON.stringify(['correia', 'rolamento']));
    });
    await page.goto('/usina_vale/search-parts');

    const recent = page.getByTestId('recent-searches');
    await expect(recent).toBeVisible({ timeout: 15000 });
    await expect(recent.getByTestId('recent-search-item')).toHaveText(['correia', 'rolamento']);

    await recent.getByTestId('recent-search-item').first().click();
    await expect(page).toHaveURL(/[?&]q=correia/);
    await expect(page.getByTestId('part-search-empty')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Busca de peças no computador', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('a tabela continua aparecendo', async ({ page }) => {
    await mockCatalog(page);
    await mockSearchRpc(page);
    await page.goto('/usina_vale/search-parts?q=filtro');

    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table.getByRole('cell', { name: 'FLT-100', exact: true })).toBeVisible();
    await expect(page.getByTestId('search-parts-mobile')).toHaveCount(0);
  });
});
