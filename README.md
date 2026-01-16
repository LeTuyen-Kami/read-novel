# Đọc Truyện - Text-to-Speech Novel Reader

Ứng dụng web đọc truyện với tính năng text-to-speech, hỗ trợ đọc truyện tiếng Việt bằng giọng nói của trình duyệt.

## Tính năng

- 📚 Quản lý thư viện truyện (import từ JSON)
- 🔊 Text-to-speech với giọng nói tiếng Việt
- ⚙️ Tùy chỉnh tốc độ đọc, độ cao giọng
- ⏰ Hẹn giờ tắt theo thời gian hoặc số chương
- 📱 Responsive design, tối ưu cho mobile
- 💾 Lưu tiến độ đọc tự động (IndexedDB + localStorage)
- 🔄 Điều hướng giữa các chương và đoạn văn

## Công nghệ

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router DOM
- IndexedDB (cho dữ liệu lớn)
- Web Speech Synthesis API

## Cài đặt và chạy

```bash
# Cài đặt dependencies
bun install

# Chạy development server
bun run dev

# Build cho production
bun run build

# Preview build
bun run preview
```

## Deploy lên GitHub Pages

### Bước 1: Tạo repository trên GitHub

1. Tạo một repository mới trên GitHub
2. Đảm bảo branch chính là `main`

### Bước 2: Push code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Bước 3: Bật GitHub Pages

1. Vào Settings của repository
2. Vào phần Pages
3. Chọn Source: "GitHub Actions"
4. Workflow sẽ tự động chạy khi bạn push code lên branch `main`

### Bước 4: Cấu hình base path (nếu cần)

Nếu repository của bạn không phải là root (ví dụ: `username.github.io/repo-name`), workflow đã tự động cấu hình base path. Nếu bạn muốn deploy ở root domain (`username.github.io`), bạn cần:

1. Đổi tên repository thành `username.github.io`
2. Cập nhật `vite.config.ts` để `base: '/'`

## Cấu trúc file JSON import

```json
{
  "id": "novel-id",
  "title": "Tên truyện",
  "author": "Tác giả",
  "description": "Mô tả truyện",
  "chapters": [
    {
      "id": "ch1",
      "title": "Chương 1: Tên chương",
      "content": "Nội dung chương..."
    }
  ]
}
```

## Lưu ý

- Ứng dụng sử dụng IndexedDB để lưu trữ dữ liệu lớn (vượt quá giới hạn localStorage)
- Tiến độ đọc được lưu tự động khi scroll
- Giọng nói phụ thuộc vào trình duyệt và hệ điều hành
- Safari có thể cần thời gian để load đầy đủ giọng nói

## License

MIT
# read-novel
