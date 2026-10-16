## Cập nhật Tuần 3 ngày 14/10/2026

Trang chính dùng backend thật: `/login`, `/register` và `/<role>/dashboard`. Vite proxy `/api/v1` tới port 3000. Demo cũ giữ tại `/demo`, dùng localStorage độc lập. Xem [hướng dẫn cấu hình](../../docs/week3-deployment.md). Phần dưới mô tả demo trước tích hợp auth.

# Frontend React cho IELTS Writing Coach

Ứng dụng React + TypeScript + Vite + CSS đã chuyển các màn hình luyện viết, lịch sử, tiến độ, giáo viên và quản trị từ demo. Đây chỉ là frontend, dùng localStorage và phản hồi mô phỏng; không có backend, đăng nhập thật, API AI hoặc band score.

## Chạy ứng dụng

Đã kiểm tra với Node.js 24.14.1 và npm 11.11.0. Dùng Node.js 24 để tái lập môi trường này. Yêu cầu nền tảng Vite xem tại [hướng dẫn chính thức](https://vite.dev/guide/).

Từ thư mục gốc dự án:

```powershell
cd frontend/react
npm ci
npm run dev
```

Mở địa chỉ Vite in trong terminal (thường là `http://127.0.0.1:5173`). `package-lock.json` cố định các phiên bản đã cài. Dev server chỉ bind loopback.

```powershell
npm run type-check
npm test
npm run build
npm run preview
```

Build tạo `dist/`, gồm HTML, CSS, JavaScript và ba ảnh Task 1 lấy từ `data/images/`. Không cần sao chép ảnh thủ công. `base: './'` cho phép phục vụ build trong thư mục con bằng máy chủ tĩnh. Các URL ảnh giáo viên tự nhập vẫn phụ thuộc nguồn ảnh đó; ảnh lỗi được thông báo, không coi là đánh giá đầy đủ.

## Demo cũ và dữ liệu đã lưu

Các tệp `../index.html`, `../app.mjs`, `../styles.css`, `../store.mjs`, `../mock-ai.mjs` và `../tests.mjs` được giữ nguyên. Chạy từ gốc dự án:

```powershell
py -m http.server 8080 --bind 127.0.0.1
node --test frontend/tests.mjs
```

- Demo cũ: `http://localhost:8080/frontend/`.
- React sau khi build: `http://localhost:8080/frontend/react/dist/`.

**Muốn đọc dữ liệu cũ, dùng cùng trình duyệt, giao thức, hostname và cổng đã dùng cho demo.** `localhost` khác `127.0.0.1`; cổng 8080 khác 5173. Nếu trước đây dùng `localhost:8080`, hai đường dẫn trên dùng chung localStorage. Không có đồng bộ giữa các origin hoặc thiết bị. Đóng tab demo cũ khi dùng React để tránh ghi đè từ demo cũ.

Khóa dữ liệu giữ nguyên: `ielts-writing-coach-demo-v1`. Trước lần ghi đầu tiên với dữ liệu có sẵn, React giữ bản sao nguyên văn trong khóa `ielts-writing-coach-demo-v1-before-react`. Không thay đổi đề hoặc ảnh mẫu. Trường mới `revisionDrafts` tách nháp sửa từng bài khỏi `drafts` theo đề; `titleSnapshot` chỉ được thêm cho bài mới. Bài cũ vẫn giữ snapshot đề và ảnh đã có, tên bài cũ lấy từ ngân hàng đề vì demo chưa lưu snapshot tên.

Nếu dữ liệu lỗi, ứng dụng báo lỗi và không ghi đè dữ liệu gốc. Nếu lưu thất bại, nội dung vẫn còn trong phiên đang mở; sao chép nội dung trước khi tải lại hoặc đóng trang. Khi phát hiện tab khác thay đổi dữ liệu, React dừng ghi và yêu cầu tải lại sau khi sao chép bài. Đây không phải cơ chế đồng bộ đa người dùng.

## Cấu trúc và điểm thay thế sau này

- `src/App.tsx`, `src/context.ts`: khung trang, trạng thái React và thông báo lưu trữ.
- `src/pages/Practice.tsx`: chọn đề, nháp, nộp, xem bản đã nộp, phản hồi, hội thoại.
- `src/pages/History.tsx`: lịch sử và số bài/lần sửa, không thống kê band hoặc lỗi giả.
- `src/pages/Management.tsx`: đề, nhận xét theo phiên bản và dữ liệu người dùng demo.
- `src/components.tsx`: thành phần dùng chung và ánh xạ ba ảnh mẫu cho Vite.
- `src/services.ts`: giao diện `Repository`, localStorage và các thao tác dữ liệu. Chưa triển khai adapter HTTP.
- `src/types.ts`: kiểu dữ liệu dùng chung.
- `../store.d.mts`, `../mock-ai.d.mts`: kiểu TypeScript cho module demo đang dùng lại. Logic module JavaScript vẫn được bảo toàn và kiểm thử, không phải toàn bộ lớp dữ liệu đã viết lại bằng TypeScript.
- `src/*.test.ts*`: kiểm thử dữ liệu và tương tác React trong jsdom.

## Nghiệm thu thủ công còn lại

Build, type-check và kiểm thử tự động đã chạy; chưa kiểm tra trực quan do phiên làm việc không có trình duyệt kết nối. jsdom không xác nhận kích thước hay bố cục thật.

1. Desktop 1440px và điện thoại 390px: xem đủ 5 màn hình, kiểm tra không tràn ngang; vùng viết và phản hồi đặt cạnh nhau trên desktop, xếp dọc trên điện thoại.
2. Dùng Tab/Shift+Tab và Enter để chọn đề, viết, nộp, chọn phiên bản và gửi câu hỏi; kiểm tra focus nhìn thấy.
3. Mở đủ ba ảnh Task 1. Thử URL ảnh hỏng và đề Task 1 thiếu ảnh.
4. Nộp bài, hỏi ở bản 1, sửa thành bản 2, trở về bản 1 để đối chiếu nội dung, phản hồi và thread. Giáo viên nhận xét riêng từng bản.
5. Sau khi build, mở demo và React cùng origin để xác nhận nháp/lịch sử cũ; không thao tác đồng thời trên hai tab.

Chưa đóng nghiệm thu trực quan hoặc tuyên bố hoàn tất một tuần của đồ án. Báo cáo Word hoàn thành quy trình tuần cần được lập sau khi chốt nghiệm thu theo `../../docs/reporting-convention.md`.
