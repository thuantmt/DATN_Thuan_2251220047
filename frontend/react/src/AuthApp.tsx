import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, type AuthRole, type AuthUser } from './auth-api';
import DemoApp from './App';

const names: Record<AuthRole, string> = { learner: 'Người học', teacher: 'Giáo viên', admin: 'Quản trị viên' };
export default function AuthApp() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [dashboard, setDashboard] = useState('');
  function navigate(next: string) {
    window.history.pushState(null, '', next); setPath(next); setError(''); setNotice(''); setShowPassword(false);
  }
  useEffect(() => {
    const pop = () => { setPath(window.location.pathname); setError(''); };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    if (path === '/demo') { setLoading(false); return; }
    let active = true;
    setLoading(true); setDashboard(''); setError('');
    void (async () => {
      try {
        const result = await api<{ user: AuthUser }>('/auth/me');
        if (!active) return;
        setUser(result.user);
        const requested = path.match(/^\/(learner|teacher|admin)\/dashboard$/)?.[1];
        if (requested) {
          const data = await api<{ message: string }>(`/${requested}/dashboard`);
          if (active) setDashboard(data.message);
        } else if (['/', '/login', '/register'].includes(path)) {
          window.history.replaceState(null, '', `/${result.user.role}/dashboard`);
          setPath(`/${result.user.role}/dashboard`);
        }
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) {
          setUser(null);
          if (!['/login', '/register'].includes(path)) {
            window.history.replaceState(null, '', '/login'); setPath('/login');
          }
        } else {
          setError(e instanceof Error ? e.message : 'Không xác minh được phiên.');
          if (e instanceof ApiError && e.code === 'ACCOUNT_BLOCKED') setUser(null);
        }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [path]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const fields = new FormData(event.currentTarget);
    const register = path === '/register';
    try {
      const data = await api<{ user: AuthUser }>(register ? '/auth/register' : '/auth/login', {
        email: fields.get('email'), password: fields.get('password'),
        ...(register ? { fullName: fields.get('fullName') } : {}),
      });
      if (register) { navigate('/login'); setNotice('Đăng ký thành công. Vui lòng đăng nhập.'); }
      else { setUser(data.user); navigate(`/${data.user.role}/dashboard`); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Yêu cầu thất bại.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await api('/auth/logout', {}); setUser(null); navigate('/login'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Đăng xuất thất bại.'); }
    finally { setBusy(false); }
  }
  if (path === '/demo') return <><div className="auth-demo-bar"><button onClick={() => navigate('/login')}>Về tài khoản thật</button><span>Demo độc lập · Dữ liệu localStorage không gắn tài khoản đăng nhập.</span></div><DemoApp /></>;
  const register = path === '/register';
  const authPage = path === '/login' || register;
  const expected = path.match(/^\/(learner|teacher|admin)\/dashboard$/)?.[1];
  return <div className="app-shell auth-shell">
    <header><h1>IELTS Writing Coach</h1><p>Tài khoản và phiên được xác minh từ backend.</p>
      <nav aria-label="Điều hướng tài khoản"><button onClick={() => navigate('/login')}>Tài khoản</button> <button onClick={() => navigate('/demo')}>Mở demo Writing</button>{user && <button disabled={busy} onClick={logout}>{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>}</nav>
    </header>
    <main>
      {loading ? <p role="status">Đang xác minh phiên đăng nhập…</p> : <>
        {error && <p role="alert" className="warn">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {authPage && !user && <section className="auth-card"><h2>{register ? 'Đăng ký người học' : 'Đăng nhập'}</h2>
          <form onSubmit={submit}>
            {register && <label>Họ và tên<input name="fullName" autoComplete="name" required minLength={2} maxLength={100} /></label>}
            <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
            <label>Mật khẩu<input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 10 : 1} maxLength={128} /></label>
            {register && <p>Mật khẩu từ 10 đến 128 ký tự. Tài khoản mới có vai trò Người học.</p>}
            <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button>
            <button disabled={busy} type="submit">{busy ? 'Đang gửi…' : register ? 'Đăng ký' : 'Đăng nhập'}</button>
          </form>
          <button disabled={busy} onClick={() => navigate(register ? '/login' : '/register')}>{register ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản người học'}</button>
        </section>}
        {user && expected && expected !== user.role && <section><h2>403 · Không đủ quyền</h2><button onClick={() => navigate(`/${user.role}/dashboard`)}>Về dashboard của tôi</button></section>}
        {user && expected === user.role && dashboard && !error && <section className="auth-card"><h2>Dashboard {names[user.role]}</h2><p>{user.fullName}</p><p>{user.email}</p><p>Trạng thái: {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}</p><p>{dashboard}</p></section>}
        {error && <button onClick={() => window.location.reload()}>Thử kết nối lại</button>}
        {!authPage && !expected && <p>404 · Không tìm thấy trang.</p>}
      </>}
    </main>
  </div>;
}
