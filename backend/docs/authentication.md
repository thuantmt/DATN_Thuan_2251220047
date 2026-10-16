# Xác thực và phân quyền Tuần 3

Cập nhật 14/10/2026. Tái sử dụng Express 5, TypeScript, Mongoose, Zod và hợp đồng `/api/v1`.

## Thiết kế

Chọn opaque session thay JWT để thu hồi ngay khi logout và duy trì phiên bằng MongoDB. Cookie chứa 32 byte ngẫu nhiên (hex), database chỉ lưu SHA-256 của token. Cookie HttpOnly, host-only, Path=/; production dùng Secure và tên `__Host-ielts_session`. Session có thời hạn tuyệt đối mặc định 7 ngày, không gia hạn ngầm. Mongo TTL dọn dữ liệu; middleware vẫn kiểm tra expiresAt, không phụ thuộc thời điểm TTL chạy.

Mỗi request bảo vệ lấy User hiện tại từ database để kiểm tra role/status. Logout xóa đúng session hiện tại, không xóa mọi phiên trên thiết bị khác. Frontend chỉ giữ thông tin hiển thị trong bộ nhớ và khôi phục qua `/auth/me`; không lưu token trong localStorage. Việc tạo lại Express app với session còn trong MongoDB được kiểm thử; restart môi trường triển khai thật vẫn cần smoke test riêng.

Password dùng Node crypto scrypt với salt 16 byte ngẫu nhiên, N=32768, r=8, p=3, key 64 byte; kiểm tra timingSafeEqual. Không tự thay thuật toán hoặc tham số mà không có phương án nâng cấp các hash đã lưu. Độ dài mật khẩu 10–128 ký tự.

Mọi mutation yêu cầu Origin đúng FRONTEND_ORIGIN và custom header `X-CSRF-Protection: 1`. Header bắt buộc kết hợp allowlist CORS chính xác, không phải CSRF token bí mật; bảo vệ dựa trên hạn chế trình duyệt gửi custom header cross-origin và kiểm tra Origin server. SameSite bổ sung phòng vệ. Client HTTP ngoài trình duyệt cũng phải gửi hai header này. XSS cùng origin vẫn là rủi ro; chưa có bảo đảm an toàn production toàn diện.

Đăng ký/login dùng chung rate limit 20 request/15 phút/IP, lưu trong bộ nhớ process. Khi scale nhiều instance cần shared store; restart process reset hạn mức. Proxy trust phải phù hợp hạ tầng. Không có đăng ký teacher/admin công khai.

## API

| Method | Endpoint | Quyền và phản hồi |
|---|---|---|
| POST | /api/v1/auth/register | Công khai, body fullName/email/password, 201, learner |
| POST | /api/v1/auth/login | Công khai, body email/password, 200 và cookie |
| GET | /api/v1/auth/me | Có phiên hợp lệ, 200 user |
| POST | /api/v1/auth/logout | Thu hồi cookie session, 200, idempotent |
| GET | /api/v1/learner/dashboard | Chỉ learner |
| GET | /api/v1/teacher/dashboard | Chỉ teacher |
| GET | /api/v1/admin/dashboard | Chỉ admin |

Success auth/dashboard: `{data: ...}`. Error giữ envelope `{error: {code, message, details, requestId}}`. Validation Zod giữ mã 422 của nền backend; trùng email 409; phiên sai/hết hạn 401; sai quyền/blocked/CSRF 403; quá hạn mức 429; database chưa sẵn sàng 503. Admin không mặc định kế thừa dashboard learner/teacher. Không có quyền đọc bài riêng tư trong sprint này.

## Tài liệu tham chiếu

- [Node crypto scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF custom request headers](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#employing-custom-request-headers-for-ajaxapi)
