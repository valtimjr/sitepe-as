import { test, expect, type Page } from '@playwright/test';

const USER = { id: 'u-1', first_name: 'João', last_name: 'Silva', role: 'user', badge: '4213', profession_code: null, shift_code: null };

// Simula um administrador e responde as tabelas com dados fixos.
// Cada dia do intervalo pedido tem 2 OS: uma digitada e uma pendente.
async function setupReport(page: Page) {
  const orderCalls: string[] = [];

  await page.addInitScript(() => {
    localStorage.setItem('welcome_notice_accepted', 'true');
    localStorage.setItem('cookie_consent_given', 'true');
    const user = { id: 'e2e-admin', email: 'admin@e2e.test' };
    localStorage.setItem('autoboard_cached_session_v2', JSON.stringify({ access_token: 'e2e', user }));
    localStorage.setItem('autoboard_cached_user_v2', JSON.stringify(user));
    localStorage.setItem('autoboard_cached_profile_v2', JSON.stringify({ id: 'e2e-admin', role: 'admin', first_name: 'Admin' }));
  });

  await page.route(/\/rest\/v1\/profiles(\?|$)/, route => route.fulfill({ json: [USER] }));
  await page.route(/\/rest\/v1\/shifts(\?|$)/, route => route.fulfill({ json: [] }));
  await page.route(/\/rest\/v1\/professions(\?|$)/, route => route.fulfill({ json: [] }));
  await page.route(/\/rest\/v1\/afs(\?|$)/, route => route.fulfill({ json: [{ id: 'af-1', af_number: 'AF-1', descricao: 'Frota' }] }));
  await page.route(/\/rest\/v1\/daily_service_orders(\?|$)/, route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET') return route.fulfill({ json: [] });
    orderCalls.push(url.search);
    const dates = url.searchParams.getAll('date');
    const start = dates.find(d => d.startsWith('gte.'))!.slice(4);
    const end = dates.find(d => d.startsWith('lte.'))!.slice(4);
    const records = [];
    for (let d = new Date(`${start}T12:00:00Z`); d <= new Date(`${end}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      records.push({
        id: `rec-${date}`,
        user_id: USER.id,
        date,
        company: 'usina_vale',
        os_list: [
          { id: `os-a-${date}`, af: 'AF-1', os: '100', servico_executado: 'Troca de óleo', hora_inicio: '08:00', hora_final: '09:00', confirmed: true, parts: [] },
          { id: `os-b-${date}`, af: 'AF-1', os: '101', servico_executado: 'Revisão', hora_inicio: '09:00', hora_final: '10:30', confirmed: false, parts: [] },
        ],
      });
    }
    return route.fulfill({ json: records });
  });

  return orderCalls;
}

test.describe('Relatório Administrativo', () => {
  test('celular: cabeçalho fixo, gaveta de filtros, chips e carrossel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const orderCalls = await setupReport(page);
    await page.goto('/usina_vale/admin-report');

    const header = page.getByTestId('report-mobile-header');
    await expect(header.getByRole('heading', { name: 'Relatório Geral' })).toBeVisible();
    await expect(header.getByTestId('report-date-label')).toHaveText(/\d{2}\/\d{2}\/\d{4}/);
    const osHeaders = page.getByTestId('report-os-header');
    await expect(osHeaders).toHaveCount(2);

    // Sem rolagem horizontal
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Alvos de toque de pelo menos 40 px
    for (const id of ['report-refresh', 'report-filter-button', 'report-generate']) {
      const box = await header.getByTestId(id).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(40);
      expect(box!.height).toBeGreaterThanOrEqual(40);
    }
    const markBox = await page.getByRole('button', { name: 'Marcar Digitado' }).boundingBox();
    expect(markBox!.height).toBeGreaterThanOrEqual(40);

    const callsAfterLoad = orderCalls.length;
    const filterButton = header.getByTestId('report-filter-button');
    const panel = page.getByTestId('report-filter-panel');
    const apply = panel.getByTestId('report-filter-apply');

    // Aplicar "Pendentes"
    await filterButton.click();
    await expect(panel).toBeVisible();
    await expect(apply).toHaveText('Aplicar (2 OS)');
    await panel.getByText('Pendentes', { exact: true }).click();
    await expect(apply).toHaveText('Aplicar (1 OS)');
    await apply.click();
    await expect(panel).toBeHidden();
    await expect(header.getByTestId('report-filter-count')).toHaveText('1');
    await expect(header.getByTestId('report-filter-chips')).toContainText('Pendentes');
    await expect(osHeaders).toHaveCount(1);

    // Filtro não baixa os dados de novo
    expect(orderCalls.length).toBe(callsAfterLoad);

    // O ✕ do chip remove o filtro
    await header.getByRole('button', { name: 'Remover filtro Pendentes' }).click();
    await expect(header.getByTestId('report-filter-count')).toBeHidden();
    await expect(osHeaders).toHaveCount(2);

    // Fechar sem aplicar não muda nada
    await filterButton.click();
    await panel.getByText('Digitadas', { exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(header.getByTestId('report-filter-count')).toBeHidden();
    await expect(osHeaders).toHaveCount(2);

    // Limpar filtros volta ao padrão
    await filterButton.click();
    await panel.getByText('Pendentes', { exact: true }).click();
    await apply.click();
    await expect(header.getByTestId('report-filter-count')).toHaveText('1');
    await filterButton.click();
    await panel.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(apply).toHaveText('Aplicar (2 OS)');
    await apply.click();
    await expect(header.getByTestId('report-filter-count')).toBeHidden();
    await expect(osHeaders).toHaveCount(2);

    // Carrossel Resumo ↔ Histórico
    await page.getByRole('tab', { name: 'Histórico' }).click();
    await expect(page.getByTestId('report-chart-history')).toBeInViewport({ ratio: 0.9 });
    await page.getByRole('tab', { name: 'Resumo' }).click();
    await expect(page.getByTestId('report-chart-summary')).toBeInViewport({ ratio: 0.9 });

    // Trocar de mês baixa de novo (dia 1 → último dia do mês anterior)
    const label = await header.getByTestId('report-date-label').innerText();
    const day = Number(label.slice(0, 2));
    const callsBeforeNav = orderCalls.length;
    for (let i = 0; i < day; i++) {
      await header.getByRole('button', { name: 'Dia anterior' }).click();
    }
    await expect.poll(() => orderCalls.length).toBe(callsBeforeNav + 1);
  });

  test('computador: botão Filtros, gráficos lado a lado e Gerar Relatório', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupReport(page);
    await page.goto('/usina_vale/admin-report');

    await expect(page.getByRole('heading', { name: /Relatório Administrativo/ })).toBeVisible();
    await expect(page.getByTestId('report-os-header')).toHaveCount(2);

    // Gráficos lado a lado
    const summary = await page.getByTestId('report-chart-summary').boundingBox();
    const history = await page.getByTestId('report-chart-history').boundingBox();
    expect(Math.abs(summary!.y - history!.y)).toBeLessThan(4);
    expect(summary!.x + summary!.width).toBeLessThanOrEqual(history!.x);

    // Painel lateral de filtros
    await page.getByTestId('report-filter-button').click();
    const panel = page.getByTestId('report-filter-panel');
    await expect(panel.getByRole('heading', { name: 'Filtros' })).toBeVisible();
    await panel.getByText('Pendentes', { exact: true }).click();
    await panel.getByTestId('report-filter-apply').click();
    await expect(page.getByTestId('report-filter-button')).toHaveText(/Filtros \(1\)/);
    await expect(page.getByTestId('report-os-header')).toHaveCount(1);

    // Diálogo Gerar Relatório
    await page.getByRole('button', { name: /Gerar Relatório/i }).click();
    await expect(page.getByRole('heading', { name: 'Gerar Relatório' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Salvar PDF/i })).toBeVisible();
  });
});
