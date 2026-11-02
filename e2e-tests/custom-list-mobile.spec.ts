import { test, expect } from '@playwright/test';
import { mockCatalog } from './fixtures/catalog';

test.describe('Página da lista no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('cabeçalho compacto, Compartilhar, seleção e exportação', async ({ page }) => {
    await mockCatalog(page);
    await page.goto('/usina_vale/custom-list/e2e-list-oleo');

    const header = page.getByTestId('custom-list-mobile-header');
    await expect(header).toBeVisible({ timeout: 15000 });
    const title = header.getByTestId('custom-list-title');
    await expect(title).toHaveText('Filtro de Óleo');
    await expect(title).toHaveClass(/text-lg/);
    await expect(header).toContainText('2 itens');

    const exportButton = page.getByTestId('custom-list-export-button');
    await expect(exportButton).toHaveText('Exportar para Minha Lista');
    const exportBox = await exportButton.boundingBox();
    expect(exportBox?.width ?? 0).toBeGreaterThan(330);

    await page.getByTestId('custom-list-share-button').click();
    const sheet = page.getByTestId('custom-list-share-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('todos os itens');
    await expect(sheet.getByRole('button', { name: 'Copiar texto' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Exportar PDF' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Exportar CSV (planilha)' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();

    await page.getByRole('checkbox', { name: 'Selecionar item Filtro A' }).click();
    const bar = page.getByTestId('custom-list-selection-bar');
    await expect(bar).toContainText('1 selecionado');
    await expect(page.getByTestId('custom-list-share-count')).toHaveText('1');
    await expect(exportButton).toHaveText('Exportar 1 selecionado');

    await bar.getByRole('button', { name: 'Exportar' }).click();
    await expect(page.getByText('Exportar Itens para Minha Lista')).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Quantidade de Filtro A' })).toHaveValue('2');
  });
});

test.describe('Página da lista na web', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('barra de ações com os 4 rótulos numa linha', async ({ page }) => {
    await mockCatalog(page);
    await page.goto('/usina_vale/custom-list/e2e-list-oleo');

    const bar = page.getByTestId('custom-list-action-bar');
    await expect(bar).toBeVisible({ timeout: 15000 });
    const exportButton = bar.getByRole('button', { name: 'Exportar para Minha Lista' });
    const pdf = bar.getByRole('button', { name: 'Exportar PDF' });
    await expect(exportButton).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Copiar lista' })).toHaveText('Copiar');
    await expect(bar.getByRole('button', { name: 'Exportar CSV' })).toHaveText('CSV');
    await expect(pdf).toHaveText('PDF');

    const exportBox = await exportButton.boundingBox();
    const pdfBox = await pdf.boundingBox();
    expect(Math.abs((exportBox?.y ?? 0) - (pdfBox?.y ?? 100))).toBeLessThan(4);
  });
});
