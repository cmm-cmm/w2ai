# W2AI Content Creator

A web application for creating multilingual article content (Vietnamese, English, Japanese) with optimized SEO tag suggestions, powered by AI.

---

## Features

- **Rich text editor** (TipTap) with toolbar: Bold, Italic, Heading, List, Blockquote
- **Source language selector**: Vietnamese / English / Japanese
- **Automatic translation** to the remaining three languages using AI
- **SEO tag suggestions** for each language
- **Copy content** for each language and each tag group with one click
- Displays results in a clear vertical layout by language

---

## Tech Stack

| Component | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Editor | TipTap 3 (StarterKit + Placeholder) |
| AI Backend | Ollama (local LLM server) |
| Language | JavaScript (JSX) |

---

## Project Structure

```
.
├── app/
│   ├── api/
│   │   └── translate/
│   │       └── route.js        # API route – proxy to Ollama
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.js
│   └── page.js                 # Main page
├── components/
│   ├── CopyButton.jsx          # Clipboard copy button
│   ├── ContentOutput.jsx       # Display card for content + tags per language
│   ├── Editor.jsx              # TipTap rich text editor
│   └── LanguageSelector.jsx    # Source language dropdown
├── lib/
│   └── ollama.js               # Prompt builder + Ollama fetch helper
├── public/
├── next.config.mjs
└── package.json
```

---

## Environment Requirements

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Ollama** running and reachable from the server (default `192.168.8.148:11434`)
- The **gemma4:e2b** model must be pulled into Ollama

### Pull the Ollama model

```bash
ollama pull gemma4:e2b
```

### Check that Ollama is working

```bash
curl http://192.168.8.148:11434/api/tags
```

---

## Run in Development

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

Open your browser at [http://localhost:3000](http://localhost:3000).

---

## Deploy to Server (Production)

### Option 1: Run directly with Node.js

```bash
# Clone and install dependencies
git clone <repo-url> /var/www/w2ai
cd /var/www/w2ai
npm install --omit=dev

# Build for production
npm run build

# Start the app (port 3000)
npm start

# Or change the port
PORT=8080 npm start
```

---

### Option 2: Use PM2 (recommended for production)

PM2 keeps the app running in the background and restarts it automatically if it crashes.

```bash
# Install PM2 globally
npm install -g pm2

# Build
npm run build

# Start with PM2
pm2 start npm --name "w2ai" -- start

# Enable auto-start on reboot
pm2 save
pm2 startup
```

PM2 management commands:

```bash
pm2 status          # View status
pm2 logs w2ai       # View logs
pm2 restart w2ai    # Restart
pm2 stop w2ai       # Stop
```

---

### Option 3: Nginx reverse proxy (production with domain)

#### Nginx configuration (`/etc/nginx/sites-available/w2ai`)

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
        # Increase timeout because AI may take time to process
        proxy_read_timeout 180s;
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
    }
}
```

```bash
# Enable config
ln -s /etc/nginx/sites-available/w2ai /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### Add SSL with Certbot

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

### Option 4: Docker

Add this to `next.config.mjs` to enable standalone output:

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
# Build and run
docker build -t w2ai .
docker run -d -p 3000:3000 --name w2ai w2ai
```

---

## Ollama Configuration

The Ollama address and model are configured in `lib/ollama.js`:

```js
const OLLAMA_BASE = "http://192.168.8.148:11434";
const MODEL = "gemma4:e2b";
```

Edit this file if you need to change the IP address or model.

> **Security note**: Do not expose the Ollama API directly to the internet. The app uses a Next.js API route as a server-side proxy so the client does not directly see the Ollama endpoint.

### Allow Ollama to accept connections from the local network

By default, Ollama listens only on `127.0.0.1`. To allow connections from other IPs:

```bash
# Linux – set environment variable before running ollama
OLLAMA_HOST=0.0.0.0 ollama serve

# Or configure the systemd service
# /etc/systemd/system/ollama.service.d/override.conf
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
```

---

## Deployment Notes

| Issue | Solution |
|---|---|
| AI processing is slow (30–120s) | Increase `proxy_read_timeout` in Nginx to ≥ 180s |
| Ollama refuses connections | Set `OLLAMA_HOST=0.0.0.0` when starting Ollama |
| CORS errors from Ollama | No action needed — requests go through the server-side API route |
| Port 3000 blocked by firewall | Use Nginx proxy or open the port with `ufw allow 3000` |
| Model not found | Run `ollama pull gemma4:e2b` on the Ollama server |
