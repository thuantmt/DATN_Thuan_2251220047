import { useState, type FormEvent } from 'react';
import { useApp } from '../context';
import { Intro, Panel, Stats, TopicImage, imageUrl } from '../components';
import type { Role, Topic, Version } from '../types';

const field = (data: FormData, name: string) => String(data.get(name) ?? '').trim();
const names: Record<Role, string> = { student: 'Người học', teacher: 'Giáo viên', admin: 'Quản trị' };
export function TopicManager() {
  const { state, update } = useApp();
  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const task = Number(field(data, 'task')) as 1 | 2;
    const title = field(data, 'title'), prompt = field(data, 'prompt'), image = field(data, 'image');
    if (update(s => {
      if (!title || !prompt) throw Error('Hãy nhập tên và nội dung đề.');
      if (task === 1 && !imageUrl(image)) throw Error('Task 1 cần ảnh hợp lệ: đường dẫn ảnh mẫu hoặc URL https của ảnh.');
      s.topics.push({ id: crypto.randomUUID(), task, title, prompt, image: task === 1 ? image : '', type: 'Đề giáo viên', active: true });
    }, 'Đã thêm đề luyện viết cục bộ.')) form.reset();
  }
  return <Panel title="Ngân hàng đề"><form onSubmit={add} className="form-stack"><div className="form-row"><label>Loại bài<select name="task" defaultValue="2"><option value="1">Task 1</option><option value="2">Task 2</option></select></label><label>Tên đề<input name="title" required maxLength={80} /></label></div><label>Nội dung đề tiếng Anh<textarea name="prompt" lang="en" rows={3} required /></label><label>Ảnh Task 1<small>Đường dẫn ảnh mẫu hoặc URL https của ảnh</small><input name="image" placeholder="../data/images/T1-BAR-01.png" /></label><button className="primary-button" type="submit">Thêm đề ↗</button></form><div className="section-divider" /><h3>Đề hiện có</h3><div className="topic-list">{state.topics.map(t => <div className="topic-item" key={t.id}><div><strong>{t.title}</strong><small>Task {t.task} · {t.active ? 'Đang hiển thị' : 'Đã ẩn'}</small></div><button className="text-button" aria-label={`${t.active ? 'Ẩn đề' : 'Bật đề'} ${t.title}`} onClick={() => update(s => { const topic = s.topics.find(x => x.id === t.id)!; topic.active = !topic.active; })}>{t.active ? 'Ẩn đề' : 'Bật đề'}</button></div>)}</div></Panel>;
}
export function Teacher() {
  const { state } = useApp();
  const [essayId, setEssayId] = useState(state.essays[0]?.id ?? '');
  const [number, setNumber] = useState<number | null>(null);
  const essay = state.essays.find(e => e.id === essayId) ?? state.essays[0];
  const version = essay?.versions.find(v => v.number === number) ?? essay?.versions.at(-1);
  const topic: Topic | undefined = essay && {
    id: essay.topicId, title: essay.titleSnapshot ?? state.topics.find(t => t.id === essay.topicId)?.title ?? 'Đề đã lưu',
    task: essay.task, prompt: essay.promptSnapshot, image: essay.imageSnapshot, type: 'Đề đã lưu', active: true,
  };
  return <><Intro title="Không gian giáo viên">Quản lý đề và lưu nhận xét, điểm tham chiếu riêng cho từng phiên bản.</Intro><div className="teacher-layout"><TopicManager /><Panel title="Nhận xét bổ sung">{essay && version ? <>
    <label className="field-label" htmlFor="review-essay">Chọn bài viết</label><select id="review-essay" className="field" value={essay.id} onChange={e => { setEssayId(e.target.value); setNumber(null); }}>{state.essays.map(e => <option value={e.id} key={e.id}>Task {e.task} · {e.titleSnapshot ?? state.topics.find(t => t.id === e.topicId)?.title ?? 'Đề đã lưu'} · {e.id.slice(0, 6)}</option>)}</select>
    <label className="field-label review-version" htmlFor="review-version">Phiên bản nhận xét</label><select id="review-version" className="field" value={version.number} onChange={e => setNumber(Number(e.target.value))}>{essay.versions.map(v => <option key={v.number} value={v.number}>#{v.number}</option>)}</select>
    <div className="prompt-card"><p lang="en">{essay.promptSnapshot}</p></div>{topic && <TopicImage key={topic.image} topic={topic} />}<div className="essay-preview"><span>Nội dung đã nộp · bản {version.number}</span><p lang="en">{version.body}</p></div>
    <ReviewForm key={`${essay.id}-${version.number}`} essayId={essay.id} version={version} />
  </> : <p className="empty-mini">Chưa có bài viết. Chuyển sang vai trò người học để nộp bài trước.</p>}</Panel></div></>;
}
function ReviewForm({ essayId, version }: { essayId: string; version: Version }) {
  const { update } = useApp();
  return <form className="form-stack" onSubmit={e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget), score = field(data, 'score'), note = field(data, 'note');
    update(s => {
      if (!note) throw Error('Hãy nhập nhận xét.');
      if (score && (!Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 9 || Number(score) * 2 % 1 !== 0)) throw Error('Điểm tham chiếu từ 0 đến 9, bước 0,5.');
      const v = s.essays.find(x => x.id === essayId)!.versions.find(x => x.number === version.number)!;
      v.teacherReview = { score: score || null, note, at: new Date().toISOString() };
    }, `Đã lưu nhận xét giáo viên cho bản ${version.number}, riêng với phản hồi mô phỏng.`);
  }}><label>Điểm giáo viên tham chiếu<small>Không phải điểm IELTS chính thức; có thể để trống</small><input name="score" type="number" min="0" max="9" step="0.5" defaultValue={version.teacherReview?.score ?? ''} /></label><label>Nhận xét bổ sung<textarea name="note" required rows={4} defaultValue={version.teacherReview?.note ?? ''} /></label><button className="primary-button" type="submit">Lưu nhận xét ↗</button></form>;
}
export function Admin() {
  const { state, update } = useApp();
  return <><Intro title="Tổng quan quản trị">Quản lý dữ liệu người dùng, đề và thống kê cục bộ trong bản demo.</Intro><Stats items={[
    ['Tài khoản demo', state.users.length], ['Đề luyện viết', state.topics.length], ['Bài viết', state.essays.length],
  ]} /><div className="teacher-layout management-grid"><Panel title="Người dùng"><div className="topic-list">{state.users.map(u => <div className="topic-item" key={u.id}><div><strong>{u.name}</strong><small>{names[u.role]} · {u.active ? 'Đang hoạt động' : 'Đã vô hiệu'}</small></div><button className="text-button" aria-label={`${u.active ? 'Vô hiệu' : 'Bật lại'} ${u.name}`} onClick={() => update(s => { const user = s.users.find(x => x.id === u.id)!; user.active = !user.active; })}>{u.active ? 'Vô hiệu' : 'Bật lại'}</button></div>)}</div></Panel><Panel title="Tạo người dùng demo"><form className="form-stack" onSubmit={e => {
    e.preventDefault();
    const form = e.currentTarget, data = new FormData(form);
    if (update(s => {
      const name = field(data, 'name');
      if (!name) throw Error('Hãy nhập họ tên.');
      s.users.push({ id: crypto.randomUUID(), name, role: field(data, 'role') as Role, active: true });
    }, 'Đã thêm người dùng demo; chưa có thông tin đăng nhập.')) form.reset();
  }}><label>Họ tên<input name="name" required maxLength={80} /></label><label>Vai trò<select name="role">{Object.entries(names).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label><button className="primary-button" type="submit">Thêm người dùng ↗</button></form><p className="helper">Tài khoản này chỉ là dữ liệu mô phỏng, không đăng nhập được.</p></Panel><TopicManager /></div></>;
}
