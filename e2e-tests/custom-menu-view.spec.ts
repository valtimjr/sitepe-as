import { test, expect } from '@playwright/test';
import { mockCatalog } from './fixtures/catalog';

test.describe('Catálogo de Peças no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('mostra ícones, expande/recolhe, abre ⓘ sem navegar e abre a lista', async ({ page }) => {
    await mockCatalog(page);
    await page.goto('/usina_vale/custom-menu-view');

    const header = page.getByTestId('catalog-header');
    await expect(header).toBeVisible({ timeout: 15000 });
    await expect(header.getByTestId('catalog-summary')).toHaveText('2 categorias · 2 listas');

    const motor = page.getByRole('region', { name: 'Motor' });
    await expect(motor.getByTestId('catalog-category-header').getByTestId('list-icon')).toHaveAttribute('data-icon-value', '🔧');
    const filtros = motor.getByRole('button', { name: /Filtros/ });
    await expect(filtros.getByTestId('list-icon')).toHaveAttribute('data-icon-value', '🧰');
    await expect(filtros).toHaveAttribute('aria-expanded', 'false');

    await page.getByRole('button', { name: 'Expandir tudo' }).click();
    const oleo = page.getByRole('link', { name: /Filtro de Óleo/ });
    await expect(oleo.getByTestId('list-icon')).toHaveAttribute('data-icon-value', '🛢️');
    // Subtítulos: sem ícone próprio herdam o da lista; com ícone próprio usam o seu
    const subInherited = page.getByRole('link', { name: /Sub Dinâmico/ });
    await expect(subInherited.getByTestId('list-icon')).toHaveAttribute('data-icon-value', '🛢️');
    await expect(subInherited).toHaveAttribute('href', '/usina_vale/custom-list/e2e-list-oleo#sub-1');
    await expect(page.getByRole('link', { name: /Sub Próprio/ }).getByTestId('list-icon')).toHaveAttribute('data-icon-value', '⚙️');

    await page.getByRole('button', { name: 'Itens relacionados de Filtro de Óleo' }).click();
    await expect(page.getByTestId('catalog-related-popover')).toContainText('REL-1');
    await expect(page).toHaveURL(/\/custom-menu-view$/);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Recolher tudo' }).click();
    await expect(oleo).toHaveCount(0);

    await page.getByRole('button', { name: 'Expandir tudo' }).click();
    await page.getByRole('link', { name: /Filtro de Óleo/ }).click();
    await expect(page).toHaveURL(/\/usina_vale\/custom-list\/e2e-list-oleo$/);
  });
});

test.describe('Catálogo de Peças na web', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('grade de cartões com badge e link de lista', async ({ page }) => {
    await mockCatalog(page);
    await page.goto('/usina_vale/custom-menu-view');

    await expect(page.getByRole('heading', { name: 'Catálogo de Peças' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('region', { name: 'Motor' })).toContainText('1 lista');
    await expect(page.getByRole('button', { name: /Voltar para o Início/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Voltar para o Início/ })).toBeVisible();

    await page.getByRole('region', { name: 'Freios' }).getByRole('link', { name: /Freios/ }).click();
    await expect(page).toHaveURL(/\/usina_vale\/custom-list\/e2e-list-freio$/);
  });
});
