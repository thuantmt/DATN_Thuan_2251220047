export type Role = 'student' | 'teacher' | 'admin';
export type Page = 'practice' | 'history' | 'progress' | 'teacher' | 'admin';
export interface Topic {
  id: string; task: 1 | 2; type: string; title: string;
  prompt: string; image: string; active: boolean;
}
export interface Feedback {
  mode: 'simulation'; overview: string; createdAt: string;
  criteria: { code: string; label: string; value: string; note: string }[];
  issues: { criterion: string; quote: string; explanation: string; suggestion: string }[];
}
export interface Version {
  number: number; body: string; createdAt: string; feedback: Feedback | null;
  thread: { sender: 'user' | 'assistant'; text: string; at?: string }[];
  teacherReview: { score: string | null; note: string; at: string } | null;
}
export interface Essay {
  id: string; topicId: string; task: 1 | 2; promptSnapshot: string;
  imageSnapshot: string; titleSnapshot?: string; createdAt: string; versions: Version[];
}
export interface State {
  topics: Topic[];
  users: { id: string; name: string; role: Role; active: boolean }[];
  essays: Essay[]; selectedTopic: string | null; selectedEssay: string | null;
  draft: string; drafts: Record<string, string>; role: Role; uiPage: Page;
  revisionDrafts?: Record<string, string>;
}
