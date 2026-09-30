import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { initialState } from '../../store.mjs';
import type { State } from './types';
import { submitEssay, writeDraft } from './services';

const body = 'Public transport is useful because it allows many people to travel together and helps cities reduce traffic congestion during busy working hours.';
function setup(seed = initialState()) {
  let saved: State = structuredClone(seed);
  const repository = { load: () => structuredClone(saved), save: (s: State) => { saved = structuredClone(s); } };
  const view = render(<App repository={repository} />);
  return { ...view, saved: () => saved, repository };
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
describe('React screens', () => {
  it('completes writing, chat, history, revisions and old-version viewing', () => {
    const app = setup();
    fireEvent.change(screen.getByLabelText('Nội dung bài viết tiếng Anh'), { target: { value: body } });
    click('Nộp bài ↗');
    expect(screen.getByText('Band score: chưa có')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Câu hỏi về phiên bản 1'), { target: { value: 'Explain overview' } });
    click('Gửi câu hỏi');
    expect(screen.getByRole('log')).toHaveTextContent('Explain overview');
    click('Bài viết'); click('Mở và sửa bài ↗');
    fireEvent.change(screen.getByLabelText('Nội dung bài viết tiếng Anh'), { target: { value: `${body} Revised.` } });
    click('Nộp bài ↗');
    expect(screen.getByRole('log')).not.toHaveTextContent('Explain overview');
    fireEvent.change(screen.getByLabelText('Chọn phiên bản'), { target: { value: '1' } });
    expect(screen.getByRole('log')).toHaveTextContent('Explain overview');
    expect(screen.getByText(body, { selector: '.submitted-body p' })).toBeInTheDocument();
    expect(app.saved().essays[0].versions).toHaveLength(2);
    click('Tiến độ');
    expect(screen.getByText('Lần sửa và nộp lại').parentElement).toHaveTextContent('1');
  });
  it('restores a draft on remount and renders sample Task 1 images', () => {
    const app = setup();
    fireEvent.change(screen.getByLabelText('Nội dung bài viết tiếng Anh'), { target: { value: body } });
    app.unmount(); render(<App repository={app.repository} />);
    expect(screen.getByLabelText('Nội dung bài viết tiếng Anh')).toHaveValue(body);
    click(/Task 1 Mô tả dữ liệu/);
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('T1-BAR-01.png'));
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được ảnh');
  });
  it('reviews the chosen version without replacing feedback or another review', () => {
    const seed = initialState(); writeDraft(seed, body); submitEssay(seed); submitEssay(seed);
    const app = setup(seed);
    fireEvent.change(screen.getByLabelText('Xem vai trò'), { target: { value: 'teacher' } });
    fireEvent.change(screen.getByLabelText('Phiên bản nhận xét'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Điểm giáo viên tham chiếu/), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Nhận xét bổ sung'), { target: { value: 'Reference only' } });
    click('Lưu nhận xét ↗');
    expect(app.saved().essays[0].versions[0].teacherReview?.score).toBe('0');
    expect(app.saved().essays[0].versions[1].teacherReview).toBeNull();
    expect(app.saved().essays[0].versions[0].feedback).toEqual(seed.essays[0].versions[0].feedback);
  });
  it('creates and toggles demo users and topics', () => {
    const app = setup();
    fireEvent.change(screen.getByLabelText('Xem vai trò'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'Test learner' } });
    click('Thêm người dùng ↗'); click('Vô hiệu Test learner');
    expect(app.saved().users.at(-1)?.active).toBe(false);
    fireEvent.change(screen.getByLabelText('Tên đề'), { target: { value: 'New topic' } });
    fireEvent.change(screen.getByLabelText('Nội dung đề tiếng Anh'), { target: { value: 'Discuss education.' } });
    click('Thêm đề ↗'); click('Ẩn đề New topic');
    expect(app.saved().topics.at(-1)?.active).toBe(false);
    expect(within(screen.getByRole('main')).getByText('New topic')).toBeInTheDocument();
  });
  it('retains editor content and does not claim success when saving fails', () => {
    render(<App repository={{ load: initialState, save: () => { throw Error('Quota exceeded'); } }} />);
    fireEvent.change(screen.getByLabelText('Nội dung bài viết tiếng Anh'), { target: { value: body } });
    click('Lưu nháp');
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa lưu được');
    expect(screen.getByLabelText('Nội dung bài viết tiếng Anh')).toHaveValue(body);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('switches the IELTS timer by task and exposes start, pause and reset controls', () => {
    setup();
    expect(screen.getByText('40:00')).toBeInTheDocument();
    click(/Task 1 Mô tả dữ liệu/);
    expect(screen.getByText('20:00')).toBeInTheDocument();
    click('Bắt đầu đồng hồ');
    expect(screen.getByRole('button', { name: 'Tạm dừng đồng hồ' })).toBeInTheDocument();
    click('Đặt lại đồng hồ');
    expect(screen.getByRole('button', { name: 'Bắt đầu đồng hồ' })).toBeInTheDocument();
    expect(screen.getByText('20:00')).toBeInTheDocument();
  });
});
