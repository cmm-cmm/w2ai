"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const btn = (action, label, isActive) => (
    <button
      type="button"
      onClick={action}
      className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
        isActive
          ? "bg-indigo-600 text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50">
      {btn(
        () => editor.chain().focus().toggleBold().run(),
        <strong>B</strong>,
        editor.isActive("bold")
      )}
      {btn(
        () => editor.chain().focus().toggleItalic().run(),
        <em>I</em>,
        editor.isActive("italic")
      )}
      {btn(
        () => editor.chain().focus().toggleStrike().run(),
        <span className="line-through">S</span>,
        editor.isActive("strike")
      )}
      <div className="w-px bg-gray-300 mx-1 self-stretch" />
      {btn(
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        "H1",
        editor.isActive("heading", { level: 1 })
      )}
      {btn(
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        "H2",
        editor.isActive("heading", { level: 2 })
      )}
      {btn(
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        "H3",
        editor.isActive("heading", { level: 3 })
      )}
      <div className="w-px bg-gray-300 mx-1 self-stretch" />
      {btn(
        () => editor.chain().focus().toggleBulletList().run(),
        "• List",
        editor.isActive("bulletList")
      )}
      {btn(
        () => editor.chain().focus().toggleOrderedList().run(),
        "1. List",
        editor.isActive("orderedList")
      )}
      <div className="w-px bg-gray-300 mx-1 self-stretch" />
      {btn(
        () => editor.chain().focus().toggleBlockquote().run(),
        '❝',
        editor.isActive("blockquote")
      )}
      {btn(
        () => editor.chain().focus().setHorizontalRule().run(),
        "—",
        false
      )}
    </div>
  );
};

export default function Editor({ onChange, onEditorReady }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Nhập nội dung bài viết tại đây...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[220px] px-4 py-3 focus:outline-none text-gray-900",
      },
    },
    onUpdate({ editor }) {
      // Send plain text for the AI prompt
      if (onChange) {
        onChange(editor.getText());
      }
    },
  });

  // Expose setContent to parent via callback when editor is ready
  useEffect(() => {
    if (!editor || !onEditorReady) return;
    onEditorReady({
      setContent: (text) => {
        if (!editor) return;
        const html =
          text
            .split(/\n\n+/)
            .filter(Boolean)
            .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
            .join("") || "<p></p>";
        editor.commands.setContent(html, false);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  return (
    <div className="rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
