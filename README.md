## Cập nhật Tuần 3 ngày 14/10/2026

Đã bổ sung User, MongoDB session, API xác thực và RBAC trong backend; React tích hợp đăng ký, đăng nhập, khôi phục phiên và dashboard. Demo Writing giữ riêng tại `/demo`, không gắn dữ liệu localStorage với tài khoản thật. Atlas chưa nghiệm thu do lỗi DNS hệ thống và lỗi TLS khi thử resolver riêng; chưa deploy hoặc tích hợp AI. Xem [hướng dẫn chạy và triển khai](docs/week3-deployment.md) và [thiết kế xác thực](backend/docs/authentication.md). Các phần bên dưới là lịch sử triển khai.

# IELTS Writing Week 1

## Cập nhật backend ngày 23 tháng 09 năm 2026

Đã khởi tạo Giai đoạn 1 của backend trong [`backend/`](backend/README.md) bằng Node.js, TypeScript, Express, Mongoose và Zod. Phạm vi hiện có gồm cấu hình môi trường, lớp kết nối MongoDB Atlas, request ID, logging an toàn, validation, error envelope và hai endpoint `GET /api/v1/health`, `GET /api/v1/ready`. Lint, type-check, 7 test backend và build đã đạt.

Kết nối Atlas thật chưa nghiệm thu vì môi trường chạy trả `ECONNREFUSED`; server cố ý không mở cổng khi database chưa kết nối. Chưa có collection nghiệp vụ, JWT, phân quyền, API bài viết hoặc Gemini. Frontend vẫn dùng localStorage và phản hồi mô phỏng. Xem [`backend/docs/architecture.md`](backend/docs/architecture.md), [`backend/docs/api-contract.md`](backend/docs/api-contract.md) và báo cáo `docs/W02_01_Khoi_tao_backend.docx`.

## Cập nhật frontend ngày 15 tháng 09 năm 2026

Đã chuyển 5 màn hình frontend sang React + TypeScript + Vite trong [`frontend/react/`](frontend/react/README.md), bảo toàn demo HTML/JavaScript. Chạy `cd frontend/react`, `npm ci`, `npm run dev`. Build, type-check và kiểm thử tự động đã đạt; nghiệm thu trực quan desktop/mobile còn chờ. Đây vẫn chỉ là frontend với dữ liệu cục bộ, chưa có backend hoặc AI thật. Phần mô tả nền tảng tuần 1 bên dưới được giữ để tham chiếu lịch sử.

Gói nền tảng tuần 1 cho đồ án 14/09/2026–06/12/2026. Phiên bản prompt/schema: 0.2.0.

Đã thực hiện: phạm vi, yêu cầu nghiệm thu, backlog; rà soát prompt đầu vào; bộ prompt/schema v0.2; 6 đề và bài thử tự tạo với 3 hình Task 1; bộ kiểm tra kỹ thuật; và một frontend demo trong `frontend/` cho người học, giáo viên, quản trị viên. Đây chưa phải website hoàn chỉnh. Frontend đang dùng JavaScript module và dữ liệu mô phỏng; React, TypeScript và Vite là công nghệ frontend đích để chuyển đổi dần. Xác thực, cơ sở dữ liệu, API AI và triển khai sẽ thực hiện sau.

## Khởi chạy frontend demo

Mở thư mục này trong VS Code. Từ Terminal ở gốc dự án, chạy `py -m http.server 8080` trên Windows hoặc `python3 -m http.server 8080` trên macOS/Linux, sau đó mở `http://localhost:8080/frontend/`. Chạy `node --test frontend/tests.mjs` để kiểm tra logic frontend. Bản demo lưu nháp bằng `localStorage` và chỉ mô phỏng phản hồi; chưa có band score AI thật. Xem `frontend/README.md` và `AGENTS.md` trước khi yêu cầu Codex sửa mã.

## Chạy kiểm tra cục bộ

Cần Python 3.11 trở lên. Các lệnh kiểm tra và công cụ thử API chỉ dùng thư viện chuẩn, không cần cài thêm gói.

```bash
python -m unittest discover -s tests -v
python src/run_week1.py --mode offline
python src/run_week1.py --mode preflight
```

`offline` dùng điểm hằng giả lập để kiểm tra hợp đồng dữ liệu. Không dùng chúng làm điểm người học, điểm giáo viên hoặc bằng chứng độ chính xác AI. File kết quả cố ý chỉ báo trạng thái kiểm tra, không xuất điểm giả lập thành kết quả chấm.

`preflight` kiểm tra cấu hình; mã thoát 2 có nghĩa thiếu điều kiện chạy thật, không phải kiểm thử thất bại. Khóa được đọc từ biến môi trường và không ghi ra nhật ký.

## Thử API thật khi đủ điều kiện

1. Cấu hình biến môi trường `GEMINI_API_KEY` và `GEMINI_MODEL` bằng cơ chế bảo mật của máy chạy. Không dán khóa vào chat, không commit khóa và không nhập khóa vào frontend.
2. Tạo bản riêng từ `prompts/rubric-reference.example.json`; nhập nội dung rubric có nguồn/quyền sử dụng phù hợp đã được giáo viên kiểm tra cho cả hai task. Điền phiên bản, người kiểm tra và đặt `status` là `reviewed` chỉ sau khi thực sự được kiểm tra. Một URL không thay thế nội dung rubric.
3. Chạy thử một bài trước để kiểm tra hỗ trợ API và định dạng phản hồi:

```bash
python src/run_week1.py --mode live --sample T1-BAR-01 --rubric /path/to/reviewed-rubric.json
```

4. Khi một bài thành công và đã kiểm tra chi phí, bỏ `--sample` để chạy cả sáu bài. Hai giai đoạn cần tối đa 12 yêu cầu thành công cho sáu bài, chưa tính chạy lại thủ công. Công cụ không tự retry. Model và adapter phải được xác nhận bằng một lượt thật; chưa có bằng chứng này trong gói tuần 1.

Công cụ sử dụng Gemini Interactions API theo tài liệu đã tham khảo ngày 14/09/2026. Nếu nhà cung cấp đổi trường phản hồi hoặc giới hạn schema, xử lý ở adapter rồi chạy kiểm tra lại. Gemini là adapter thử đầu tiên, chưa phải mô hình được chứng minh tốt hơn các lựa chọn khác.

## Cấu trúc

- `prompts/`: Stage 1, Stage 2 cho mỗi task; hội thoại; danh mục chỉ báo; mẫu rubric để người chấm hoàn thiện.
- `schemas/`: JSON Schema đầu ra v0.2 với cấu trúc điểm đồng nhất.
- `data/`: sáu bài kỹ thuật tự tạo, ảnh, dữ liệu ảnh và sổ đăng ký mẫu nghiên cứu rỗng.
- `src/`: kiểm tra cấu trúc/nghiệp vụ, ngữ cảnh, cache key, điểm tham khảo và chỉ số sai lệch; runner offline/live.
- `tests/`: kiểm tra có ca hợp lệ và ca từ chối đầu vào/kết quả sai.
- `results/`: bằng chứng kỹ thuật tuần 1. Không có điểm AI thật hay điểm giáo viên.
- `docs/`: yêu cầu, backlog, rủi ro, quyết định và kiểm kê nguồn.
- `reference/`: bản sao nguyên vẹn ZIP gốc để đối chiếu; không chỉnh sửa tài liệu nguồn.
- `frontend/`, `backend/`: hướng dẫn phạm vi triển khai các tuần sau, chưa có ứng dụng sản phẩm.
- `tools/build_assets.py`: tái tạo ảnh và dữ liệu; cần matplotlib nếu muốn chạy lại, không cần cho lệnh kiểm tra/API.

## Các quyết định cần hiểu

- Điểm theo từng task là điểm luyện tập tham khảo. Trung bình bốn tiêu chí và làm tròn half-up đến 0.5 là quy ước hiển thị của dự án, không phải tuyên bố quy trình chấm thi chính thức.
- Task 1 thiếu ảnh hoặc đọc ảnh không chắc thì chưa trả bộ điểm đầy đủ. Phản hồi hạn chế cần được phân biệt trên giao diện.
- Stage 2 không chứa trường điểm, chỉ tham chiếu mã đánh giá và phiên bản. Điểm giáo viên sẽ lưu độc lập trong backend tương lai.
- Bộ validator cục bộ chỉ hỗ trợ các từ khóa schema được dùng trong gói này; từ chối từ khóa lạ. Không quảng bá là trình kiểm tra JSON Schema đầy đủ. Khi tích hợp Node.js, thay bằng thư viện JSON Schema phù hợp và giữ kiểm tra nghiệp vụ.
- 24/72 chỉ báo là danh mục phân tích của dự án, chưa được chứng minh hiệu lực sư phạm. Giáo viên cần xem xét trước khi kết luận nghiên cứu.
- Điểm band, tính đúng đắn của gợi ý và khả năng chống prompt injection của mô hình chưa được xác minh qua kiểm tra cấu trúc cục bộ.

## Công nghệ và quản lý mã

Chọn React, TypeScript, Vite cho frontend đích; Node.js/Express và MongoDB chỉ là phương án backend **tương lai**, chưa triển khai. Python trong gói này là công cụ kiểm thử độc lập, không phải backend web thứ hai. Giữ số lớp công nghệ ở mức tối thiểu.

Đã khởi tạo lịch sử Git cục bộ khi bàn giao; chưa tạo/push repository bên ngoài. Sau giải nén, nếu chỉ có ZIP nguồn thì có thể khởi tạo lại Git. Nếu dùng file `source.bundle` đi kèm, dùng `git clone source.bundle ielts-writing-week01` để giữ commit đã bàn giao.

## Báo cáo các tuần sau

Mỗi quy trình hoàn thành sẽ có tài liệu Word nêu mục tiêu, công việc thực tế, đầu ra, bằng chứng, phần còn chờ và bước tiếp theo. Không ghi công việc dự kiến hoặc kết quả giả lập thành kết quả thực hiện. Yêu cầu này được lưu trong `docs/reporting-convention.md`.
#   D A T N _ T h u a n _ 2 2 5 1 2 2 0 0 4 7  
 #   D A T N _ T h u a n _ 2 2 5 1 2 2 0 0 4 7  
 #   D A T N _ T h u a n _ 2 2 5 1 2 2 0 0 4 7  
 
