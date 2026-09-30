# Quyết định kỹ thuật tuần 1

Ngày 14/09/2026. Đây là quyết định thiết kế ban đầu, không phải kết quả được GVHD phê duyệt.

1. Giữ IELTS Academic Task 1 và Task 2. Phạm vi thử đầu tiên chỉ là sáu mẫu kỹ thuật; cần bổ sung dạng đề trước khi kết luận rộng hơn.
2. Dự kiến dùng React, Node.js/Express, MongoDB để hạn chế số công nghệ. Python chỉ dùng cho bộ thử tuần 1. Chưa cài ứng dụng web hoặc cơ sở dữ liệu.
3. Gọi LLM có sẵn; adapter Gemini được chuẩn bị trước vì có giao diện văn bản, ảnh và đầu ra có cấu trúc trong tài liệu. Chưa chọn model tối ưu hoặc so sánh hiệu quả với nhà cung cấp khác.
4. Tạo prompt/schema v0.2 đồng nhất giữa hai task, giữ bản gốc nguyên vẹn. Việc giảm hoặc tăng danh mục chỉ báo về sau phải lưu phiên bản để không trộn thống kê.
5. Stage 2 không lưu bản sao điểm; chỉ gắn evaluation_id và version_id. Điều này giảm khả năng tạo điểm thứ hai mâu thuẫn trong một lượt đánh giá.
6. 24/72 chỉ báo là thiết kế của dự án. Cần giáo viên xem tính hữu ích, mô hình thật kiểm tra mức tiêu hao và độ đúng. Không xem đây là tiêu chí chính thức.
7. Thiếu ảnh Task 1 hoặc không đọc rõ thì chưa trả bộ điểm đầy đủ. Điểm tham khảo chỉ hiển thị khi đã kiểm tra cấu trúc và trạng thái.
8. Cố định phiên bản khi nộp; dữ liệu bài, đề, ảnh và prompt/model đều tham gia khóa cache. Hội thoại chọn đúng phiên bản.
9. Chưa đưa số đo AI vào báo cáo vì chưa có lượt gọi thật. Không nâng trạng thái tuần 1 thành hoàn tất khi chưa xác nhận người chấm và phương pháp rubric.

## Các phụ thuộc

| Phụ thuộc | Trạng thái | Việc cần làm |
|---|---|---|
| GVHD thống nhất phạm vi | Chưa ghi nhận | Người dùng trình tài liệu W01_01 |
| Người chấm tham chiếu | Chưa xác nhận | Dùng phiếu và nội dung đề nghị trong W01_03 |
| Nội dung rubric đầy đủ | Mẫu trống, chờ kiểm tra | Bổ sung nguồn hợp lệ, người kiểm tra và phiên bản |
| API key và model | Chưa cấu hình | Cấu hình bằng biến môi trường ở máy chạy |
| Live adapter | Chưa kiểm chứng trực tiếp | Chạy một bài trước khi mở rộng sáu bài |
| Remote Git | Chưa tạo | Dùng bundle cục bộ, kết nối remote khi có repository đích |
