import { test, expect, Page, Locator } from '@playwright/test';

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

/** Na gaveta "Adicionar peças", cadastra uma peça à mão e coloca na seleção. */
async function addManualPart(sheet: Locator, code: string, desc: string, extraUnits = 0) {
  await sheet.getByRole('button', { name: /Digitar à mão/i }).click();
  await sheet.getByLabel('Código', { exact: true }).fill(code);
  await sheet.getByLabel('Descrição', { exact: true }).fill(desc);
  for (let i = 0; i < extraUnits; i++) {
    await sheet.getByRole('button', { name: 'Aumentar quantidade', exact: true }).click();
  }
  await expect(sheet.getByRole('spinbutton', { name: 'Quantidade', exact: true })).toHaveValue(String(1 + extraUnits));
  await sheet.getByRole('button', { name: 'Adicionar à seleção' }).click();
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

    await addManualPart(sheet, 'ABC-1', 'Rolamento teste', 1);
    await expect(sheet.getByTestId('part-selection-summary')).toHaveText('1 peça · 2 unidades');
    await sheet.getByRole('button', { name: 'Concluir (1)' }).click();

    await expect(sheet).toBeHidden();
    await expect(card.getByTestId('os-part-row')).toContainText('Qtd 2');
    await expect(card).toContainText('1 peça');
  });

  test('adiciona várias peças de uma vez no card', async ({ page }) => {
    await createOsMobile(page, '2468', '07:30', '08:30');
    const card = page.getByTestId('os-card').first();

    await card.getByRole('button', { name: 'Adicionar peça' }).click();
    const sheet = page.getByTestId('add-part-sheet');
    await addManualPart(sheet, 'AAA-1', 'Peça um');
    await addManualPart(sheet, 'BBB-2', 'Peça dois');
    await expect(sheet.getByTestId('part-selection-summary')).toHaveText('2 peças · 2 unidades');
    await sheet.getByRole('button', { name: 'Concluir (2)' }).click();

    await expect(sheet).toBeHidden();
    await expect(card.getByTestId('os-part-row')).toHaveCount(2);
    await expect(card).toContainText('2 peças');
  });

  test('fechar a gaveta de peças com seleção pede para descartar', async ({ page }) => {
    await createOsMobile(page, '1357', '13:00', '14:00');
    const card = page.getByTestId('os-card').first();

    await card.getByRole('button', { name: 'Adicionar peça' }).click();
    const sheet = page.getByTestId('add-part-sheet');
    await addManualPart(sheet, 'ZZZ-9', 'Peça descartada');
    await page.keyboard.press('Escape');

    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText('Descartar 1 peça selecionada?');
    await confirm.getByRole('button', { name: 'Descartar' }).click();
    await expect(sheet).toBeHidden();
    await expect(card).toContainText('Sem peças');
  });

  test('Percurso esconde campos e Agregado vazio mostra erro', async ({ page }) => {
    await page.getByTestId('os-fab').click();
    const form = page.getByTestId('os-form-sheet');
    await expect(form.getByText('Nova Ordem de Serviço')).toBeVisible();

    await form.getByRole('radio', { name: 'Percurso' }).click();
    await expect(form.getByLabel('Nº OS', { exact: true })).toHaveCount(0);
    await expect(form.getByLabel('Serviço', { exact: true })).toHaveCount(0);
    await expect(form.getByTestId('os-parts-section')).toHaveCount(0);
    await expect(form.getByRole('switch', { name: 'Agregado' })).toHaveCount(0);

    await form.getByRole('radio', { name: 'OS', exact: true }).click();
    await expect(form.getByLabel('Nº OS', { exact: true })).toBeVisible();
    await form.getByPlaceholder(/Digite o número do AF/i).fill('9090');
    await form.getByRole('switch', { name: 'Agregado' }).click();
    await form.getByRole('button', { name: /Salvar OS/i }).click();

    await expect(form.locator('#numero-agregado')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('#numero-agregado-error')).toHaveText('Informe o Nº Agregado para continuar.');
    await expect(form.locator('#numero-agregado')).toBeFocused();
  });

  test('adiciona peças no formulário, remove e desfaz, e salva', async ({ page }) => {
    await page.getByTestId('os-fab').click();
    const form = page.getByTestId('os-form-sheet');
    await form.getByPlaceholder(/Digite o número do AF/i).fill('7777');
    const timeInputs = form.locator('input[type="time"]');
    await timeInputs.nth(0).fill('08:00');
    await timeInputs.nth(1).fill('10:30');
    await expect(form.getByTestId('os-duration')).toHaveText('2h30');

    await expect(form.getByText('Nenhuma peça. Toque em Adicionar peças.')).toBeVisible();
    await form.getByRole('button', { name: 'Adicionar peças' }).click();
    const sheet = page.getByTestId('add-part-sheet');
    await addManualPart(sheet, 'FX-9', 'Filtro teste');
    await sheet.getByRole('button', { name: 'Concluir (1)' }).click();
    await expect(sheet).toBeHidden();

    const part = form.getByTestId('os-form-part');
    await expect(part).toContainText('FX-9');
    await expect(form.getByRole('spinbutton', { name: 'Quantidade de FX-9' })).toHaveValue('1');

    await form.getByRole('button', { name: 'Remover FX-9' }).click();
    await expect(part).toHaveCount(0);
    await form.getByRole('button', { name: 'Desfazer' }).click();
    await expect(part).toContainText('FX-9');

    await form.getByRole('button', { name: /Salvar OS/i }).click();
    const card = page.getByTestId('os-card').first();
    await expect(card).toContainText('AF: 7777');
    await expect(card.getByTestId('os-part-row')).toContainText('FX-9');
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
