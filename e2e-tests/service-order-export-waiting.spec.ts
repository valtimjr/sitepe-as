import { test, expect, Page } from '@playwright/test';

// Substitui o clipboard do navegador por um stub que guarda o texto copiado,
// para podermos inspecionar o resultado do botão "Copiar Lista".
async function stubClipboard(page: Page) {
  await page.addInitScript(() => {
    (window as any).__copiedTexts = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as any).__copiedTexts.push(text);
        },
      },
    });
  });
}

async function openServiceOrders(page: Page) {
  await page.goto('/usina_vale/service-orders');
  const cookieBtn = page.getByRole('button', { name: /Concordar|Aceitar/i });
  try {
    await cookieBtn.waitFor({ state: 'visible', timeout: 3000 });
    await cookieBtn.click();
  } catch {
    // Prosseguir se não visível
  }
}

async function createOs(page: Page, af: string, horaInicio?: string, horaFinal?: string) {
  await page.getByRole('button', { name: /Iniciar Nova OS/i }).click();
  await page.getByPlaceholder(/Digite o número do AF/i).fill(af);

  if (horaInicio && horaFinal) {
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(0).fill(horaInicio);
    await timeInputs.nth(1).fill(horaFinal);
  }

  await page.getByRole('button', { name: /Salvar OS/i }).click();
  await expect(page.getByText(`AF: ${af}`).first()).toBeVisible();
}

test.describe('Exportação de OS com Aguardando Serviço', () => {
  test('Copiar Lista inclui blocos de Aguardando Serviço em ordem cronológica', async ({ page }) => {
    await stubClipboard(page);
    await openServiceOrders(page);

    // Visitante usa o turno padrão 07:00 - 17:00
    await createOs(page, '1234', '09:00', '11:00');

    await page.getByRole('button', { name: /Copiar Lista/i }).click();

    await expect.poll(async () =>
      page.evaluate(() => ((window as any).__copiedTexts as string[]).length)
    ).toBe(1);

    const copied: string = await page.evaluate(() => (window as any).__copiedTexts[0]);

    const firstGap = copied.indexOf('Aguardando Serviço\n07:00-09:00');
    const activity = copied.indexOf('AF: 1234\n09:00-11:00');
    const lastGap = copied.indexOf('Aguardando Serviço\n11:00-17:00');

    expect(firstGap).toBeGreaterThan(-1);
    expect(activity).toBeGreaterThan(firstGap);
    expect(lastGap).toBeGreaterThan(activity);
  });

  test('bloqueia a exportação e avisa quando uma OS está sem horário', async ({ page }) => {
    await stubClipboard(page);
    await openServiceOrders(page);

    await createOs(page, '5555');

    await page.getByRole('button', { name: /Copiar Lista/i }).click();

    const dialog = page.getByTestId('invalid-times-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Não é possível calcular corretamente o Aguardando Serviço.');
    await expect(dialog).toContainText('AF: 5555');

    const copiedCount = await page.evaluate(() => ((window as any).__copiedTexts as string[]).length);
    expect(copiedCount).toBe(0);

    await dialog.getByRole('button', { name: 'Entendi' }).click();
    await expect(dialog).toBeHidden();
  });
});
