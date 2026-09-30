import { useRef, useState } from 'react';
import { AppContext } from './context';
import { localRepository, type Repository } from './services';
import type { Page, Role, State } from './types';
import Practice from './pages/Practice';
import { History, Progress } from './pages/History';
import { Teacher, Admin } from './pages/Management';

const roleNames: Record<Role, string> = { student: 'Người học', teacher: 'Giáo viên', admin: 'Quản trị' };
const pages: Record<Role, [Page, string][]> = {
  student: [['practice', 'Luyện viết'], ['history', 'Bài viết'], ['progress', 'Tiến độ']],
  teacher: [['teacher', 'Không gian giáo viên']], admin: [['admin', 'Quản trị hệ thống']],
};
export default function App({ repository }: { repository?: Repository }) {
  const repo = useRef<Repository | null>(repository ?? null);
  const [loaded] = useState(() => {
    try {
      repo.current ??= localRepository(window.localStorage);
      const state = repo.current.load();
      if (!pages[state.role]) state.role = 'student';
      if (!pages[state.role].some(([p]) => p === state.uiPage)) state.uiPage = pages[state.role][0][0];
      return { state, error: '' };
    } catch { return { state: null, error: 'Không đọc được dữ liệu trình duyệt. Dữ liệu gốc chưa bị ghi đè. Hãy kiểm tra quyền lưu trữ hoặc sao lưu dữ liệu trước khi khôi phục.' }; }
  });
  const [state, setState] = useState<State | null>(loaded.state);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  function update(change: (next: State) => void, message = '') {
    if (!state) return false;
    const next = structuredClone(state);
    try { change(next); } catch (e) { setError(e instanceof Error ? e.message : 'Không thực hiện được thao tác.'); return false; }
    setState(next);
    try {
      repo.current!.save(next);
      setError('');
      if (message) setNotice(message);
      return true;
    } catch (e) {
      setNotice('');
      setError(`Chưa lưu được thay đổi. Nội dung vẫn còn trong phiên này. ${e instanceof Error ? e.message : 'Bộ nhớ đầy hoặc bị tắt.'}`);
      return false;
    }
  }
  if (!state) return <main className="app-shell"><h1>Không thể mở dữ liệu</h1><p role="alert">{loaded.error}</p><button className="secondary-button" onClick={() => location.reload()}>Thử tải lại</button></main>;
  return <AppContext.Provider value={{ state, update, notify: setNotice }}>
    <a className="skip-link" href="#main">Đến nội dung chính</a>
    <header className="topbar"><div className="topbar-inner">
      <button className="brand" onClick={() => update(s => { s.uiPage = pages[s.role][0][0]; })}><span className="brand-mark" aria-hidden="true">✎</span><span><strong>IELTS<span className="brand-accent">Master</span></strong><small>Writing practice workspace</small></span></button>
      <nav aria-label="Điều hướng chính">{pages[state.role].map(([page, label]) => <button key={page} className={`nav-link ${state.uiPage === page ? 'active' : ''}`} aria-current={state.uiPage === page ? 'page' : undefined} onClick={() => update(s => { s.uiPage = page; })}>{label}</button>)}</nav>
      <div className="topbar-end"><span className="demo-pill">● BẢN DEMO</span><button className="notification-button" type="button" aria-label="Thông báo">♢<span aria-hidden="true" /></button><label className="sr-only" htmlFor="role">Xem vai trò</label><select id="role" aria-label="Xem vai trò" value={state.role} onChange={e => update(s => { s.role = e.target.value as Role; s.uiPage = pages[s.role][0][0]; })}>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="user-avatar" aria-hidden="true">NH</span></div>
    </div></header>
    <div className="app-shell"><p className="scope-note">Dữ liệu cục bộ · Phản hồi mô phỏng · Chuyển vai trò chỉ để xem giao diện, chưa có xác thực hoặc phân quyền thật.</p>
      <main id="main" tabIndex={-1}>
        {error && <div className="warn" role="alert">{error}</div>}
        {notice && <div className="toast" role="status">{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
        {state.uiPage === 'practice' && <Practice />}
        {state.uiPage === 'history' && <History />}
        {state.uiPage === 'progress' && <Progress />}
        {state.uiPage === 'teacher' && <Teacher />}
        {state.uiPage === 'admin' && <Admin />}
      </main><footer>IELTS Writing Coach · Frontend luyện tập · Chưa có chấm IELTS thật.</footer>
    </div>
  </AppContext.Provider>;
}
