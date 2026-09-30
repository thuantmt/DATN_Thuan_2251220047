import { useEffect, useState } from 'react';
import { countWords } from '../../../store.mjs';
import { useApp } from '../context';
import { currentTopic, selectTopic, sendQuestion, submitEssay, writeDraft } from '../services';
import { TopicImage } from '../components';
import type { Essay, Version } from '../types';

export default function Practice() {
  const { state, update, notify } = useApp();
  const [view, setView] = useState<{ essay: string; number: number } | null>(null);
  const [emptyTask, setEmptyTask] = useState<1 | 2>(2);
  const [draftState, setDraftState] = useState('Đã tự lưu cục bộ');
  const topic = currentTopic(state);
  const essay = state.essays.find(e => e.id === state.selectedEssay);
  const version = essay?.versions.find(v => view?.essay === essay.id && v.number === view.number) ?? essay?.versions.at(-1);
  const task = topic?.task ?? emptyTask;
  const words = countWords(state.draft);
  const minimumWords = task === 1 ? 150 : 250;

  function chooseTask(nextTask: 1 | 2) {
    setEmptyTask(nextTask);
    setView(null);
    update(s => selectTopic(s, s.topics.find(x => x.task === nextTask && x.active)?.id ?? null));
  }

  async function copyDraft() {
    if (!state.draft) {
      notify('Khung bài viết đang trống.');
      return;
    }
    try {
      await navigator.clipboard.writeText(state.draft);
      notify('Đã sao chép nội dung bài viết.');
    } catch {
      notify('Trình duyệt chưa cho phép sao chép tự động. Hãy chọn nội dung và sao chép thủ công.');
    }
  }

  return <div className="practice-page">
    <div className="practice-toolbar">
      <div className="task-switcher" role="group" aria-label="Chọn loại bài">
        {([1, 2] as const).map(t => <button key={t} className={task === t ? 'selected' : ''} aria-label={`Task ${t} ${t === 1 ? 'Mô tả dữ liệu' : 'Viết luận'}`} aria-pressed={task === t} onClick={() => chooseTask(t)}>
          <span>Academic Task {t}</span><small>{t === 1 ? 'Mô tả dữ liệu' : 'Viết luận'}</small>
        </button>)}
      </div>
      <div className="target-note"><span aria-hidden="true">◆</span> Mục tiêu luyện tập: hoàn thành đúng yêu cầu đề</div>
      <Timer task={task} />
    </div>

    <div className="workspace workspace-focus">
      <section className="writing-column" aria-label="Khu vực viết bài">
        <div className="prompt-panel surface-card">
          <div className="prompt-heading">
            <div><span className="section-kicker">ĐỀ LUYỆN VIẾT</span><h1>{topic?.title ?? `IELTS Academic Writing Task ${task}`}</h1></div>
            {essay && <span className="snapshot-pill">Đề đã lưu theo bài nộp</span>}
          </div>
          {essay ? <div className="edit-context">Đang sửa bài theo đề đã lưu khi nộp<button onClick={() => { setView(null); update(s => selectTopic(s, s.topics.find(t => t.active && t.task === task)?.id ?? null)); }}>Viết bài mới</button></div> : <div className="topic-field"><label htmlFor="topic-select" className="field-label">Chọn chủ đề</label><select id="topic-select" className="field" value={state.selectedTopic ?? ''} onChange={e => { setView(null); update(s => selectTopic(s, e.target.value)); }}><option value="" disabled>Chọn đề luyện viết</option>{state.topics.filter(t => t.task === task && t.active).map(t => <option key={t.id} value={t.id}>{t.title} · {t.type}</option>)}</select></div>}
          <div className="prompt-card"><p lang="en">{topic?.prompt ?? 'Hiện chưa có đề đang hoạt động cho Task này.'}</p></div>
          {topic && <TopicImage key={topic.image} topic={topic} />}
        </div>

        <div className="editor-panel surface-card">
          <div className="editor-toolbar" aria-label="Công cụ soạn thảo">
            <div className="editor-title"><span aria-hidden="true">✎</span><strong>{essay ? 'Sửa bài và tạo phiên bản mới' : 'Bài viết của bạn'}</strong></div>
            <span className="draft-state"><span aria-hidden="true">●</span> {draftState}</span>
            <button type="button" className="icon-button" onClick={copyDraft} title="Sao chép bài viết" aria-label="Sao chép bài viết">▣</button>
          </div>
          <label className="sr-only" htmlFor="essay-body">Nội dung bài viết tiếng Anh</label>
          <textarea id="essay-body" lang="en" spellCheck value={state.draft} placeholder={`Bắt đầu viết bài bằng tiếng Anh tại đây... (tối thiểu ${minimumWords} từ)`} onChange={e => {
            setDraftState('Đang lưu...');
            const saved = update(s => writeDraft(s, e.target.value));
            setDraftState(saved ? 'Đã tự lưu cục bộ' : 'Chưa lưu được');
          }} />
          <div className="editor-bottom">
            <div className="word-counter"><span>Số từ</span><strong className={words >= minimumWords ? 'good' : words > 0 ? 'progress' : ''}>{words}</strong><small>Tối thiểu {minimumWords} từ</small></div>
            <div className="action-row"><button className="secondary-button" onClick={() => { if (update(() => {}, 'Đã lưu nháp trên trình duyệt này.')) setDraftState('Đã lưu nháp'); }}>Lưu nháp</button><button className="primary-button" onClick={() => { if (update(s => { submitEssay(s); }, 'Đã nộp bản viết. Phản hồi là mô phỏng, chưa có điểm AI.')) { setView(null); setDraftState('Đã nộp phiên bản mới'); } }}>Nộp bài ↗</button></div>
          </div>
        </div>
      </section>

      <aside className="assistant-column" aria-label="Phản hồi và hội thoại">
        <div className="assistant-shell">
          <header className="assistant-header">
            <div className="assistant-identity"><span className="assistant-avatar" aria-hidden="true">✦</span><div><h2>Trợ giảng viết</h2><p><span className="online-dot" /> Phản hồi mô phỏng</p></div></div>
            <div className="band-card"><span>Band ước lượng</span><strong>— <small>/ 9.0</small></strong></div>
          </header>
          <div className="simulation-banner"><strong>Bản demo frontend</strong><span>Không phải AI thật và không xác nhận lỗi thực tế.</span></div>
          <div className="assistant-content">
            {essay && version ? <>
              <div className="version-line"><span>Task {essay.task} · Phiên bản {version.number}</span><label>Chọn phiên bản<select value={version.number} onChange={e => setView({ essay: essay.id, number: Number(e.target.value) })}>{essay.versions.map(v => <option key={v.number} value={v.number}>#{v.number}</option>)}</select></label></div>
              <details className="submitted-body"><summary>Nội dung đã nộp · bản {version.number}</summary><p lang="en">{version.body}</p></details>
              <button className="text-button" onClick={() => update(s => writeDraft(s, version.body), `Đã đưa bản ${version.number} vào khung sửa. Nộp bài sẽ tạo phiên bản mới.`)}>Dùng bản {version.number} để sửa</button>
              <FeedbackView version={version} />
            </> : <EmptyFeedback task={task} />}
          </div>
          {essay && version?.feedback ? <Chat key={`${essay.id}-${version.number}`} essay={essay} version={version} /> : <div className="chat-locked"><span aria-hidden="true">◌</span><p>Nộp bài để mở hội thoại gắn với phiên bản cụ thể.</p></div>}
        </div>
      </aside>
    </div>
  </div>;
}

function Timer({ task }: { task: 1 | 2 }) {
  const duration = task === 1 ? 20 * 60 : 40 * 60;
  const [seconds, setSeconds] = useState(duration);
  const [running, setRunning] = useState(false);
  useEffect(() => { setSeconds(duration); setRunning(false); }, [duration]);
  useEffect(() => {
    if (!running || seconds <= 0) return;
    const id = window.setInterval(() => setSeconds(current => current > 0 ? current - 1 : 0), 1000);
    return () => window.clearInterval(id);
  }, [running, seconds]);
  useEffect(() => { if (seconds === 0) setRunning(false); }, [seconds]);
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return <div className={`timer-card ${seconds < 300 ? 'ending' : ''}`}>
    <span className="timer-icon" aria-hidden="true">◷</span><div><span>Thời gian</span><strong aria-live="off">{minutes}:{remainder}</strong></div>
    <button type="button" onClick={() => setRunning(value => !value)} aria-label={running ? 'Tạm dừng đồng hồ' : 'Bắt đầu đồng hồ'}>{running ? 'Ⅱ' : '▶'}</button>
    <button type="button" onClick={() => { setSeconds(duration); setRunning(false); }} aria-label="Đặt lại đồng hồ">↺</button>
  </div>;
}

function EmptyFeedback({ task }: { task: 1 | 2 }) {
  const criteria = [task === 1 ? 'Task Achievement' : 'Task Response', 'Coherence and Cohesion', 'Lexical Resource', 'Grammatical Range and Accuracy'];
  return <div className="empty-feedback"><div className="empty-visual"><span>✦</span></div><h3>Bài viết của bạn bắt đầu ở đây</h3><p>Nộp bài để xem khung bốn tiêu chí IELTS Writing, dẫn chứng và gợi ý luyện tập.</p><div className="criteria-placeholder">{criteria.map((criterion, index) => <div key={criterion}><span className="criterion-index">0{index + 1}</span>{criterion}<span className="placeholder-dash">—</span></div>)}</div></div>;
}

function FeedbackView({ version }: { version: Version }) {
  const f = version.feedback;
  return <>
    <div className="score-notice"><span className="notice-star" aria-hidden="true">✦</span><div><strong>Band score: chưa có</strong><small>Phản hồi mô phỏng, không xác nhận lỗi thực tế.</small></div></div>
    {f ? <><p className="feedback-overview">{f.overview}</p><div className="criteria-list">{f.criteria.map(c => <div className="criterion-row" key={c.code}><div className="criterion-head"><span className="criterion-code">{c.code}</span><div><strong>{c.label}</strong><small>{c.note}</small></div></div><span className="criterion-value">—</span></div>)}</div><h3 className="analysis-heading">Ví dụ khung phân tích</h3>{f.issues.map((issue, i) => <div className="issue" key={i}><span className="tag">{issue.criterion}</span><blockquote lang="en">{issue.quote}</blockquote><p>{issue.explanation}</p><small>{issue.suggestion}</small></div>)}</> : <p>Phiên bản này chưa có phản hồi.</p>}
    {version.teacherReview && <div className="teacher-note"><strong>Nhận xét giáo viên{version.teacherReview.score !== null && ` · điểm tham chiếu ${version.teacherReview.score}`}</strong><p>{version.teacherReview.note}</p></div>}
  </>;
}

function Chat({ essay, version }: { essay: Essay; version: Version }) {
  const { update } = useApp();
  const [question, setQuestion] = useState('');
  const used = version.thread.filter(m => m.sender === 'user').length;
  return <section className="chat-dock" aria-label="Hội thoại mô phỏng">
    <div className="chat-heading"><div><span className="section-kicker">HỘI THOẠI MÔ PHỎNG</span><h3>Hỏi để hiểu sâu hơn</h3></div><span className="chat-thread-label">Bài #{essay.id.slice(0, 6)} · Bản {version.number}</span></div>
    <div className="chat-messages" role="log" aria-label="Lịch sử hội thoại">{version.thread.length ? version.thread.map((m, i) => <div key={i} className={`message ${m.sender === 'user' ? 'mine' : 'assistant'}`}><span className="message-author">{m.sender === 'user' ? 'Bạn' : 'Bản demo'}</span><p>{m.text}</p></div>) : <div className="chat-welcome"><span>✦</span><p>Hỏi về một ý, một câu hoặc cách viết lại. Câu trả lời chỉ là mô phỏng.</p></div>}</div>
    <form onSubmit={e => { e.preventDefault(); if (update(s => { const v = s.essays.find(x => x.id === essay.id)!.versions.find(x => x.number === version.number)!; sendQuestion(v, question); })) setQuestion(''); }}>
      <label className="sr-only" htmlFor="chat-question">Câu hỏi về phiên bản {version.number}</label>
      <div className="chat-input"><textarea id="chat-question" rows={1} value={question} onChange={e => setQuestion(e.target.value)} maxLength={500} required disabled={used >= 5} placeholder="Hỏi về bài viết của bạn..." /><button type="submit" aria-label="Gửi câu hỏi" disabled={used >= 5}>➤</button></div>
    </form>
    <small className="chat-limit">Giới hạn 5 câu hỏi mỗi phiên bản · đã dùng {used}/5</small>
  </section>;
}
