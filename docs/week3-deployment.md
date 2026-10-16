# Chạy và triển khai nền tảng xác thực

Ngày cập nhật thực tế: 14/10/2026. API dùng base `/api/v1` để giữ hợp đồng backend hiện có.

## Chạy trong VS Code

Terminal thứ nhất: `cd backend`, `npm ci`. Sao chép `.env.example` sang `.env` nếu chưa có; không ghi đè cấu hình đang dùng. Điền `MONGODB_URI`, `MONGODB_DB_NAME=ielts_writing`, `FRONTEND_ORIGIN=http://127.0.0.1:5173`. Chạy `npm run dev`. Server chỉ mở cổng sau khi MongoDB kết nối và các index User/Session được tạo thành công.

Terminal thứ hai: `cd frontend/react`, `npm ci`, `npm run dev`. Mở `http://127.0.0.1:5173/login`. Vite proxy `/api` tới backend port 3000; dùng cùng hostname 127.0.0.1, không trộn localhost. Nếu dùng port khác, sửa proxy tương ứng. `VITE_API_BASE_URL` mặc định là `/api/v1`.

Demo React độc lập ở `/demo`. Demo HTML gốc: chạy `py -m http.server 8080` tại gốc, mở `http://127.0.0.1:8080/frontend/`. Dữ liệu localStorage và chức năng chuyển vai trò trong demo không có quan hệ với tài khoản thật.

## Tạo ba tài khoản kiểm tra

Trong backend `.env` điền sáu biến `SEED_LEARNER_EMAIL`, `SEED_LEARNER_PASSWORD`, `SEED_TEACHER_EMAIL`, `SEED_TEACHER_PASSWORD`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. Email phải khác nhau, mật khẩu từ 10 đến 128 ký tự. Chạy `npm run seed` trong development. Không dùng database production để seed demo. Script không ghi đè tài khoản đã có và báo lỗi nếu vai trò không khớp.

Đăng nhập từng tài khoản, kiểm tra dashboard đúng vai trò. Refresh trang; thử URL dashboard của hai vai trò còn lại và xác nhận 403. Logout rồi refresh dashboard phải về Login. Mật khẩu được lấy từ nơi bạn cấu hình; không được in hoặc lưu trong tài liệu.

## Vercel và Render

- Vercel root directory: `frontend/react`; install `npm ci`; build `npm run build`; output `dist`. `vercel.json` cung cấp SPA fallback. Đặt `VITE_API_BASE_URL=https://api.<ten-mien-cua-ban>/api/v1` và build lại.
- Render: dùng cấu hình `render.yaml` hoặc tạo Node Web Service root `backend`; build `npm ci && npm run build`; start `npm start`; readiness `/api/v1/ready`. Dùng Node.js >=24. Render cấp PORT; HOST production phải `0.0.0.0`.
- Atlas: tạo database user có quyền cần thiết trên database đích, cho phép outbound IP của backend theo cấu hình mạng thực tế; không công khai credentials. Backend cần quyền tạo unique/TTL index trong bước khởi động, hoặc cần điều chỉnh quy trình tạo index nếu tài khoản runtime không có quyền này.
- Backend production: `NODE_ENV=production`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax`, `FRONTEND_ORIGIN=https://app.<ten-mien-cua-ban>` chính xác, không có dấu `/` cuối. `TRUST_PROXY_HOPS=1` chỉ phù hợp topology có một proxy tin cậy; kiểm tra topology trước khi áp dụng. Không expose trực tiếp backend ở topology khiến client giả IP được tin.

Ưu tiên custom domain `app.<domain>` trên Vercel và `api.<domain>` trên Render: khác origin nhưng cùng site khi đều HTTPS. Cookie host-only được gửi tới API; frontend dùng credentials include và backend cho đúng origin. Cách này tránh phụ thuộc cookie bên thứ ba.

Nếu dùng mặc định `*.vercel.app` và `*.onrender.com`, hai địa chỉ là cross-site: cần `COOKIE_SAME_SITE=none` và Secure. Trình duyệt có thể chặn cookie bên thứ ba. Phải thử login/refresh trên trình duyệt đích trước nghiệm thu, hoặc chuyển sang custom domain cùng site/proxy cùng origin. Không coi CORS đã cấu hình là đủ để cookie hoạt động.

Trong sprint này không cần JWT secret: cơ chế thực tế là opaque session. Các biến ACCESS_TOKEN_SECRET/REFRESH_TOKEN_SECRET cũ chưa được dùng. Không cấu hình Gemini để chạy auth.

## Smoke test môi trường thật

1. Health và ready trả 200; ready xác nhận MongoDB kết nối.
2. Đăng ký learner; kiểm tra user tồn tại trong database và passwordHash không phải plaintext.
3. Đăng nhập cả ba vai trò; `/auth/me` trả đúng tài khoản, dashboard đúng quyền.
4. Refresh trang, thử sai vai trò, thử request không có phiên và phiên hết hạn.
5. Logout; phiên cũ không thể gọi `/auth/me` nữa.
6. Khởi động lại backend; user và phiên chưa hết hạn vẫn còn trong MongoDB.
7. Kiểm tra cookie HttpOnly/Secure/SameSite, request Origin và header X-CSRF-Protection, HTTPS và preflight.

Chưa deploy thật trong tác vụ này. Nếu thiếu kết nối Atlas hoặc custom domain, đánh dấu hạng mục tương ứng BLOCKED/chưa nghiệm thu.

## Chẩn đoán Atlas ngày 14/10/2026

DNS hệ thống trả ECONNREFUSED khi truy vấn SRV. Thử resolver chỉ trong process với 1.1.1.1 và 8.8.8.8 phân giải được 3 bản ghi; không đổi DNS hệ điều hành. Khi thử kết nối qua resolver process 1.1.1.1, driver vẫn không chọn được primary và ba node trả lỗi TLS ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR. Chưa xác định nguyên nhân cuối cùng; cần kiểm tra Atlas Network Access/IP allowlist, trạng thái cluster và đường mạng/TLS của máy chạy. Không tắt xác minh TLS để vượt lỗi.

Tham chiếu triển khai: [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Render Web Services](https://render.com/docs/web-services).
