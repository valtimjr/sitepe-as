import type { Page } from '@playwright/test';

export const MENU_STRUCTURE = [
  { id: 'cat-motor', parent_id: null, title: 'Motor', order_index: 0, list_id: null, itens_relacionados: [], icon: { source: 'emoji', value: '🔧' } },
  { id: 'cat-filtros', parent_id: 'cat-motor', title: 'Filtros', order_index: 0, list_id: null, itens_relacionados: [], icon: { source: 'emoji', value: '🧰' } },
  {
    id: 'list-oleo',
    parent_id: 'cat-filtros',
    title: 'Filtro de Óleo',
    order_index: 0,
    list_id: 'e2e-list-oleo',
    itens_relacionados: [{ codigo: 'REL-1', name: 'Anel de vedação', desc: '' }],
  },
  { id: 'list-freio', parent_id: null, title: 'Freios', order_index: 1, list_id: 'e2e-list-freio', itens_relacionados: [] },
];

export const LIST_ITEMS = [
  { id: 'sub-1', type: 'subtitle', item_name: 'Sub Dinâmico', order_index: 0, part_code: null, description: null, quantity: 0, itens_relacionados: [] },
  { id: 'it-1', type: 'item', item_name: 'Filtro A', order_index: 1, part_code: 'FA-1', description: 'Filtro de óleo A', quantity: 2, itens_relacionados: [] },
  { id: 'it-2', type: 'item', item_name: 'Filtro B', order_index: 2, part_code: 'FB-2', description: null, quantity: 1, itens_relacionados: [] },
  {
    id: 'sub-2',
    type: 'subtitle',
    item_name: 'Sub Próprio',
    order_index: 3,
    part_code: null,
    description: null,
    quantity: 0,
    itens_relacionados: [],
    icon: { source: 'emoji', value: '⚙️' },
  },
];

const LISTS = [
  { id: 'e2e-list-oleo', title: 'Filtro de Óleo', company: 'usina_vale', icon: { source: 'emoji', value: '🛢️' }, items_data: LIST_ITEMS },
  { id: 'e2e-list-freio', title: 'Freios', company: 'usina_vale', icon: null, items_data: [] },
];

/** Dispensa avisos e responde menu, listas, peças e AFs com dados fixos. */
export async function mockCatalog(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('welcome_notice_accepted', 'true');
    localStorage.setItem('cookie_consent_given', 'true');
  });
  await page.route(/\/rest\/v1\/app_config\?.*key=eq\.menu_structure/, async route => {
    const accept = route.request().headers()['accept'] || '';
    const row = { value: MENU_STRUCTURE };
    await route.fulfill({ json: accept.includes('vnd.pgrst.object') ? row : [row] });
  });
  await page.route(/\/rest\/v1\/custom_lists\?/, async route => {
    const url = decodeURIComponent(route.request().url());
    const accept = route.request().headers()['accept'] || '';
    const single = url.match(/[?&]id=eq\.([^&]+)/);
    if (single) {
      const list = LISTS.find(l => l.id === single[1]) ?? null;
      await route.fulfill({ json: accept.includes('vnd.pgrst.object') ? list : list ? [list] : [] });
      return;
    }
    await route.fulfill({ json: LISTS });
  });
  await page.route(/\/rest\/v1\/parts(\?|$)/, route => route.fulfill({ json: [], headers: { 'content-range': '*/0' } }));
  await page.route(/\/rest\/v1\/afs(\?|$)/, route =>
    route.fulfill({ json: [{ id: 'af-1', af_number: 'AF-123', descricao: 'Frota de teste' }], headers: { 'content-range': '0-0/1' } }),
  );
}
