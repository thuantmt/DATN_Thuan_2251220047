# Hợp đồng API dự kiến

Base path: `/api/v1`. Ngày cập nhật: 23/09/2026.

## Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ.",
    "details": [],
    "requestId": "server-generated-id"
  }
}
```

Client không được cung cấp `role`, owner ID đáng tin cậy, `versionNumber`, trạng thái đánh giá, band score hoặc metadata provider/model.

## Trạng thái triển khai

| Nhóm | Endpoint | Trạng thái |
|---|---|---|
| Hệ thống | `GET /health`, `GET /ready` | Đã triển khai trong Giai đoạn 1 |
| Xác thực | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all`; `GET /auth/me` | Thiết kế, chờ Giai đoạn 2 |
| Đề | `GET /topics`, `GET /topics/:topicId`, các thao tác teacher/admin | Chờ Giai đoạn 3 |
| Nháp | `GET /drafts`, `GET/PUT/DELETE /drafts/:topicId` | Chờ Giai đoạn 3 |
| Bài viết | `POST/GET /essays`, `GET /essays/:essayId` | Chờ Giai đoạn 4 |
| Phiên bản | `POST/GET /essays/:essayId/versions`, `GET .../:versionId` | Chờ Giai đoạn 4 |
| Đánh giá | `POST/GET .../evaluations`, `GET /evaluations/:evaluationId` | Chờ Giai đoạn 5 |
| Hội thoại | `GET .../thread`, `POST .../messages` | Chờ Giai đoạn 6 |
| Giáo viên | `GET /teacher/essays`, `POST/PATCH teacher reviews` | Chờ Giai đoạn 6 |
| Quản trị | users, topic status và statistics | Chờ Giai đoạn 6 |

Các endpoint chưa triển khai trả 404, không trả dữ liệu giả.

## Quy ước chung cho giai đoạn sau

- Danh sách dùng `page`, `limit` có giới hạn và trả metadata phân trang.
- ID lấy từ URL phải được validation trước khi query.
- Thời gian dùng UTC ISO 8601.
- `POST` tạo tài nguyên trả 201; cập nhật trả 200; xóa không có body trả 204.
- 401 cho thiếu/sai xác thực, 403 cho không đủ quyền, 404 không tiết lộ tài nguyên người khác, 409 cho xung đột/idempotency, 422 cho validation và 429 cho rate limit.
- Ownership lấy từ access token đã kiểm tra, không lấy từ request body.

## Hợp đồng phiên bản bài

- Tạo bài lần đầu sinh `essay` và `essay_version` số 1.
- Nộp lại sinh version kế tiếp ở server; client không chọn số version.
- Version lưu body, word count, topic snapshot và `evaluationStatus`.
- Version cũ, evaluation, thread và teacher review không bị ghi đè.
- Task 1 thiếu ảnh hợp lệ không được chuyển sang đánh giá đầy đủ.

## Hợp đồng đánh giá

- Request phải có idempotency key do server kiểm soát theo essay/version/prompt/model.
- Trạng thái: `not_requested`, `pending`, `processing`, `completed`, `limited`, `failed`.
- Task 1 dùng TA; Task 2 dùng TR; cả hai có CC, LR và GRA.
- Stage 2 tham chiếu `evaluationId` và `versionId`, không tạo bộ điểm khác.
- Kết quả Gemini chỉ là ước lượng luyện tập và phải lưu provider, model, prompt/schema version cùng hạn chế.
