# Chuyển frontend sang React

Ngày cập nhật 15/09/2026. Phạm vi là chuyển giao diện và kiểm thử frontend; chưa đóng nghiệm thu trực quan hoặc nghiệm thu tuần của đồ án.

## Hiện trạng và quyết định

Đã đọc AGENTS.md, README.md, frontend/README.md, requirements.json, decisions.md và reporting-convention.md. Thư mục không có Git tại thời điểm thực hiện; không tạo commit hoặc tự khôi phục dữ liệu. Các tệp demo hiện có được giữ nguyên, ứng dụng mới đặt tại frontend/react/.

React dùng lại store.mjs và mock-ai.mjs qua khai báo kiểu, giúp tránh viết lại toàn bộ logic và làm thay đổi dữ liệu trong một lần. Lớp services.ts bao bọc localStorage và thao tác nghiệp vụ để chuẩn bị thay thế sau này. Không tạo endpoint, backend hay gọi AI.

## Các màn hình đã chuyển

| Màn hình | Hành vi |
| --- | --- |
| Luyện viết | Task 1/2, đề mẫu đúng ảnh, nháp, nộp, phản hồi mô phỏng, thread theo phiên bản |
| Lịch sử | Mở bài, dùng snapshot đề/ảnh, xem nội dung từng bản, sửa tạo bản mới |
| Tiến độ | Số bài riêng hai task, số lần sửa; không có xu hướng điểm hoặc lỗi giả |
| Giáo viên | Thêm/ẩn đề, xem đầy đủ bài và chọn phiên bản để nhận xét, điểm tham chiếu riêng |
| Quản trị | Thêm/bật/tắt người dùng demo, quản lý đề và thống kê cục bộ |

## Bảo toàn dữ liệu

Giữ khóa localStorage cũ, sao lưu payload trước lần ghi đầu tiên. Thêm revisionDrafts để nháp sửa bài không làm mất nháp theo đề. Phiên bản mới giữ nguyên phản hồi, hội thoại và nhận xét phiên bản cũ. Bài mới lưu thêm tên đề; các bài cũ không thể khôi phục tên đề lịch sử nếu tên từng bị sửa.

Dữ liệu lỗi không bị tự thay bằng dữ liệu mới. Khi hết dung lượng hoặc tab khác thay đổi dữ liệu, hiển thị lỗi và giữ nội dung trong phiên. Người dùng phải sao chép nội dung chưa lưu trước khi tải lại. Dùng cùng origin để đọc dữ liệu demo; xem frontend/react/README.md.

## Bằng chứng kiểm tra

Tóm tắt đầu ra thực tế: [results/frontend-react-checks.txt](../results/frontend-react-checks.txt).

- Trước chuyển đổi: node --test frontend/tests.mjs đạt 7/7.
- Sau chuyển đổi: kiểm tra cú pháp app.mjs, store.mjs, mock-ai.mjs và 7/7 test demo đạt.
- npm run build tạo bản tĩnh và đóng gói đủ ba ảnh Task 1.
- npm run type-check đạt.
- npm test đạt 11/11 ca: nháp, khôi phục dữ liệu, snapshot, phiên bản, thread, giới hạn câu hỏi, giáo viên, quản trị và lỗi lưu trữ.
- Môi trường: Node.js 24.14.1, npm 11.11.0. Phiên bản gói thực tế được khóa trong frontend/react/package-lock.json.
- Cài npm và chạy Vite cần quyền ngoài sandbox do giới hạn mạng/tạo thư mục tạm; không phải lỗi ứng dụng.

## Giới hạn và việc tiếp theo

Công cụ trình duyệt báo không có trình duyệt khả dụng. Kiểm thử tương tác dùng jsdom, chưa xác nhận ảnh tải trên trình duyệt thật, bố cục desktop/mobile hoặc trải nghiệm bàn phím. Danh sách nghiệm thu thủ công nằm trong README ứng dụng.

Chưa có đăng nhập, phân quyền server, dữ liệu dùng chung nhiều người hoặc AI thật. Không thể đánh giá độ chính xác band score. Không đổi trạng thái yêu cầu toàn hệ thống thành hoàn thành. Sau khi kiểm tra trực quan và chốt một quy trình tuần thực sự hoàn thành, lập báo cáo Word theo reporting-convention.md; không ghi hoạt động dự kiến như đã làm.
