"use client";

import CopyButton from "./CopyButton";

const FLAG = {
  vietnamese: "🇻🇳",
  english: "🇬🇧",
  japanese: "🇯🇵",
};

const LABEL = {
  vietnamese: "Tiếng Việt",
  english: "English",
  japanese: "日本語",
};

const STYLE = {
  vietnamese: {
    border: "border-red-200",
    headerBg: "bg-red-50",
    headerText: "text-red-700",
    tagBg: "bg-red-50",
    tagBorder: "border-red-100",
    tagLabel: "text-red-600",
    pill: "bg-red-100 text-red-800 border border-red-200",
  },
  english: {
    border: "border-blue-200",
    headerBg: "bg-blue-50",
    headerText: "text-blue-700",
    tagBg: "bg-blue-50",
    tagBorder: "border-blue-100",
    tagLabel: "text-blue-600",
    pill: "bg-blue-100 text-blue-800 border border-blue-200",
  },
  japanese: {
    border: "border-purple-200",
    headerBg: "bg-purple-50",
    headerText: "text-purple-700",
    tagBg: "bg-purple-50",
    tagBorder: "border-purple-100",
    tagLabel: "text-purple-600",
    pill: "bg-purple-100 text-purple-800 border border-purple-200",
  },
};

export default function ContentOutput({ lang, content, tags, metaDescription }) {
  const s = STYLE[lang];
  const tagList = tags ?? [];
  const tagsCsv = tagList.join(", ");

  return (
    <div className={`flex flex-col rounded-xl border ${s.border} bg-white shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${s.headerBg}`}>
        <span className={`font-semibold text-sm ${s.headerText}`}>
          {FLAG[lang]} {LABEL[lang]}
        </span>
        <CopyButton getText={() => content} />
      </div>

      {/* Content area – read-only */}
      <textarea
        readOnly
        value={content}
        rows={10}
        className="flex-1 resize-none px-4 py-3 text-sm text-gray-800 bg-gray-50 focus:outline-none leading-relaxed font-sans"
        aria-label={`Nội dung ${LABEL[lang]}`}
      />

      {/* Meta Description */}
      {metaDescription && (
        <div className={`border-t ${s.tagBorder} ${s.tagBg} px-4 py-3`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold ${s.tagLabel}`}>Meta Description</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 tabular-nums">{metaDescription.length} ký tự</span>
              <CopyButton getText={() => metaDescription} />
            </div>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">{metaDescription}</p>
        </div>
      )}

      {/* Tags section */}
      {tagList.length > 0 && (
        <div className={`border-t ${s.tagBorder} ${s.tagBg} px-4 py-3`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${s.tagLabel}`}>
              🏷️ SEO Tags
            </span>
            <CopyButton getText={() => tagsCsv} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tagList.map((tag, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.pill}`}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

