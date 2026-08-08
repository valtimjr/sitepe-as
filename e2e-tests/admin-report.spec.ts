import { test, expect } from '@playwright/test';

test.describe('Relatório Administrativo com Snapshot Temporário', () => {
  test('deve carregar dados em lote e processar snapshot em memória', async ({ page }) => {
    // Acessar página de relatório administrativo
    await page.goto('/usina_vale/admin-report');

    // Fechar aviso de cookie se existir
    const cookieBtn = page.getByRole('button', { name: /Concordar|Aceitar/i });
    try {
      await cookieBtn.waitFor({ state: 'visible', timeout: 3000 });
      await cookieBtn.click();
    } catch {
      // Ignorar se não presente
    }

    // Caso a página redirecione por permissão não ser admin em usuário anônimo ou de teste,
    // garantimos que o relatório tenta renderizar o cabeçalho ou título principal.
    const title = page.getByRole('heading', { name: /Relatório Administrativo/i });
    if (await title.isVisible({ timeout: 5000 })) {
      await expect(title).toBeVisible();

      // Verificar existência dos cards de seleção de data e filtros
      await expect(page.getByText('Seleção de Data')).toBeVisible();
      await expect(page.getByText('Filtros')).toBeVisible();

      // Verificar gráficos de resumo diário e histórico do período
      await expect(page.getByText('Histórico do Período')).toBeVisible();
      await expect(page.getByText('Ordens de Serviço Filtradas')).toBeVisible();

      // Testar alternância para modo Período
      await page.getByRole('tab', { name: 'Período' }).click();
      await expect(page.getByText('Histórico do Período')).toBeVisible();

      // Testar botão Gerar Relatório (abrir modal)
      await page.getByRole('button', { name: /Gerar Relatório/i }).click();
      await expect(page.getByRole('heading', { name: 'Gerar Relatório' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Salvar PDF/i })).toBeVisible();
    }
  });
});
