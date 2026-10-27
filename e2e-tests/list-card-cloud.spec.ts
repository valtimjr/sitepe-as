import { test, expect, type Page } from '@playwright/test';

const openCardMenu = async (page: Page) => {
  await page
    .getByRole('region', { name: 'Navegação de Listas de Peças' })
    .getByRole('button', { name: 'Opções da lista' })
    .first()
    .click({ timeout: 15000 });
};

test.describe('Minha Lista: nuvem pelo menu do cartão', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('welcome_notice_accepted', 'true');
      localStorage.setItem('cookie_consent_given', 'true');
    });
  });

  test('Salvar envia a lista e Atualizar sincroniza a versão mais nova', async ({ page }) => {
    test.setTimeout(90000);

    // Entra pela página de login
    await page.goto('/login', { timeout: 15000 });
    await page.getByLabel('Email').fill(process.env.DYAD_TEST_USER_EMAIL!);
    await page.getByPlaceholder('Sua senha').fill(process.env.DYAD_TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/usina_vale$/, { timeout: 20000 });

    await page.goto('/usina_vale/parts-list', { timeout: 15000 });

    // Lista nova ainda não tem cópia na nuvem
    await openCardMenu(page);
    await expect(page.getByRole('menuitem', { name: 'Atualizar na nuvem' })).toHaveAttribute('data-disabled', '');

    // Salvar envia a versão local
    await page.getByRole('menuitem', { name: 'Salvar na nuvem' }).click();
    await expect(page.getByText('Lista "Principal" salva na nuvem!')).toBeVisible({ timeout: 20000 });

    // Sem mudanças: já está atualizada
    await openCardMenu(page);
    await page.getByRole('menuitem', { name: 'Atualizar na nuvem' }).click();
    await expect(page.getByText('Lista "Principal" já está atualizada.')).toBeVisible({ timeout: 20000 });

    // Muda a lista localmente: a versão local é a mais nova e vai para a nuvem
    await openCardMenu(page);
    await page.getByRole('menuitem', { name: 'Renomear / Ícone' }).click();
    const edit = page.getByRole('dialog', { name: 'Editar Lista' });
    await edit.getByLabel('Novo Nome').fill('Principal Sync');
    await edit.getByRole('button', { name: 'Salvar' }).click();
    await expect(edit).toBeHidden();

    await openCardMenu(page);
    await page.getByRole('menuitem', { name: 'Atualizar na nuvem' }).click();
    await expect(
      page.getByText('A versão local de "Principal Sync" era mais nova e foi enviada para a nuvem.')
    ).toBeVisible({ timeout: 20000 });
  });
});
