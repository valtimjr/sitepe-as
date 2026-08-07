import { test, expect } from '@playwright/test';

test.describe('Funcionalidade Agregado na Ordem de Serviço', () => {
  test('deve validar e salvar Ordem de Serviço com Agregado', async ({ page }) => {
    // Ir para a página de Lista de OS (Usina Vale como exemplo)
    await page.goto('/usina_vale/service-orders');

    // Clicar no botão para iniciar nova OS
    await page.getByRole('button', { name: /Iniciar Nova OS/i }).click();

    // Testar incompatibilidade com Percurso
    const percursoCheckbox = page.getByLabel('Percurso (Deslocamento)');
    await percursoCheckbox.check();

    // Verificar se o Agregado fica desabilitado e com mensagem informativa
    const agregadoCheckbox = page.getByLabel('Agregado');
    await expect(agregadoCheckbox).toBeDisabled();
    await expect(page.getByText('Indisponível em OS de percurso')).toBeVisible();

    // Desmarcar Percurso
    await percursoCheckbox.uncheck();
    await expect(agregadoCheckbox).toBeEnabled();

    // Marcar Agregado
    await agregadoCheckbox.check();

    // Campo Nº Agregado deve aparecer
    const numeroAgregadoInput = page.getByPlaceholder('Ex: 123456');
    await expect(numeroAgregadoInput).toBeVisible();

    // Preencher AF
    await page.getByPlaceholder('Ex: 42032 ou pesquise pelo nome').fill('1001');

    // Tentar salvar com Nº Agregado em branco
    await page.getByRole('button', { name: /Salvar OS/i }).click();

    // Deve exibir mensagem de erro de validação
    await expect(page.getByText('Informe o Nº Agregado para continuar.')).toBeVisible();

    // Preencher o Nº do Agregado e OS
    await numeroAgregadoInput.fill('123456');
    await page.getByPlaceholder('Ex: 45001').fill('2001');

    // Salvar OS
    await page.getByRole('button', { name: /Salvar OS/i }).click();

    // Verificar se a OS salva é exibida na lista com Agregado: 123456
    await expect(page.getByText('AF: 1001')).toBeVisible();
    await expect(page.getByText('(OS: 2001)')).toBeVisible();
    await expect(page.getByText('• Agregado: 123456')).toBeVisible();
  });
});
