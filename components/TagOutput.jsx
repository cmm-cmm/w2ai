"use client";

import CopyButton from "./CopyButton";

const SECTIONS = [
  {
    key: "vietnamese",
    label: "🇻🇳 Tiếng Việt",
    bg: "bg-red-50",
    text: "text-red-700",
    pill: "bg-red-100 text-red-800 border-red-200",
  },
  {
    key: "english",
    label: "🇬🇧 English",
    bg: "bg-blue-50",
    text: "text-blue-700",
    pill: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    key: "japanese",
    label: "🇯🇵 日本語",
    bg: "bg-purple-50",
    text: "text-purple-700",
    pill: "bg-purple-100 text-purple-800 border-purple-200",
  },
];

export default function TagOutput({ tags }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 bg-amber-50 border-b border-amber-100">
        <span className="font-semibold text-sm text-amber-700">🏷️ SEO Tags</span>
      </div>

      {/* 3 language sections */}
      <div className="divide-y divide-gray-100">
        {SECTIONS.map(({ key, label, bg, text, pill }) => {
          const list = tags?.[key] ?? [];
          const csv = list.join(", ");
          return (
            <div key={key}>
              {/* Sub-header */}
              <div className={`flex items-center justify-between px-4 py-2 ${bg}`}>
                <span className={`text-xs font-semibold ${text}`}>{label}</span>
                <CopyButton getText={() => csv} />
              </div>
              {/* Pills */}
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {list.length > 0 ? (
                  list.map((tag, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${pill}`}
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">Không có tag</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
