import "./globals.css";

export const metadata = {
  title: "W2AI Content Creator",
  description: "Tạo nội dung đa ngôn ngữ Việt, Anh, Nhật và gợi ý SEO Tags với AI (Ollama)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
