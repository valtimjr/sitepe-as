import { test, expect, type Page } from '@playwright/test';

const base = { avatar_url: null, suggest_parts: true, auto_fill_timesheet: false };

const USERS = [
  { ...base, id: 'e2e-admin', first_name: 'Admin', last_name: 'Teste', role: 'admin', badge: '4213', badge_normalized: '4213', email: 'admin@e2e.test', profession_code: 1, shift_code: 1, is_duplicate: false },
  { ...base, id: 'u-maria', first_name: 'Maria', last_name: 'Souza', role: 'user', badge: '0100', badge_normalized: '100', email: 'maria@e2e.test', profession_code: 2, shift_code: null, is_duplicate: true },
  { ...base, id: 'u-pedro', first_name: 'Pedro', last_name: 'Lima', role: 'moderator', badge: '100', badge_normalized: '100', email: 'pedro@e2e.test', profession_code: null, shift_code: 1, is_duplicate: true },
  { ...base, id: 'u-ana', first_name: 'Ana', last_name: 'Costa', role: 'user', badge: null, badge_normalized: null, email: 'ana@e2e.test', profession_code: 1, shift_code: null, is_duplicate: false },
];

const PROFESSIONS = [
  { name: 'Eletricista', ref_code: 2 },
  { name: 'Mecânico', ref_code: 1 },
];
const SHIFTS = [
  { name: 'Turno A', ref_code: 1 },
  { name: 'Turno B', ref_code: 2 },
];

// Simula o usuário logado pelo cache local da sessão e responde o banco com dados fixos
async function setup(page: Page, role: 'admin' | 'moderator' = 'admin') {
  await page.addInitScript((r) => {
    localStorage.setItem('welcome_notice_accepted', 'true');
    localStorage.setItem('cookie_consent_given', 'true');
    const user = { id: 'e2e-admin', email: 'admin@e2e.test' };
    localStorage.setItem('autoboard_cached_session_v2', JSON.stringify({ access_token: 'e2e', user }));
    localStorage.setItem('autoboard_cached_user_v2', JSON.stringify(user));
    localStorage.setItem('autoboard_cached_profile_v2', JSON.stringify({ id: 'e2e-admin', role: r, first_name: 'Admin' }));
  }, role);
  await page.route(/\/rest\/v1\/rpc\/admin_list_users/, (route) => route.fulfill({ json: USERS }));
  await page.route(/\/rest\/v1\/professions(\?|$)/, (route) => route.fulfill({ json: PROFESSIONS }));
  await page.route(/\/rest\/v1\/shifts(\?|$)/, (route) => route.fulfill({ json: SHIFTS }));
  const patches: Record<string, unknown>[] = [];
  await page.route(/\/rest\/v1\/profiles(\?|$)/, (route) => {
    if (route.request().method() === 'PATCH') {
      patches.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ json: [] });
  });
  return patches;
}

test.describe('Painel Administração - Usuários', () => {
  test('celular: busca, contador, editar turno e aviso de crachá repetido', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const patches = await setup(page);
    await page.goto('/usina_vale/admin');

    await page.getByTestId('admin-section-list').getByRole('link', { name: /^Usuários/ }).click();
    await expect(page).toHaveURL(/secao=usuarios/);

    const rows = page.getByTestId('user-row');
    await expect(rows).toHaveCount(4);

    // Busca pelo crachá
    const search = page.getByLabel('Buscar usuários');
    await search.fill('4213');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Admin Teste');
    await search.fill('');

    // Contador de repetidos filtra a lista
    await page.getByTestId('user-counter-duplicates').click();
    await expect(rows).toHaveCount(2);
    await page.getByTestId('user-counter-duplicates').click();
    await expect(rows).toHaveCount(4);

    // Editar o turno envia só o campo alterado
    await rows.filter({ hasText: 'Ana Costa' }).click();
    const sheet = page.getByTestId('user-edit-sheet');
    await expect(sheet).toBeVisible();
    await sheet.getByRole('combobox', { name: 'Turno' }).click();
    await page.getByRole('option', { name: 'Turno B' }).click();
    await sheet.getByRole('button', { name: 'Salvar' }).click();
    await expect(sheet).toBeHidden();
    expect(patches).toHaveLength(1);
    const { updated_at, ...sent } = patches[0];
    expect(updated_at).toBeTruthy();
    expect(sent).toEqual({ shift_code: 2 });
    await expect(rows.filter({ hasText: 'Ana Costa' })).toContainText('Turno B');

    // Crachá de outra pessoa trava o Salvar
    await rows.filter({ hasText: 'Ana Costa' }).click();
    await expect(sheet).toBeVisible();
    await sheet.getByLabel('Número do crachá').fill('04213');
    await expect(sheet.getByTestId('badge-taken-warning')).toHaveText(/Já usado por Admin Teste/);
    await expect(sheet.getByRole('button', { name: 'Salvar' })).toBeDisabled();

    // Fechar com alterações pede confirmação
    await sheet.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByText('Descartar alterações?')).toBeVisible();
    await page.getByRole('button', { name: 'Descartar' }).click();
    await expect(sheet).toBeHidden();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('web: tabela com filtros e função travada no próprio admin', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setup(page);
    await page.goto('/usina_vale/admin?secao=usuarios');

    await expect(page.getByRole('columnheader', { name: 'Profissão' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Função' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Maria Souza' })).toContainText('Eletricista');

    await page.getByTestId('user-row').filter({ hasText: 'Admin Teste' }).click();
    const sheet = page.getByTestId('user-edit-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel('Nome', { exact: true })).toBeEnabled();
    await expect(sheet.getByRole('radio', { name: 'Moderador' })).toBeDisabled();
    await expect(sheet.getByText('Você não pode alterar a própria função')).toBeVisible();
  });

  test('moderador: só o crachá é editável', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setup(page, 'moderator');
    await page.goto('/usina_vale/admin?secao=usuarios');

    await page.getByTestId('user-row').filter({ hasText: 'Maria Souza' }).click();
    const sheet = page.getByTestId('user-edit-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel('Número do crachá')).toBeEnabled();
    await expect(sheet.getByLabel('Nome', { exact: true })).toBeDisabled();
    await expect(sheet.getByRole('combobox', { name: 'Turno' })).toBeDisabled();
    await expect(sheet.getByRole('radio', { name: 'Admin' })).toBeDisabled();
  });

  test('link antigo ?secao=crachas abre Usuários', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setup(page);
    await page.goto('/usina_vale/admin?secao=crachas');
    await expect(page.getByTestId('user-row')).toHaveCount(4);
  });
});
