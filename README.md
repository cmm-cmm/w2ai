# W2AI Content Creator

Ứng dụng web hỗ trợ tạo nội dung bài viết đa ngôn ngữ (Việt – Anh – Nhật) và gợi ý SEO Tags tối ưu, được hỗ trợ bởi AI.

---

## Tính năng

- **Rich text editor** (TipTap) với toolbar: Bold, Italic, Heading, List, Blockquote
- **Chọn ngôn ngữ nguồn**: Tiếng Việt / English / 日本語
- **Tự động dịch** sang 3 ngôn ngữ còn lại bằng AI
- **Gợi ý SEO Tags** theo từng ngôn ngữ tương ứng
- **Copy nội dung** từng ngôn ngữ và từng nhóm tags với một cú nhấp
- Hiển thị kết quả theo bố cục dọc, rõ ràng từng ngôn ngữ

---

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Editor | TipTap 3 (StarterKit + Placeholder) |
| AI Backend | Ollama (local LLM server) |
| Ngôn ngữ | JavaScript (JSX) |

---

## Cấu trúc thư mục

```
.
├── app/
│   ├── api/
│   │   └── translate/
│   │       └── route.js        # API route – proxy đến Ollama
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.js
│   └── page.js                 # Trang chính
├── components/
│   ├── CopyButton.jsx          # Nút copy to clipboard
│   ├── ContentOutput.jsx       # Card hiển thị nội dung + tags từng ngôn ngữ
│   ├── Editor.jsx              # TipTap rich text editor
│   └── LanguageSelector.jsx    # Dropdown chọn ngôn ngữ nguồn
├── lib/
│   └── ollama.js               # Prompt builder + Ollama fetch helper
├── public/
├── next.config.mjs
└── package.json
```

---

## Yêu cầu môi trường

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Ollama** đang chạy và có thể truy cập từ máy chủ (mặc định `192.168.8.148:11434`)
- Model **gemma4:e2b** đã được pull vào Ollama

### Cài model Ollama

```bash
ollama pull gemma4:e2b
```

### Kiểm tra Ollama hoạt động

```bash
curl http://192.168.8.148:11434/api/tags
```

---

## Chạy ở môi trường Development

```bash
# 1. Cài dependencies
npm install

# 2. Chạy dev server
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

---

## Deploy lên Server (Production)

### Cách 1: Chạy trực tiếp với Node.js

```bash
# Clone và cài dependencies
git clone <repo-url> /var/www/w2ai
cd /var/www/w2ai
npm install --omit=dev

# Build production
npm run build

# Chạy ứng dụng (port 3000)
npm start

# Hoặc đổi port
PORT=8080 npm start
```

---

### Cách 2: Dùng PM2 (khuyến nghị cho production)

PM2 giữ ứng dụng chạy nền và tự restart khi bị lỗi.

```bash
# Cài PM2 toàn cục
npm install -g pm2

# Build
npm run build

# Khởi động với PM2
pm2 start npm --name "w2ai" -- start

# Tự start khi server reboot
pm2 save
pm2 startup
```

Các lệnh quản lý PM2:

```bash
pm2 status          # Xem trạng thái
pm2 logs w2ai       # Xem logs
pm2 restart w2ai    # Restart
pm2 stop w2ai       # Dừng
```

---

### Cách 3: Nginx reverse proxy (production với domain)

#### Cấu hình Nginx (`/etc/nginx/sites-available/w2ai`)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        # Tăng timeout vì AI có thể mất thời gian xử lý
        proxy_read_timeout 180s;
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
    }
}
```

```bash
# Kích hoạt config
ln -s /etc/nginx/sites-available/w2ai /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### Thêm SSL với Certbot

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

### Cách 4: Docker

Thêm vào `next.config.mjs` để bật standalone output:

```js
const nextConfig = {
  output: 'standalone',
};
```

#### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build và chạy
docker build -t w2ai .
docker run -d -p 3000:3000 --name w2ai w2ai
```

---

## Cấu hình Ollama

Địa chỉ và model Ollama được cấu hình trong `lib/ollama.js`:

```js
const OLLAMA_BASE = "http://192.168.8.148:11434";
const MODEL = "gemma4:e2b";
```

Chỉnh sửa file này nếu cần đổi địa chỉ IP hoặc model.

> **Lưu ý bảo mật**: Không expose Ollama API trực tiếp ra internet. Ứng dụng dùng Next.js API Route làm proxy phía server — client sẽ không trực tiếp biết địa chỉ Ollama.

### Cho phép Ollama nhận kết nối từ mạng nội bộ

Mặc định Ollama chỉ lắng nghe `127.0.0.1`. Để cho phép kết nối từ IP khác:

```bash
# Linux – đặt biến môi trường trước khi chạy ollama
OLLAMA_HOST=0.0.0.0 ollama serve

# Hoặc cấu hình systemd service
# /etc/systemd/system/ollama.service.d/override.conf
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
```

---

## Lưu ý khi deploy

| Vấn đề | Giải pháp |
|---|---|
| AI xử lý chậm (30–120s) | Tăng `proxy_read_timeout` trong Nginx lên ≥ 180s |
| Ollama từ chối kết nối | Đặt `OLLAMA_HOST=0.0.0.0` khi khởi động Ollama |
| Lỗi CORS từ Ollama | Không cần lo — request đi qua API Route server-side |
| Port 3000 bị chặn firewall | Dùng Nginx proxy hoặc mở port qua `ufw allow 3000` |
| Model không tìm thấy | Chạy `ollama pull gemma4:e2b` trên máy chủ Ollama |
