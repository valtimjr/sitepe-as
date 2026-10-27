import { test, expect, Page } from '@playwright/test';

const dismissWelcome = async (page: Page) => {
  const acceptBtn = page.getByRole('button', { name: 'Aceitar e Continuar' });
  try {
    await acceptBtn.waitFor({ state: 'visible', timeout: 4000 });
    await acceptBtn.click({ timeout: 10000 });
  } catch {
    // Aviso não exibido
  }
};

test.describe('Minha Lista: salvar / importar', () => {
  test.beforeEach(async ({ page }) => {
    // Evita que o aviso de boas-vindas e o banner de cookies cubram o menu
    await page.addInitScript(() => {
      localStorage.setItem('welcome_notice_accepted', 'true');
      localStorage.setItem('cookie_consent_given', 'true');
    });
  });

  test('visitante importa uma planilha CSV pelo assistente', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/usina_vale/parts-list', { timeout: 15000 });
    await dismissWelcome(page);

    await page.getByTestId('list-save-menu-trigger').click({ timeout: 10000 });
    await page.getByRole('menuitem', { name: /Importar planilha/i }).click({ timeout: 10000 });

    const dialog = page.getByRole('dialog', { name: 'Importar para Minha Lista' });
    await expect(dialog).toBeVisible();

    const csv = 'codigo;descricao;qtd;af\nE2E-001;Peca importada teste;3;\nE2E-002;Peca com erro;0;\n';
    await page.getByTestId('import-file-input').setInputFiles({
      name: 'pecas.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    }, { timeout: 10000 });
    await expect(dialog.getByTestId('import-file-name')).toHaveText('pecas.csv');
    await expect(dialog.getByText(/2 linhas/)).toBeVisible({ timeout: 10000 });

    // Etapa 1 -> 2 (mapeamento automático)
    await expect(dialog.getByTestId('import-next-button')).toBeEnabled({ timeout: 10000 });
    await dialog.getByTestId('import-next-button').click({ timeout: 10000 });
    await expect(dialog.getByText('Mapeamento de Colunas')).toBeVisible();

    // Etapa 2 -> 3 (validação)
    await expect(dialog.getByTestId('import-next-button')).toBeEnabled({ timeout: 10000 });
    await dialog.getByTestId('import-next-button').click({ timeout: 10000 });
    await expect(dialog.getByText('Validação e Preview')).toBeVisible();
    await expect(dialog.getByTestId('validation-count-total')).toContainText('2');
    await expect(dialog.getByTestId('validation-count-erros')).toContainText('1');

    // Etapa 3 -> 4 -> importar
    await expect(dialog.getByTestId('import-next-button')).toBeEnabled({ timeout: 10000 });
    await dialog.getByTestId('import-next-button').click({ timeout: 10000 });
    await expect(dialog.getByText('Adicionar à lista atual')).toBeVisible();
    await expect(dialog.getByTestId('import-next-button')).toBeEnabled({ timeout: 10000 });
    await dialog.getByTestId('import-next-button').click({ timeout: 10000 });

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Peca importada teste')).toBeVisible();
    await expect(page.getByText('Peca com erro')).toHaveCount(0);
  });

  test('visitante que tenta salvar na nuvem vê o login', async ({ page }) => {
    await page.goto('/usina_vale/parts-list');
    await dismissWelcome(page);

    await page.getByTestId('list-save-menu-trigger').click({ timeout: 10000 });
    await page.getByRole('menuitem', { name: 'Salvar na nuvem' }).click({ timeout: 10000 });

    await expect(page.getByRole('dialog', { name: 'Entrar no AutoBoard' })).toBeVisible();
  });
});
