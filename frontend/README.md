## Cập nhật Tuần 3 ngày 14/10/2026

React tại `react/` có luồng tài khoản thật qua backend. Demo HTML này và React `/demo` tiếp tục dùng dữ liệu mô phỏng độc lập. Xem [hướng dẫn](../docs/week3-deployment.md).

# IELTS Writing Coach frontend demo

## Ứng dụng React mới

Các màn hình đã được chuyển sang React + TypeScript + Vite trong [`react/`](react/README.md), giữ nguyên demo bên dưới. Từ gốc dự án chạy `cd frontend/react`, `npm ci`, `npm run dev`. Xem hướng dẫn trong `react/README.md` để dùng dữ liệu cũ cùng origin, build và kiểm thử. Ứng dụng mới vẫn chỉ dùng localStorage và phản hồi mô phỏng.

Giao diện tĩnh không cần cài gói. Từ thư mục gốc `week01/project` chạy `python3 -m http.server 8080`, sau đó mở `http://localhost:8080/frontend/`.

Dữ liệu lưu trong `localStorage`. Chuyển vai trò chỉ để xem giao diện, **không phải** xác thực hay phân quyền backend. Điểm, phân tích và trả lời hội thoại là **mô phỏng**, không gọi AI thật; không dùng để đánh giá độ chính xác. Bài mẫu Task 1 sử dụng ảnh trong `../data/images/`. Chạy kiểm thử logic: `node --test frontend/tests.mjs`.

Các màn hình gồm luyện viết Task 1/2, nháp và phiên bản, kết quả mô phỏng, hội thoại gắn phiên bản, lịch sử và tiến độ, giáo viên quản lý đề và nhận xét, quản trị quản lý tài khoản và thống kê. Khi tích hợp backend cần thay `store.mjs` và `mock-ai.mjs` bằng API, xác thực thật và kiểm tra quyền server.
