# MVP Di sản AR/PWA

## 1. Giới thiệu
Dự án trình bày một sản phẩm MVP giới thiệu tuyến điểm di sản nghĩa binh thông qua bốn module chính: AR marker-based (kèm QR fallback), bảo tàng ảo, bản đồ tương tác và dòng thời gian tương tác. Toàn bộ giải pháp là static/PWA-friendly, có thể triển khai nhanh trên Netlify, Vercel hoặc GitHub Pages.

## 2. Kiến trúc & Công nghệ
- **Frontend**: HTML5, CSS3, ES Modules (vanilla). Font Inter (tiêu đề) và Noto Serif (nội dung) từ Google Fonts.
- **AR**: A-Frame 1.5.0 + AR.js (marker-based), `<model-viewer>` (QR fallback, Quick Look/Scene Viewer), mẫu mô hình GLB dùng CDN.
- **Virtual Museum**: Gallery + lightbox tự viết, `<model-viewer>` cho khu trưng bày 3D, autoplay tour.
- **Map**: Leaflet 1.9.x với lớp nền kép (hiện đại & lịch sử) và animation tuyến hành trình.
- **Timeline**: vis-timeline 7.x, đồng bộ với bản đồ và bảo tàng.
- **Dữ liệu**: JSON thuần trong thư mục `data/`, nạp bằng `fetch`. Toàn bộ nội dung text chi tiết nằm ở `content.md` để dễ cập nhật.
- **Triển khai**: Static hosting (Netlify/Vercel/GitHub Pages). HTTPS bắt buộc cho WebAR.

### Luồng dữ liệu
1. `main.js` nạp `data/*.json` -> dựng UI (gallery, bản đồ, timeline, AR fallback list).
2. Khi người dùng tương tác marker/timeline -> mở modal chi tiết, phát audio (nếu có) và điều hướng bản đồ.
3. QR fallback sử dụng `model-viewer` ở chế độ AR (Scene Viewer/Quick Look) cho từng marker.

## 3. Cấu trúc thư mục
```
project-root/
├─ assets/
│  ├─ audio/                 # Wav mô phỏng 5 giây sinh từ `scripts/generate-audio.ps1`
│  ├─ images/                # Bộ SVG placeholder (>=1200px) theo đúng tỉ lệ nội dung
│  ├─ models/                # Tham chiếu GLB qua CDN modelviewer.dev (không cần file cục bộ)
│  └─ markers/               # Marker `.patt` và QR `.svg` mô phỏng để test AR.js
├─ data/
│  ├─ points.json
│  ├─ timeline.json
│  ├─ museum.json
│  └─ ar_markers.json
├─ src/
│  ├─ css/styles.css
│  └─ js/main.js
├─ scripts/
│  └─ deploy-netlify.ps1
├─ content.md
├─ index.html
├─ netlify.toml
└─ README.md
```

## 4. Định dạng dữ liệu & API nội bộ
- `points.json`: điểm bản đồ (Leaflet) + liên kết tới museum item/AR.
- `timeline.json`: mốc thời gian, liên kết `mapPointId`.
- `museum.json`: hiện vật, metadata, media liên quan.
- `ar_markers.json`: thông tin marker pattern, fallback QR, mô hình, scale/position.
- API giả lập: nếu dùng Firestore/Firebase sau này, mỗi file JSON tương ứng với collection `points`, `timeline`, `museum`, `markers` với schema giống nhau.

## 5. Nội dung & bản quyền
Toàn bộ mô tả lịch sử, thuyết minh audio, caption ảnh nằm trong `content.md`. Các placeholder (audio WAV, ảnh SVG, marker `.patt`) đều do nhóm tự tạo và phát hành dưới CC0 để demo. Khi có tư liệu thực tế, thay thế nội dung và cập nhật giấy phép tương ứng.

## 6. Hướng dẫn chạy local
```bash
# Cài http-server (nếu chưa có)
npm install -g http-server

# Chạy (không cache, cổng 8080)
http-server -c-1 . -p 8080
```
*Lưu ý*: cần HTTPS khi test WebAR trên thiết bị di động. Có thể dùng `http-server --ssl` (kèm chứng chỉ tự ký) hoặc dùng ngrok để tạo đường dẫn https tạm.

## 7. Triển khai
### Netlify
1. Push code lên GitHub.
2. Kết nối repo với Netlify, chọn build command rỗng, publish directory `.`.
3. Đặt biến môi trường nếu cần. File `netlify.toml` đã cấu hình cache/headers.
4. Dùng script `scripts/deploy-netlify.ps1` (yêu cầu cài Netlify CLI) để deploy thủ công.

### Vercel
1. `vercel init` (static).
2. Cấu hình `vercel.json` (nếu cần) với headers tương tự.
3. Đảm bảo bật HTTPS mặc định.

### GitHub Pages
1. Push code vào nhánh `main`.
2. Bật Pages cho thư mục root.
3. Đảm bảo sử dụng custom domain HTTPS hoặc dùng `https://<user>.github.io` (mặc định HTTPS).

## 8. Timeline triển khai (gợi ý 6 tuần)
| Giai đoạn | Tuần | Hạng mục |
|-----------|------|----------|
| Nghiên cứu | 1 | Thu thập tư liệu, chụp/scan marker, xác định toạ độ |
| Thiết kế & Prototype | 2 | Thiết kế UI, wireframe, kiểm thử AR mẫu |
| Phát triển cốt lõi | 3-4 | Code AR, museum, map, timeline, tích hợp JSON |
| Tối ưu & Nội dung | 5 | Hiệu năng, accessibility, nhập nội dung thật |
| QA & Triển khai | 6 | Test đa thiết bị, chạy checklist, deploy production |

## 9. Ngân sách & Thiết bị (ước tính)
- Thiết bị test: 1 Android (Pixel 6 ~15tr), 1 iPhone (iPhone 13 ~18tr), 1 laptop cấu hình trung bình.
- In marker: giấy dày A4 + in màu (100k/bộ test).
- Phần mềm: mã nguồn mở (0đ), domain + CDN (~1.5tr/năm nếu cần).
- Dịch vụ lưu trữ 3D (Sketchfab premium nếu muốn ẩn mô hình) ~2tr/năm (tùy chọn).

## 10. Hướng dẫn tạo marker (.patt)
1. Chuẩn bị ảnh bia (crop 800x800 px, độ tương phản cao).
2. Truy cập: https://jeromeetienne.github.io/AR.js/three.js/examples/marker-training/examples/generator.html
3. Tải ảnh lên, đặt tên marker (vd: `nguyen_duc_ung`).
4. Tải file `.patt`, lưu vào `assets/markers/`.
5. In marker kích thước 10×10 cm trên nền sáng, cán phẳng.
6. Khi test: giữ camera cách 40–80 cm, ánh sáng đều.

Nếu muốn dùng Adobe Aero/8thWall: upload ảnh marker độ phân giải cao đang lưu trong `assets/images/`, thiết lập tracking rồi xuất link Quick Look.

## 11. Hiệu năng & Bảo mật
- Ngân sách tải trang đầu < **1.2 MB** (HTML+CSS+JS). Media tải lười (lazy load) khi mở modal.
- Ảnh <=500 KB (ưu tiên WebP), audio mp3 mono 64 kbps <=1 MB, mô hình GLB <=10 MB (max 20 MB).
- Bật Gzip/Brotli (Netlify mặc định), headers cache dài cho assets tĩnh.
- Dùng HTTPS tuyệt đối (WebAR cần secure context).
- Kiểm tra Content Security Policy khi cần (có thể bổ sung trong `netlify.toml`).

## 12. QA/Accessibility/SEO Checklist
Xem chi tiết ở cuối README và trong `main.js` (logic focus). Các mục chính:
- Alt text đầy đủ, transcript audio (`content.md`).
- Navigation bằng bàn phím, modal trap focus.
- Test AR trên Android Chrome + iOS Safari (marker + QR fallback).
- Map hiển thị markers, popup, animation hành trình.
- Timeline zoom/scroll mượt, click đồng bộ map/museum.
- Lighthouse Desktop >=85, Mobile >=60.
- Meta tags SEO + JSON-LD (WebSite, Place, CreativeWork).

## 13. Các hạng mục cần cập nhật khi có dữ liệu gốc
- Thay thế placeholder WAV/SVG/GLB bằng tư liệu số hoá chính thức và cập nhật metadata cấp phép.
- Hiệu chỉnh lại toạ độ thực địa (bộ hiện tại dựa trên tọa độ tham chiếu Đà Nẵng).
- Bổ sung transcript đầy đủ cho phỏng vấn mới và đính kèm chữ ký xác nhận nguồn.
- Kiểm thử marker trên các thiết bị mục tiêu, điều chỉnh `scale/position` trong `ar_markers.json` để bám sát kích thước mô hình thật.

## 14. QA Checklist & Test Cases (tóm tắt)
1. **AR**: Marker nhận diện trong <2s, mô hình hiển thị ổn định, nút audio hoạt động.
2. **QR fallback**: Quét QR mở `model-viewer` ở chế độ AR (Android Scene Viewer, iOS Quick Look).
3. **Map**: Tất cả markers render, popup chứa ảnh/audio, toggle lớp hoạt động.
4. **Timeline**: Scroll, zoom, chọn mốc -> mở modal + pan map.
5. **Museum**: Gallery responsive, lightbox keyboard accessible, tour tự động có nút tạm dừng.
6. **Hiệu năng**: LCP <3s (mobile 4G), bundle JS <300 KB gz.
7. **SEO**: Meta og/twitter, JSON-LD hợp lệ (test Structured Data).
8. **Security**: Chỉ chạy qua HTTPS, không mixed-content.

## 15. Tài liệu tham khảo
- AR.js & A-Frame docs
- `<model-viewer>`: https://modelviewer.dev/
- Leaflet: https://leafletjs.com/
- vis-timeline: https://visjs.github.io/vis-timeline/
