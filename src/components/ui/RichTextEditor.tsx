"use client";
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] text-ink font-body p-3',
      },
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-col w-full border border-line rounded-lg bg-white overflow-hidden focus-within:border-berry transition-colors">
      <div className="flex items-center gap-1 border-b border-line bg-paperDim/50 p-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded text-slate hover:text-ink hover:bg-paperDim ${editor.isActive('bold') ? 'bg-paperDim text-ink font-bold' : ''}`}
          type="button"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded text-slate hover:text-ink hover:bg-paperDim ${editor.isActive('italic') ? 'bg-paperDim text-ink' : ''}`}
          type="button"
        >
          <Italic size={14} />
        </button>
        <div className="w-px h-4 bg-line mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded text-slate hover:text-ink hover:bg-paperDim ${editor.isActive('bulletList') ? 'bg-paperDim text-ink' : ''}`}
          type="button"
        >
          <List size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded text-slate hover:text-ink hover:bg-paperDim ${editor.isActive('orderedList') ? 'bg-paperDim text-ink' : ''}`}
          type="button"
        >
          <ListOrdered size={14} />
        </button>
        <div className="w-px h-4 bg-line mx-1" />
        <button
          onClick={setLink}
          className={`p-1.5 rounded text-slate hover:text-ink hover:bg-paperDim ${editor.isActive('link') ? 'bg-paperDim text-ink' : ''}`}
          type="button"
        >
          <LinkIcon size={14} />
        </button>
      </div>
      <EditorContent editor={editor} className="flex-1 max-h-48 overflow-y-auto" />
    </div>
  );
}