import { test, expect } from '@playwright/test';

test.describe('Funcionalidade Aguardando Serviço', () => {
  test('deve exibir indicador e gráfico com Aguardando Serviço no resumo diário', async ({ page }) => {
    // Acessar lista de ordens de serviço
    await page.goto('/usina_vale/service-orders');

    // Aceitar cookies ou modal de boas vindas se visível
    const cookieBtn = page.getByRole('button', { name: /Concordar|Aceitar/i });
    try {
      await cookieBtn.waitFor({ state: 'visible', timeout: 3000 });
      await cookieBtn.click();
    } catch {
      // Prosseguir se não visível
    }

    // Criar uma OS das 09:00 às 11:00
    await page.getByRole('button', { name: /Iniciar Nova OS/i }).click();

    const afInput = page.getByPlaceholder(/Digite o número do AF/i);
    await afInput.fill('9999');

    const horaInicioInput = page.locator('input[type="time"]').first();
    await horaInicioInput.fill('09:00');

    const horaFinalInputs = page.locator('input[type="time"]');
    await horaFinalInputs.nth(1).fill('11:00');

    await page.getByRole('button', { name: /Salvar OS/i }).click();

    // Verificar se o card "Aguardando Serviço" é exibido no resumo diário
    await expect(page.getByText('Aguardando Serviço')).toBeVisible();

    // Abrir o popover de gráficos de desempenho (botão do gráfico de pizza)
    const chartButton = page.locator('button.text-blue-600').first();
    await chartButton.click();

    // No popover do gráfico diário, verificar cabeçalho e categoria "Aguardando"
    await expect(page.getByRole('heading', { name: 'Desempenho Diário' })).toBeVisible();
    await expect(page.getByText('Aguardando', { exact: true })).toBeVisible();
  });
});
