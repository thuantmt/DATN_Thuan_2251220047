import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AuthApp from './AuthApp';
const learner = { id: '1', fullName: 'Test Learner', email: 'learner@example.test', role: 'learner', status: 'active' };
const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ data }) });
const failed = (status: number, code = 'UNAUTHENTICATED') => ({ ok: false, status, json: async () => ({ error: { code, message: 'Không có quyền hoặc chưa đăng nhập.' } }) });
beforeEach(() => { window.history.replaceState(null, '', '/login'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('logs in through API, restores dashboard and logs out', async () => {
  let loggedIn = false;
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    if (url.endsWith('/auth/login')) { loggedIn = true; return ok({ user: learner }); }
    if (url.endsWith('/auth/logout')) { loggedIn = false; return ok({ loggedOut: true }); }
    if (url.endsWith('/auth/me')) return loggedIn ? ok({ user: learner }) : failed(401);
    return ok({ message: 'Thông tin backend.' });
  });
  vi.stubGlobal('fetch', fetchMock); render(<AuthApp />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), learner.email);
  await user.type(screen.getByLabelText('Mật khẩu'), 'test-password-2026');
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByRole('heading', { name: 'Dashboard Người học' })).toBeInTheDocument();
  const loginCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/auth/login'))!;
  expect(loginCall[1]).toMatchObject({ credentials: 'include', headers: { 'X-CSRF-Protection': '1' } });
  await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));
  expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
});
it('restores existing session after refresh without displaying wrong dashboard', async () => {
  window.history.replaceState(null, '', '/teacher/dashboard');
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/auth/me') ? ok({ user: learner }) : failed(403, 'FORBIDDEN')));
  render(<AuthApp />);
  expect(await screen.findByRole('heading', { name: '403 · Không đủ quyền' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Dashboard Giáo viên' })).not.toBeInTheDocument();
});
it('redirects unauthenticated direct dashboard access to login', async () => {
  window.history.replaceState(null, '', '/admin/dashboard');
  vi.stubGlobal('fetch', vi.fn(async () => failed(401))); render(<AuthApp />);
  expect(await screen.findByLabelText('Email')).toBeInTheDocument();
  await waitFor(() => expect(window.location.pathname).toBe('/login'));
});
it('shows backend connection failure and does not simulate a login', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); })); render(<AuthApp />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được backend');
  expect(screen.queryByText('Dashboard Người học')).not.toBeInTheDocument();
});
it('registers a learner with no client role and returns to login', async () => {
  window.history.replaceState(null, '', '/register');
  const fetchMock = vi.fn(async (url: string) => url.endsWith('/auth/register') ? ok({ user: learner }) : failed(401));
  vi.stubGlobal('fetch', fetchMock); render(<AuthApp />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Họ và tên'), 'Test Learner');
  await user.type(screen.getByLabelText('Email'), learner.email);
  await user.type(screen.getByLabelText('Mật khẩu'), 'test-password-2026');
  await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
  expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('type', 'text');
  await user.click(screen.getByRole('button', { name: 'Đăng ký' }));
  expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  const [, options] = fetchMock.mock.calls.find(([url]) => url.endsWith('/auth/register'))! as unknown as [string, RequestInit];
  expect(JSON.parse(options.body as string)).toEqual({ fullName: 'Test Learner', email: learner.email, password: 'test-password-2026' });
});
