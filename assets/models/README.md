# Tệp mô hình 3D mô phỏng

Dự án sử dụng các mô hình mẫu do Google cung cấp tại trang [modelviewer.dev](https://modelviewer.dev) nhằm mục đích demo nhanh. Các đường dẫn đã cấu hình trong mã:

- `https://modelviewer.dev/shared-assets/models/Astronaut.glb`
- `https://modelviewer.dev/shared-assets/models/RobotExpressive.glb`
- `https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb`

Các file này đều phát hành theo giấy phép CC BY 4.0. Khi có mô hình số hóa thực tế (.glb) với dung lượng < 20 MB, hãy đặt vào thư mục này và cập nhật lại:

1. `data/museum.json` trường `model`.
2. `data/points.json` và `data/ar_markers.json` nếu AR cần bám sát mô hình mới.
3. Đảm bảo tối ưu ( Draco / Meshopt ) để tải nhanh trên thiết bị di động.
