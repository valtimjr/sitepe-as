import { test, expect, type Page, type Download } from '@playwright/test';
import { readFileSync } from 'fs';
import { mockCatalog } from './fixtures/catalog';

const readPdf = async (download: Download) => {
  const path = await download.path();
  return readFileSync(path!).toString('latin1');
};

const countImages = (pdf: string) => (pdf.match(/\/Subtype\s*\/Image/g) ?? []).length;

const seedMyList = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('welcome_notice_accepted', 'true');
    localStorage.setItem('cookie_consent_given', 'true');
    const now = new Date().toISOString();
    localStorage.setItem(
      'autoboard_lists_v2_usina_vale',
      JSON.stringify({
        activeListId: 'pdf-list',
        lists: [
          {
            id: 'pdf-list',
            name: 'Caminhão 42',
            createdAt: now,
            updatedAt: now,
            icon: { source: 'lucide', value: 'Truck', color: '#2563EB', background: 'linear-gradient(90deg, #DBEAFE 0%, #FDE68A 100%)' },
            items: [
              { id: 'p1', codigo_peca: 'PDF-001', descricao: 'Peça do PDF', quantidade: 2, company: 'usina_vale' },
            ],
          },
        ],
      }),
    );
  });
};

test.describe('PDF com ícones e logo', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('PDF do Catálogo tem logo, ícones, título limpo e nome com data', async ({ page }) => {
    await mockCatalog(page);
    await page.goto('/usina_vale/custom-list/e2e-list-oleo');

    const bar = page.getByTestId('custom-list-action-bar');
    await expect(bar).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Sub Próprio')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await bar.getByRole('button', { name: 'Exportar PDF' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Filtro_de_Oleo_\d{4}-\d{2}-\d{2}\.pdf$/);
    const pdf = await readPdf(download);
    // logo + ícone da lista (reaproveitado no subtítulo herdado) + ícone do subtítulo próprio
    expect(countImages(pdf)).toBeGreaterThanOrEqual(3);
    expect(pdf).toContain('Filtro de Óleo');
    expect(pdf).not.toContain('Filtro de Óleo (Usina Vale)');
  });

  test('PDF da Minha Lista tem logo, ícone da lista e nome com data', async ({ page }) => {
    await seedMyList(page);
    await page.goto('/usina_vale/parts-list');

    await expect(page.getByText('PDF-001').first()).toBeVisible({ timeout: 15000 });

    // O PDF fica na janela Compartilhar
    await page.getByTestId('parts-list-share-button').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('parts-list-share-sheet').getByRole('button', { name: 'Exportar PDF', exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Caminhao_42_\d{4}-\d{2}-\d{2}\.pdf$/);
    const pdf = await readPdf(download);
    expect(countImages(pdf)).toBeGreaterThanOrEqual(2);
    expect(pdf).toContain('Caminhão 42');
  });

  test('renderListIconToPng gera PNG para emoji, Lucide, degradê e automático', async ({ page }) => {
    await mockCatalog(page);
    await page.goto('/usina_vale/custom-list/e2e-list-oleo');
    await expect(page.getByTestId('custom-list-action-bar')).toBeVisible({ timeout: 15000 });

    const results = await page.evaluate(async () => {
      const mod = await import('/src/lib/pdfIcons.ts' as string);
      return Promise.all([
        mod.renderListIconToPng({ source: 'emoji', value: '🛢️' }, 'Óleo'),
        mod.renderListIconToPng({ source: 'lucide', value: 'Truck', color: '#F59E0B' }, 'Truck'),
        mod.renderListIconToPng(
          { source: 'heroicons-solid', value: 'BoltIcon', color: 'linear-gradient(90deg, #F00 0%, #00F 100%)', background: 'radial-gradient(circle, #FFF 0%, #EEE 100%)' },
          'Bolt',
        ),
        mod.renderListIconToPng(null, 'Caminhão'),
      ]);
    });

    for (const result of results) {
      expect(result).toMatch(/^data:image\/png;base64,/);
    }
  });
});
