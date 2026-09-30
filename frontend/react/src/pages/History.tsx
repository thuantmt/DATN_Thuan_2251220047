import { countWords, formatDate } from '../../../store.mjs';
import { useApp } from '../context';
import { openEssay } from '../services';
import { Intro, Panel, Stats } from '../components';

export function History() {
  const { state, update } = useApp();
  return <><Intro title="Bài viết và các lần chỉnh sửa">Mở lại bài đã nộp, xem phiên bản cũ và tiếp tục cải thiện.</Intro>{state.essays.length ? <div className="history-grid">{state.essays.map(e => <article className="history-card" key={e.id}><span className="section-kicker">TASK {e.task} · {formatDate(e.createdAt)}</span><h2>{e.titleSnapshot ?? state.topics.find(t => t.id === e.topicId)?.title ?? 'Đề đã lưu'}</h2><p lang="en">{e.promptSnapshot}</p><div className="history-meta"><span>{e.versions.length} phiên bản</span><span>{countWords(e.versions.at(-1)!.body)} từ</span><span>Band —</span></div><button className="secondary-button" onClick={() => update(s => openEssay(s, e.id))}>Mở và sửa bài ↗</button></article>)}</div> : <Panel title="Chưa có bài viết"><p>Chọn Task 1 hoặc Task 2 và nộp bài đầu tiên để lưu lịch sử.</p><button className="primary-button" onClick={() => update(s => { s.uiPage = 'practice'; })}>Bắt đầu luyện viết ↗</button></Panel>}</>;
}
export function Progress() {
  const { state } = useApp();
  return <><Intro title="Tiến độ luyện viết">Theo dõi số bài và phiên bản được lưu trên trình duyệt.</Intro><Stats items={[
    ['Task 1 đã viết', state.essays.filter(e => e.task === 1).length],
    ['Task 2 đã viết', state.essays.filter(e => e.task === 2).length],
    ['Lần sửa và nộp lại', state.essays.reduce((n, e) => n + e.versions.length - 1, 0)],
  ]} /><Panel title="Biểu đồ band score và lỗi thường gặp" className="progress-panel"><p>Chưa có kết quả chấm được kiểm chứng để lập xu hướng điểm hoặc thống kê lỗi lặp. Số bài đếm mỗi bài một lần, số lần sửa đếm các phiên bản sau bản đầu tiên.</p><div className="chart-empty">Chờ dữ liệu chấm thật</div></Panel></>;
}
