import { describe, expect, it } from 'vitest';
import { initialState, STORAGE_KEY, SAMPLE_TOPICS } from '../../store.mjs';
import { currentTopic, localRepository, openEssay, selectTopic, sendQuestion, submitEssay, writeDraft } from './services';

const body = 'Public transport is useful because it allows many people to travel together and helps cities reduce traffic congestion during busy working hours.';
function storage() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } };
}
describe('local repository and version transitions', () => {
  it('preserves legacy data and backs up the exact payload before writing', () => {
    const memory = storage(), old = initialState();
    old.draft = body; old.drafts['t2-opinion'] = body;
    memory.setItem(STORAGE_KEY, JSON.stringify(old));
    const repo = localRepository(memory), state = repo.load();
    expect(state.draft).toBe(body);
    submitEssay(state); repo.save(state);
    expect(memory.getItem(`${STORAGE_KEY}-before-react`)).toBe(JSON.stringify(old));
    expect(localRepository(memory).load().essays).toHaveLength(1);
  });
  it('does not silently replace corrupt storage', () => {
    const memory = storage(); memory.setItem(STORAGE_KEY, '{bad');
    expect(() => localRepository(memory).load()).toThrow();
    expect(memory.getItem(STORAGE_KEY)).toBe('{bad');
    const malformed = { ...initialState(), drafts: { 't2-opinion': 42 } };
    memory.setItem(STORAGE_KEY, JSON.stringify(malformed));
    expect(() => localRepository(memory).load()).toThrow(/không hợp lệ/);
    expect(memory.getItem(STORAGE_KEY)).toBe(JSON.stringify(malformed));
  });
  it('rejects competing tab writes and propagates quota errors', () => {
    const memory = storage(), a = localRepository(memory), b = localRepository(memory);
    const first = a.load(), second = b.load();
    writeDraft(first, body); a.save(first);
    expect(() => b.save(second)).toThrow(/tab khác/);
    const denied = localRepository({ getItem: () => null, setItem: () => { throw Error('Quota'); } });
    denied.load(); expect(() => denied.save(initialState())).toThrow('Quota');
  });
  it('keeps topic drafts separate from revision drafts across reload', () => {
    const s = initialState();
    writeDraft(s, body); const essay = submitEssay(s);
    writeDraft(s, `${body} Revised draft.`);
    selectTopic(s, 't1-bar'); writeDraft(s, 'Task one draft');
    selectTopic(s, 't2-opinion'); expect(s.draft).toBe(body);
    openEssay(s, essay.id); expect(s.draft).toBe(`${body} Revised draft.`);
    const memory = storage(), repo = localRepository(memory); repo.load(); repo.save(s);
    expect(localRepository(memory).load().draft).toBe(`${body} Revised draft.`);
  });
  it('retains old feedback, conversation, review and prompt/image snapshots on revision', () => {
    const s = initialState(); selectTopic(s, 't1-bar'); writeDraft(s, body);
    const essay = submitEssay(s), version = essay.versions[0];
    sendQuestion(version, 'Explain the overview');
    version.teacherReview = { score: '0', note: 'Teacher reference', at: '2026-09-15' };
    const saved = structuredClone(version), image = essay.imageSnapshot;
    s.topics[0].prompt = 'Changed'; s.topics[0].image = ''; s.topics[0].active = false;
    expect(currentTopic(s)?.prompt).toBe(SAMPLE_TOPICS[0].prompt);
    expect(currentTopic(s)?.image).toBe(image);
    writeDraft(s, `${body} Another sentence.`); submitEssay(s);
    expect(essay.versions).toHaveLength(2);
    expect(essay.versions[0]).toEqual(saved);
    expect(essay.versions[1].thread).toEqual([]);
    expect(essay.versions[1].teacherReview).toBeNull();
    expect(essay.versions[1].feedback?.criteria[0].code).toBe('TA');
  });
  it('limits questions per version and blocks short submissions / missing images', () => {
    const s = initialState(); writeDraft(s, 'too short'); expect(() => submitEssay(s)).toThrow(/20/);
    writeDraft(s, body); const e = submitEssay(s);
    for (let i = 0; i < 5; i++) sendQuestion(e.versions[0], `Question ${i}`);
    expect(() => sendQuestion(e.versions[0], 'Six')).toThrow(/5 câu/);
    submitEssay(s); expect(() => sendQuestion(e.versions[1], 'New version')).not.toThrow();
    expect(e.versions[1].feedback?.criteria[0].code).toBe('TR');
    selectTopic(s, 't1-bar'); s.topics[0].image = ''; writeDraft(s, body);
    expect(() => submitEssay(s)).toThrow(/cần ảnh/);
  });
});
