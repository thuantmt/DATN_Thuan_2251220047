import { initialState, STORAGE_KEY, createEssay, appendVersion, canSubmit } from '../../store.mjs';
import { demoFeedback, demoReply } from '../../mock-ai.mjs';
import type { State, Topic, Version } from './types';

// Local-only boundary. A future backend adapter can replace this repository.
export interface Repository { load(): State; save(state: State): void }
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = (value: Record<string, unknown>, keys: string[]) => keys.every(key => typeof value[key] === 'string');
const stringMap = (value: unknown) => record(value) && Object.values(value).every(v => typeof v === 'string');
function validPayload(value: unknown): value is State {
  if (!record(value) || !Array.isArray(value.topics) || !Array.isArray(value.users) || !Array.isArray(value.essays)) return false;
  if (value.draft !== undefined && typeof value.draft !== 'string') return false;
  if (value.drafts !== undefined && !stringMap(value.drafts)) return false;
  if (value.revisionDrafts !== undefined && !stringMap(value.revisionDrafts)) return false;
  return value.topics.every(t => record(t) && strings(t, ['id', 'title', 'type', 'prompt', 'image']) && [1, 2].includes(Number(t.task)) && typeof t.active === 'boolean')
    && value.users.every(u => record(u) && strings(u, ['id', 'name']) && ['student', 'teacher', 'admin'].includes(String(u.role)) && typeof u.active === 'boolean')
    && value.essays.every(e => record(e) && strings(e, ['id', 'topicId', 'promptSnapshot', 'imageSnapshot', 'createdAt'])
      && Number.isFinite(Date.parse(String(e.createdAt))) && [1, 2].includes(Number(e.task))
      && Array.isArray(e.versions) && e.versions.length > 0 && e.versions.every((v, i) => {
        if (!record(v) || !strings(v, ['body', 'createdAt']) || v.number !== i + 1 || !Array.isArray(v.thread)) return false;
        if (!v.thread.every(m => record(m) && typeof m.text === 'string' && ['user', 'assistant'].includes(String(m.sender)))) return false;
        if (v.teacherReview !== null && (!record(v.teacherReview) || !strings(v.teacherReview, ['note', 'at'])
          || (v.teacherReview.score !== null && typeof v.teacherReview.score !== 'string'))) return false;
        const f = v.feedback;
        return f === null || (record(f) && f.mode === 'simulation' && strings(f, ['overview', 'createdAt'])
          && Array.isArray(f.criteria) && f.criteria.every(c => record(c) && strings(c, ['code', 'label', 'value', 'note']))
          && Array.isArray(f.issues) && f.issues.every(x => record(x) && strings(x, ['criterion', 'quote', 'explanation', 'suggestion'])));
      }));
}
export function localRepository(storage: Pick<Storage, 'getItem' | 'setItem'>): Repository {
  let original: string | null | undefined;
  let backupNeeded = false;
  return {
    load() {
      original = storage.getItem(STORAGE_KEY);
      backupNeeded = Boolean(original);
      if (!original) return initialState();
      const saved: unknown = JSON.parse(original);
      if (!validPayload(saved)) {
        throw Error('Dữ liệu lưu không hợp lệ. Dữ liệu gốc vẫn được giữ nguyên.');
      }
      return { ...initialState(), ...saved, drafts: saved.drafts ?? {} };
    },
    save(state) {
      const current = storage.getItem(STORAGE_KEY);
      if (original !== undefined && current !== original) {
        throw Error('Dữ liệu đã thay đổi ở tab khác. Hãy sao chép bài đang viết rồi tải lại trang.');
      }
      // Preserve the exact legacy payload before the first write.
      if (backupNeeded && original && !storage.getItem(`${STORAGE_KEY}-before-react`)) {
        storage.setItem(`${STORAGE_KEY}-before-react`, original);
      }
      const next = JSON.stringify(state);
      storage.setItem(STORAGE_KEY, next);
      original = next;
      backupNeeded = false;
    },
  };
}
export function writeDraft(state: State, body: string) {
  state.draft = body;
  if (state.selectedEssay) (state.revisionDrafts ??= {})[state.selectedEssay] = body;
  else if (state.selectedTopic) state.drafts[state.selectedTopic] = body;
}
export function selectTopic(state: State, id: string | null) {
  state.selectedTopic = id;
  state.selectedEssay = null;
  state.draft = id ? state.drafts[id] ?? '' : '';
}
export function openEssay(state: State, id: string) {
  const essay = state.essays.find(e => e.id === id);
  if (!essay) throw Error('Không tìm thấy bài viết.');
  state.selectedEssay = id;
  state.selectedTopic = essay.topicId;
  state.draft = state.revisionDrafts?.[id] ?? essay.versions.at(-1)!.body;
  state.uiPage = 'practice';
}
export function currentTopic(state: State): Topic | undefined {
  const essay = state.essays.find(e => e.id === state.selectedEssay);
  const topic = state.topics.find(t => t.id === state.selectedTopic);
  return essay ? {
    id: essay.topicId, task: essay.task, type: 'Đề đã lưu', active: true,
    title: essay.titleSnapshot ?? topic?.title ?? 'Đề đã lưu',
    prompt: essay.promptSnapshot, image: essay.imageSnapshot,
  } : topic?.active ? topic : undefined;
}
export function submitEssay(state: State) {
  const topic = currentTopic(state);
  const error = canSubmit(topic, state.draft);
  if (error) throw Error(error);
  let essay = state.essays.find(e => e.id === state.selectedEssay);
  if (essay) appendVersion(essay, state.draft);
  else {
    essay = createEssay(state, topic!.id, state.draft);
    essay.titleSnapshot = topic!.title;
  }
  const version = essay.versions.at(-1)!;
  version.feedback = demoFeedback(essay.task, version.body);
  (state.revisionDrafts ??= {})[essay.id] = state.draft;
  return essay;
}
export function sendQuestion(version: Version, question: string) {
  const text = question.trim();
  if (!text) throw Error('Hãy nhập câu hỏi.');
  if (text.length > 500) throw Error('Câu hỏi tối đa 500 ký tự.');
  if (version.thread.filter(m => m.sender === 'user').length >= 5) throw Error('Đã đạt giới hạn 5 câu hỏi của phiên bản này.');
  const at = new Date().toISOString();
  version.thread.push({ sender: 'user', text, at }, { sender: 'assistant', text: demoReply(text), at });
}
