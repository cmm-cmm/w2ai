"use client";

const LANGUAGES = [
  { value: "vietnamese", label: "🇻🇳 Tiếng Việt" },
  { value: "english", label: "🇬🇧 English" },
  { value: "japanese", label: "🇯🇵 日本語" },
];

export default function LanguageSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        Ngôn ngữ đầu vào
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full sm:w-56 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
