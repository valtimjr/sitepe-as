import { test, expect, Page } from '@playwright/test';

async function dismissNotices(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('welcome_notice_accepted', 'true');
    localStorage.setItem('cookie_consent_given', 'true');
  });
}

async function createOsMobile(page: Page, af: string, horaInicio: string, horaFinal: string) {
  await page.getByTestId('os-fab').click();
  await expect(page.getByText('Nova Ordem de Serviço')).toBeVisible();
  await page.getByPlaceholder(/Digite o número do AF/i).fill(af);
  const timeInputs = page.locator('input[type="time"]');
  await timeInputs.nth(0).fill(horaInicio);
  await timeInputs.nth(1).fill(horaFinal);
  await page.getByRole('button', { name: /Salvar OS/i }).click();
  await expect(page.getByText(`AF: ${af}`).first()).toBeVisible();
}

test.describe('Ordens de Serviço no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await dismissNotices(page);
    await page.goto('/usina_vale/service-orders');
    await expect(page.getByTestId('os-day-header')).toBeVisible({ timeout: 15000 });
  });

  test('cria OS pelo botão flutuante, abre o card e adiciona peça', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Iniciar Nova OS/i })).toHaveCount(0);

    await createOsMobile(page, '4321', '08:00', '10:30');

    const card = page.getByTestId('os-card').first();
    await expect(card).toContainText('08:00–10:30');
    // Card recém-criado abre sozinho
    await expect(card.getByTestId('os-card-details')).toBeVisible();

    // Toque fecha e reabre
    await card.getByTestId('os-card-toggle').click();
    await expect(card.getByTestId('os-card-details')).toBeHidden();
    await card.getByTestId('os-card-toggle').click();
    await expect(card.getByTestId('os-card-details')).toBeVisible();

    await card.getByRole('button', { name: 'Adicionar peça' }).click();
    const sheet = page.getByTestId('add-part-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel('Buscar peça')).toBeVisible();

    await sheet.getByRole('button', { name: /Digitar código e descrição à mão/i }).click();
    await sheet.getByLabel('Código').fill('ABC-1');
    await sheet.getByLabel('Descrição').fill('Rolamento teste');
    await sheet.getByRole('button', { name: 'Aumentar quantidade' }).click();
    await expect(sheet.getByRole('spinbutton', { name: 'Quantidade' })).toHaveValue('2');
    await sheet.getByRole('button', { name: /^Adicionar$/ }).click();

    await expect(sheet).toBeHidden();
    await expect(card.getByTestId('os-part-row')).toContainText('Qtd 2');
    await expect(card).toContainText('1 peça');
  });

  test('menu ⋯ abre a edição com Salvar fixo no rodapé', async ({ page }) => {
    await createOsMobile(page, '5678', '09:00', '11:00');

    await page.getByTestId('os-card-menu').first().click();
    await page.getByRole('menuitem', { name: /Editar OS/i }).click();

    await expect(page.getByText('Editar Ordem de Serviço')).toBeVisible();
    const footer = page.getByTestId('os-form-footer');
    await expect(footer).toBeVisible();
    await expect(footer.getByRole('button', { name: /Salvar OS/i })).toBeInViewport();
    await expect(page.getByTestId('os-fab')).toHaveCount(0);
  });

  test('Compartilhar abre a gaveta e mostra o contador da seleção', async ({ page }) => {
    await createOsMobile(page, '1111', '08:00', '09:00');

    await page.getByTestId('os-share-button').click();
    const share = page.getByTestId('os-share-sheet');
    await expect(share).toBeVisible();
    await expect(share.getByRole('button', { name: 'Copiar texto' })).toBeVisible();
    await expect(share.getByRole('button', { name: 'Enviar no WhatsApp' })).toBeVisible();
    await expect(share.getByRole('button', { name: 'Gerar PDF' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(share).toBeHidden();

    await page.getByRole('checkbox', { name: 'Selecionar AF 1111' }).click();
    await expect(page.getByTestId('os-share-count')).toHaveText('1');
    await expect(page.getByTestId('os-selection-bar')).toContainText('1 selecionada');

    await page.getByTestId('os-share-button').click();
    await expect(page.getByTestId('os-share-sheet')).toContainText('Compartilhar 1 OS selecionada');
  });
});

test.describe('Ordens de Serviço na web', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('mantém o layout atual', async ({ page }) => {
    await dismissNotices(page);
    await page.goto('/usina_vale/service-orders');
    await expect(page.getByRole('button', { name: /Iniciar Nova OS/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Copiar Lista/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Exportar PDF/i })).toBeVisible();
    await expect(page.getByTestId('os-day-header')).toHaveCount(0);
    await expect(page.getByTestId('os-fab')).toHaveCount(0);
  });
});
