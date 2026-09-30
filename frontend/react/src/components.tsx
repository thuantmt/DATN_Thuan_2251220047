import { useState, type ReactNode } from 'react';
import type { Topic } from './types';

const images = import.meta.glob('../../../data/images/*.png', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;
export function imageUrl(path: string) {
  // Only remap the original fixture paths; retain the snapshot value in storage.
  if (/^\.\.\/data\/images\/[^/]+\.png$/.test(path)) {
    return images[`../../../data/images/${path.split('/').at(-1)}`] ?? path;
  }
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(path)) return path;
  return '';
}
export function Intro({ title, children }: { title: string; children: ReactNode }) {
  return <div className="page-intro"><div><div className="eyebrow">KHÔNG GIAN LUYỆN VIẾT</div><h1>{title}</h1><p>{children}</p></div></div>;
}
export function Panel({ title, kicker, children, className = '' }: { title: string; kicker?: string; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-header"><div>{kicker && <span className="section-kicker">{kicker}</span>}<h2>{title}</h2></div></div>{children}</section>;
}
export function TopicImage({ topic }: { topic: Topic }) {
  const [failed, setFailed] = useState(false);
  if (topic.task !== 1) return null;
  const src = imageUrl(topic.image);
  if (!src || failed) return <p className="warn" role="alert">{!src ? 'Task 1 thiếu ảnh đề hợp lệ.' : 'Không tải được ảnh đề Task 1.'} Không thể đánh giá đầy đủ dữ liệu; phản hồi chỉ là mô phỏng.</p>;
  return <figure className="figure-wrap"><figcaption className="figure-caption">Hình minh hoạ Task 1 · {topic.title}</figcaption><img src={src} alt={`Hình minh hoạ Task 1 cho đề ${topic.title}`} onError={() => setFailed(true)} /></figure>;
}
export function Stats({ items }: { items: [string, number][] }) {
  return <div className="stats-grid">{items.map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>Dữ liệu trên trình duyệt này</small></div>)}</div>;
}
