## Cập nhật Tuần 3 ngày 14/10/2026

Đã bổ sung xác thực bằng MongoDB session và cookie HttpOnly, User, seed ba vai trò và RBAC. Dùng `npm run seed` sau khi cấu hình biến SEED_*; không cần JWT secret cho thiết kế này. HOST cấu hình được cho Render. Xem [xác thực](docs/authentication.md) và [hướng dẫn chạy/deploy](../docs/week3-deployment.md). Phần Giai đoạn 1 bên dưới được giữ làm lịch sử.

# Backend IELTS Writing Coach

Backend Giai đoạn 1 dùng Node.js, TypeScript, Express, Mongoose và MongoDB Atlas. Phiên bản này mới cung cấp nền tảng vận hành, kiểm tra cấu hình và hai endpoint hệ thống. Chưa có đăng nhập JWT, collection nghiệp vụ, API bài viết hoặc kết nối Gemini.

## Yêu cầu

- Node.js 24 trở lên.
- Một cluster MongoDB Atlas và database user chỉ có quyền cần thiết trên database `ielts_writing`.
- IP máy phát triển được cho phép trong Atlas Network Access.

## Cài đặt

```powershell
cd backend
npm install
```

Sao chép `.env.example` thành `.env`, sau đó điền `MONGODB_URI`. Không commit hoặc chia sẻ `.env`. Các secret JWT và Gemini có thể để trống trong Giai đoạn 1.

## Chạy

```powershell
npm run dev
```

Server chỉ bind vào `127.0.0.1` và chỉ bắt đầu lắng nghe sau khi kết nối MongoDB thành công.

## Endpoint hiện có

| Phương thức | Đường dẫn | Mục đích |
|---|---|---|
| GET | `/api/v1/health` | Kiểm tra tiến trình Node.js còn hoạt động; không phụ thuộc database |
| GET | `/api/v1/ready` | Trả 200 khi MongoDB đã kết nối, 503 khi chưa sẵn sàng |

Ví dụ kiểm tra:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health
Invoke-RestMethod http://127.0.0.1:3000/api/v1/ready
```

## Kiểm tra kỹ thuật

```powershell
npm run lint
npm run type-check
npm test
npm run build
```

Test dùng probe database giả lập, không kết nối Atlas production và không đọc secret thật.

## Cấu trúc

- `src/config/`: đọc và xác thực biến môi trường.
- `src/database/`: kết nối Mongoose và trạng thái readiness.
- `src/middleware/`: request ID, logging tối thiểu, validation và error envelope.
- `src/routes/`: endpoint hệ thống.
- `src/contracts/`: hợp đồng dành cho các adapter tương lai, chưa gọi Gemini.
- `tests/`: test HTTP và validation không phụ thuộc Atlas.
- `docs/`: kiến trúc, mô hình dữ liệu dự kiến và hợp đồng API.

## Giới hạn hiện tại

- Chưa có collection hoặc migration/seed.
- Chưa có JWT, refresh token hay phân quyền server.
- Chưa có API đề, nháp, bài viết, phiên bản, giáo viên hoặc quản trị.
- Chưa gọi Gemini và chưa có band score thật.
- Frontend vẫn dùng `localStorage` và phản hồi mô phỏng.

Xem [kiến trúc](docs/architecture.md) và [hợp đồng API](docs/api-contract.md) trước khi triển khai Giai đoạn 2.
