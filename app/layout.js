import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata = {
  title: "W2AI Content Creator",
  description: "Tạo nội dung đa ngôn ngữ Việt, Anh, Nhật và gợi ý SEO Tags với AI (Ollama)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
