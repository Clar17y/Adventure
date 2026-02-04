import { describe, expect, it, vi } from 'vitest';

describe('auth config', () => {
  it('defaults to 15 minutes access + 30 days refresh', async () => {
    vi.resetModules();
    delete process.env.ACCESS_TOKEN_TTL_MINUTES;
    delete process.env.REFRESH_TOKEN_TTL_DAYS;

    const mod = await import('./auth.js');
    expect(mod.authConfig.accessTokenTtlMinutes).toBe(15);
    expect(mod.authConfig.refreshTokenTtlDays).toBe(30);
  });

  it('reads TTL values from env', async () => {
    vi.resetModules();
    process.env.ACCESS_TOKEN_TTL_MINUTES = '60';
    process.env.REFRESH_TOKEN_TTL_DAYS = '7';

    const mod = await import('./auth.js');
    expect(mod.authConfig.accessTokenTtlMinutes).toBe(60);
    expect(mod.authConfig.refreshTokenTtlDays).toBe(7);
  });

  it('computes refresh expiry timestamp', async () => {
    vi.resetModules();
    process.env.REFRESH_TOKEN_TTL_DAYS = '7';

    const mod = await import('./auth.js');
    const nowMs = 1_700_000_000_000;
    expect(mod.refreshTokenExpiresAt(nowMs).getTime()).toBe(nowMs + 7 * 24 * 60 * 60 * 1000);
  });
});
