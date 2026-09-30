# Kiến trúc backend

Ngày cập nhật: 23/09/2026.

## Phạm vi Giai đoạn 1

Backend hiện chịu trách nhiệm khởi động an toàn, đọc cấu hình, kết nối MongoDB Atlas, gắn request ID, ghi log tối thiểu và cung cấp liveness/readiness. Chưa có endpoint nghiệp vụ, xác thực hoặc AI.

Luồng khởi động:

1. `server.ts` đọc `.env` và kiểm tra bằng Zod.
2. Mongoose kết nối Atlas với `dbName` tách khỏi URI.
3. Chỉ khi kết nối thành công, Express mới bind `127.0.0.1:PORT`.
4. `health` kiểm tra tiến trình; `ready` kiểm tra trạng thái Mongoose.
5. SIGINT/SIGTERM đóng HTTP server rồi ngắt database.

Luồng HTTP:

1. Tạo request ID mới ở server và trả qua `x-request-id`.
2. Ghi log method, path, status và thời gian; không ghi body, cookie hoặc authorization header.
3. Helmet, CORS theo một `FRONTEND_ORIGIN` và JSON limit 1 MB.
4. Route handler.
5. 404 và lỗi dùng chung một error envelope, không trả stack trace.

## Quyết định Atlas

- URI chỉ tồn tại trong `.env` hoặc secret store khi triển khai.
- `serverSelectionTimeoutMS` là 5 giây để lỗi cấu hình không treo vô hạn.
- `bufferCommands` tắt để không giữ request chờ database không sẵn sàng.
- Mongoose tự tạo index trong development/test; production tắt `autoIndex`. Các index nghiệp vụ sẽ được tạo có kiểm soát ở giai đoạn có model.
- Test Giai đoạn 1 dùng `DatabaseProbe`, không chạm Atlas. Khi có model sẽ dùng database test riêng hoặc MongoDB Memory Server, không dùng production.

## Collection dự kiến

Giai đoạn 1 chưa tạo collection. Thiết kế cho các giai đoạn sau:

| Collection | Trách nhiệm | Ràng buộc/index chính dự kiến |
|---|---|---|
| `users` | Danh tính, role, trạng thái, password hash | email chuẩn hóa unique; không trả hash qua API |
| `refresh_sessions` | Hash refresh token, rotation và thu hồi | userId + token family; TTL theo hạn token |
| `topics` | Đề Task 1/2 và ảnh được tin cậy | code unique; task + active |
| `drafts` | Nháp có thể cập nhật của người học | studentId + topicId/revisionOfEssayId unique theo ngữ cảnh |
| `essays` | Bài logic thuộc người học | studentId + createdAt |
| `essay_versions` | Bản nộp bất biến và topic snapshot | essayId + versionNumber unique |
| `evaluations` | Kết quả ước lượng luyện tập | versionId + idempotencyKey unique |
| `conversation_threads` | Thread theo đúng version/evaluation | versionId + evaluationId |
| `messages` | Tin nhắn theo thread | threadId + createdAt |
| `teacher_reviews` | Điểm tham chiếu và nhận xét giáo viên | versionId + teacherId; tách khỏi evaluation |

`essay_versions.topicSnapshot` phải giữ `topicId`, `title`, `prompt`, `task`, `type`, tham chiếu ảnh và thời điểm snapshot. Bản nộp không được cập nhật nội dung; sửa bài tạo version mới.

## Xác thực dự kiến

Giai đoạn 2 sẽ dùng access token ngắn hạn và refresh token HttpOnly cookie. Refresh token được hash trong `refresh_sessions`, rotate mỗi lần dùng, hỗ trợ logout/logout-all và phát hiện token cũ bị tái sử dụng. Middleware phải kiểm tra role lẫn ownership; frontend không phải nguồn quyền đáng tin cậy.

## Gemini dự kiến

Giai đoạn 5 sẽ hiện thực `EvaluationProvider` bằng `GeminiEvaluationProvider`. Controller không gọi SDK trực tiếp. Adapter phải dùng prompt/schema đang có, gửi đúng ảnh snapshot cho Task 1, trả `limited` khi thiếu ảnh, kiểm tra JSON Schema trước khi lưu và không fallback sang dữ liệu mô phỏng dưới nhãn AI thật.

## Ranh giới frontend

Frontend hiện vẫn dùng localStorage. Việc chuyển sang HTTP sẽ dùng adapter mới theo từng luồng và giữ local repository làm fallback tạm thời; Giai đoạn 1 không sửa frontend.
