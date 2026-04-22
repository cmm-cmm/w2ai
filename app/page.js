"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import LanguageSelector from "@/components/LanguageSelector";
import ContentOutput from "@/components/ContentOutput";
import { parseOllamaResponse } from "@/lib/parseResponse";

// Load TipTap editor client-side only (no SSR)
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

const CHAR_LIMIT = 3000;
const HISTORY_KEY = "w2ai_history";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Home() {
  const [sourceLang, setSourceLang] = useState("vietnamese");
  const [editorText, setEditorText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previousContent, setPreviousContent] = useState(null);
  const [streamProgress, setStreamProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const editorApiRef = useRef(null);
  const abortRef = useRef(null);

  // Derived counts
  const charCount = editorText.length;
  const wordCount = editorText.trim() ? editorText.trim().split(/\s+/).length : 0;
  const overLimit = charCount > CHAR_LIMIT;

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const saveHistory = (entry) => {
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 10);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleEditorChange = useCallback((text) => {
    setEditorText(text);
  }, []);

  const handleSuggest = async () => {
    if (!editorText.trim()) {
      setError("Vui lòng nhập nội dung trước khi gợi ý.");
      return;
    }

    // Abort any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Snapshot for undo
    const snapshot = editorText;
    setPreviousContent(snapshot);

    setSuggestLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editorText, sourceLang }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Lỗi ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        editorApiRef.current?.setContent(accumulated);
      }

      // Sync editorText so "Tạo nội dung" uses the improved version
      setEditorText(accumulated);
    } catch (err) {
      if (err.name === "AbortError") return;
      // Restore snapshot on error
      editorApiRef.current?.setContent(snapshot);
      setEditorText(snapshot);
      setPreviousContent(null);
      setError(err.message || "Đã xảy ra lỗi khi gợi ý nội dung.");
    } finally {
      setSuggestLoading(false);
      abortRef.current = null;
    }
  };

  const handleUndo = () => {
    if (previousContent === null) return;
    editorApiRef.current?.setContent(previousContent);
    setEditorText(previousContent);
    setPreviousContent(null);
  };

  const handleCreate = async () => {
    if (!editorText.trim()) {
      setError("Vui lòng nhập nội dung trước khi tạo.");
      return;
    }
    if (overLimit) {
      setError(`Nội dung vượt giới hạn ${CHAR_LIMIT.toLocaleString()} ký tự. Vui lòng rút ngắn bài viết.`);
      return;
    }

    // Abort any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setResult(null);
    setStreamProgress(0);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editorText, sourceLang }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Lỗi ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamProgress(accumulated.length);
      }

      const parsed = parseOllamaResponse(accumulated);
      setResult(parsed);

      // Save to history
      saveHistory({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        sourceLang,
        preview: editorText.slice(0, 120).trim(),
        result: parsed,
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setLoading(false);
      setStreamProgress(0);
      abortRef.current = null;
    }
  };

  const LANG_LABEL = { vietnamese: "🆻🇳 Tiếng Việt", english: "🇬🇧 English", japanese: "🇯🇵 日本語" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <img
            src="/favicon.ico"
            alt="W2AI logo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">
              W2AI Content Creator
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Tạo nội dung đa ngôn ngữ &amp; gợi ý SEO Tag với AI
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Lịch sử ({history.length})
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Powered by AI
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* History Panel */}
        {showHistory && history.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Lịch sử kết quả</h2>
              <button
                onClick={() => {
                  setHistory([]);
                  try { localStorage.removeItem(HISTORY_KEY); } catch {}
                  setShowHistory(false);
                }}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Xóa tất cả
              </button>
            </div>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-gray-400">{formatDate(entry.timestamp)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                        {LANG_LABEL[entry.sourceLang]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{entry.preview}…</p>
                  </div>
                  <button
                    onClick={() => { setResult(entry.result); setShowHistory(false); }}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors"
                  >
                    Tải lại
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Input Section */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">
              Nội dung nguồn
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Chọn ngôn ngữ, nhập hoặc dán nội dung vào editor bên dưới.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            <LanguageSelector value={sourceLang} onChange={setSourceLang} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nội dung bài viết
              </label>
              <Editor
                onEditorReady={(api) => { editorApiRef.current = api; }}
                onChange={handleEditorChange}
              />
              {/* Char / word count */}
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                <span className="text-xs text-gray-400">
                  {wordCount.toLocaleString()} từ · {charCount.toLocaleString()} ký tự
                </span>
                {charCount > 2500 && !overLimit && (
                  <span className="text-xs text-amber-600 font-medium">
                    Còn {(CHAR_LIMIT - charCount).toLocaleString()} ký tự
                  </span>
                )}
                {overLimit && (
                  <span className="text-xs text-red-600 font-medium">
                    Vượt {(charCount - CHAR_LIMIT).toLocaleString()} ký tự
                  </span>
                )}
              </div>
            </div>

            {/* Over-limit warning */}
            {overLimit && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>Nội dung vượt giới hạn {CHAR_LIMIT.toLocaleString()} ký tự. Vui lòng rút ngắn bài viết.</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 flex-wrap">
              {/* Undo button */}
              {previousContent !== null && !suggestLoading && (
                <button
                  onClick={handleUndo}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Hoàn tác gợi ý
                </button>
              )}

              {/* Suggest Button */}
              <button
                onClick={handleSuggest}
                disabled={loading || suggestLoading || overLimit}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
              >
                {suggestLoading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                      />
                    </svg>
                    Đang gợi ý...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    Gợi ý nội dung
                  </>
                )}
              </button>

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={loading || suggestLoading || overLimit}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
              >
                {loading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                      />
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Tạo nội dung
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Streaming progress state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                AI đang dịch nội dung...
              </p>
              {streamProgress > 0 ? (
                <p className="text-xs text-indigo-500 mt-1 font-medium tabular-nums">
                  {streamProgress.toLocaleString()} ký tự đã nhận
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Đang kết nối với AI Server...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Output Section */}
        {result && !loading && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Kết quả
              </h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* 3 language columns – stacked vertically */}
            <div className="flex flex-col gap-4">
              <ContentOutput lang="vietnamese" content={result.vietnamese} tags={result.tags?.vietnamese} metaDescription={result.metaDescription?.vietnamese} />
              <ContentOutput lang="english" content={result.english} tags={result.tags?.english} metaDescription={result.metaDescription?.english} />
              <ContentOutput lang="japanese" content={result.japanese} tags={result.tags?.japanese} metaDescription={result.metaDescription?.japanese} />
            </div>
          </section>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-gray-400">
        W2AI Content Creator · Nội dung được tạo bởi AI
      </footer>
    </div>
  );
}


