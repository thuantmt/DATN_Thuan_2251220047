# Hướng dẫn Codex cho đồ án IELTS Writing

## Bối cảnh và mục tiêu

Đây là đồ án cá nhân xây dựng website luyện IELTS Academic Writing Task 1 và Task 2, thực hiện từ 14/09/2026 đến 06/12/2026. Ba vai trò dự kiến là người học, giáo viên và quản trị viên. Trọng tâm là viết bài, nhận phản hồi theo tiêu chí IELTS Writing, hỏi đáp nhiều lượt về lỗi và sửa bài để đánh giá lại.

## Phạm vi đang được phép làm

- Hiện chỉ phát triển **frontend**. Chưa xây backend, cơ sở dữ liệu, đăng nhập và phân quyền server, hay kết nối API của mô hình AI.
- Công nghệ frontend đích: **React, TypeScript, Vite và CSS**. Giao diện hiện có trong `frontend/` dùng HTML, CSS và JavaScript module, là bản demo để tham chiếu thiết kế và luồng chức năng. Khi được yêu cầu triển khai frontend đích, chuyển đổi từng màn hình sang React và TypeScript; không xóa bản demo hay thay đổi toàn bộ kiến trúc trong một lần.
- `frontend/store.mjs` hiện lưu dữ liệu bằng `localStorage`. `frontend/mock-ai.mjs` chỉ mô phỏng khu vực phản hồi và hội thoại; không tính band score và không xác nhận lỗi thực tế. Không mô tả các kết quả này là AI thật.
- Không tạo backend, bảng dữ liệu, endpoint giả dưới danh nghĩa API thật, hoặc tự gọi dịch vụ AI khi chưa có yêu cầu mới. Không đưa khóa API vào mã frontend.

## Yêu cầu sản phẩm

- Người học: chọn đề Task 1 có ảnh hoặc Task 2, viết và lưu nháp, nộp bài, xem phản hồi, mở lịch sử, sửa để tạo phiên bản mới và trao đổi trong thread gắn với đúng bài viết cùng phiên bản.
- Khi có AI thật về sau, Task 1 dùng Task Achievement và Task 2 dùng Task Response; cả hai dùng Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Band score chỉ là **ước lượng để luyện tập**, cần kiểm chứng với điểm giáo viên tham chiếu trước khi báo cáo độ tin cậy.
- Real-time trong phạm vi đề tài nghĩa là trả phản hồi sau khi người học **nộp bài hoặc gửi câu hỏi** trong cùng phiên tương tác; không chấm theo từng phím gõ. Frontend demo hiện chưa bảo đảm độ trễ hoặc streaming.
- Giáo viên: quản lý đề ở mức cơ bản, xem bài và bổ sung nhận xét hoặc điểm tham chiếu riêng với kết quả AI. Quản trị viên: quản lý dữ liệu người dùng, đề và thống kê cơ bản. Quyền truy cập thật phải được backend kiểm tra ở giai đoạn sau.
- Giữ snapshot đề và ảnh đi kèm bài đã nộp; giữ kết quả, hội thoại và nhận xét của từng phiên bản, không ghi đè bản cũ. Task 1 thiếu ảnh cần thông báo giới hạn, không giả chấm đầy đủ.

## Thiết kế và ngôn ngữ

- Phương án giao diện A: phong cách học thuật xanh, trắng và xám nhạt; điều hướng ngang; khu vực viết cạnh phản hồi trên desktop và xếp dọc trên điện thoại. Ưu tiên khả năng đọc, điều hướng bàn phím, nhãn biểu mẫu và trạng thái lỗi rõ ràng.
- Ngôn ngữ giao diện mặc định là **tiếng Việt**. Đề IELTS và bài viết dùng **tiếng Anh**. Chưa cần xây tính năng chuyển ngôn ngữ Việt–Anh nếu chưa được yêu cầu.

## Tài liệu và mã hiện có

- Đọc `README.md`, `frontend/README.md`, `docs/requirements.json`, `docs/decisions.md` và `docs/reporting-convention.md` trước khi thay đổi.
- Bộ sáu đề mẫu và ba ảnh Task 1 nằm trong `data/`. Prompt và JSON schema phục vụ tích hợp AI sau này nằm ở `prompts/` và `schemas/`. Không xóa hoặc tự thay câu hỏi mẫu bằng câu không khớp ảnh.
- Nếu chuyển sang React và TypeScript, đặt ứng dụng mới trong `frontend/` theo cấu trúc rõ ràng, giữ các luồng đang có, dùng dữ liệu mô phỏng có nhãn và chuẩn bị lớp gọi API thay thế sau này. Trình bày tác động của việc chuyển đổi trước khi sửa nhiều tệp.

## Cách làm việc và nghiệm thu

1. Đầu mỗi tác vụ, đọc hiện trạng rồi nêu ngắn gọn phạm vi sẽ làm. Thực hiện theo một luồng hoặc màn hình có thể chạy và kiểm tra được; không tuyên bố toàn bộ website hoàn chỉnh khi mới có frontend.
2. Trước khi sửa lớn, bảo toàn thay đổi hiện có. Sau mỗi phần, kiểm tra cú pháp, chạy `node --test frontend/tests.mjs` cho demo cũ; với ứng dụng React–TypeScript mới, chạy thêm lệnh build, type-check và test đã cấu hình. Báo rõ lệnh nào đã chạy và phần nào chưa được thử trực quan.
3. Không tự khẳng định độ chính xác AI, band score, thống kê lỗi lặp, phân quyền hay kết nối backend khi chưa có dữ liệu và kiểm thử thật.
