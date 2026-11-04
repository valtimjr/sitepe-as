import { test, expect, type Page } from '@playwright/test';

const b64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
// JWT falso, só com formato e validade, para o setSession aceitar
const fakeJwt = () =>
  `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'e2e-badge-user', exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })}.sig`;

const USER = { id: 'e2e-badge-user', email: 'cracha@e2e.test', aud: 'authenticated', role: 'authenticated' };

async function prepare(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('welcome_notice_accepted', 'true');
    localStorage.setItem('cookie_consent_given', 'true');
  });
}

async function fill(page: Page, identifier: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail ou crachá').fill(identifier);
  await page.getByLabel('Senha', { exact: true }).fill('senha-teste');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

test.describe('Login por e-mail ou crachá', () => {
  test('e-mail usa o login normal e não chama a function', async ({ page }) => {
    await prepare(page);
    let functionCalled = false;
    let tokenCalled = false;
    await page.route(/\/functions\/v1\/badge-login/, route => {
      functionCalled = true;
      return route.fulfill({ status: 500, json: {} });
    });
    await page.route(/\/auth\/v1\/token/, route => {
      tokenCalled = true;
      return route.fulfill({
        status: 400,
        json: { code: 'invalid_credentials', error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' },
      });
    });

    await fill(page, 'a@b.com');
    await expect(page.getByText('Crachá/e-mail ou senha incorretos')).toBeVisible();
    expect(tokenCalled).toBe(true);
    expect(functionCalled).toBe(false);
  });

  test('crachá com zeros chama badge-login normalizado e entra', async ({ page }) => {
    await prepare(page);
    let sentBadge: string | undefined;
    await page.route(/\/functions\/v1\/badge-login/, route => {
      sentBadge = route.request().postDataJSON()?.badge;
      return route.fulfill({ json: { access_token: fakeJwt(), refresh_token: 'e2e-refresh' } });
    });
    await page.route(/\/auth\/v1\/user/, route => route.fulfill({ json: USER }));

    await fill(page, '004213');
    await expect(page).not.toHaveURL(/\/login/);
    expect(sentBadge).toBe('4213');
  });

  test('erros do crachá mostram as mensagens certas', async ({ page }) => {
    await prepare(page);
    let status = 401;
    const bodies: Record<number, object> = {
      401: { error: 'invalid' },
      429: { error: 'locked' },
      403: { error: 'email_not_confirmed' },
    };
    await page.route(/\/functions\/v1\/badge-login/, route => route.fulfill({ status, json: bodies[status] }));

    await fill(page, '4213');
    await expect(page.getByText('Crachá/e-mail ou senha incorretos')).toBeVisible();
    await expect(page.getByText('Se o problema continuar, entre com seu e-mail.')).toBeVisible();

    status = 429;
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByText('Muitas tentativas. Aguarde alguns minutos.')).toBeVisible();

    status = 403;
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByText('Confirme seu e-mail antes de entrar.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reenviar link de confirmação' })).toHaveCount(0);
  });

  test('celular: campo "E-mail ou crachá" cabe na tela', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page);
    await page.goto('/login');
    const input = page.getByLabel('E-mail ou crachá');
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
});
