'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useCallback, useState, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/* ──────────────────────────────────────────────
   Minimal HTML ↔ Markdown conversions
   We store Markdown in Firestore / cross-post as Markdown.
   Tiptap works in HTML internally, so we:
     - load: md → simple HTML (for display)
     - save: HTML → md (for storage)
   This handles the common subset used in blog writing.
────────────────────────────────────────────── */

function mdToHtml(md: string): string {
  if (!md) return '';
  let html = md
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) => `<pre><code>${code.trim()}</code></pre>`)
    // Headings
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold / italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Block quotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines → <br>
    .replace(/\n/g, '<br>');

  // Wrap bare content that isn't a block element in <p>
  if (!html.startsWith('<')) html = `<p>${html}</p>`;
  return html;
}

function htmlToMd(html: string): string {
  if (!html) return '';
  return html
    // Code blocks
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (_m, code) => `\`\`\`\n${code.trim()}\n\`\`\``)
    // Headings
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
    // Bold / italic
    .replace(/<strong><em>(.*?)<\/em><\/strong>/gi, '***$1***')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    // Inline code
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Images
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    // List items
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    // Block quotes
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
    // Paragraphs
    .replace(/<\/p><p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '')
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const ToolbarButton = ({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`px-2 py-1 rounded font-mono text-[10px] transition-colors cursor-pointer disabled:opacity-30 ${
      active
        ? 'bg-ember text-ink'
        : 'text-[#aaa] hover:text-paper hover:bg-white/10'
    }`}
  >
    {children}
  </button>
);

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your article content here…',
  minHeight = 320,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'rounded bg-[#1a1714] p-4 font-mono text-xs overflow-x-auto' } },
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-ember/40 pl-4 text-[#aaa] italic my-4' } },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-ember underline cursor-pointer' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full my-4' } }),
    ],
    content: mdToHtml(value),
    editorProps: {
      attributes: {
        class: [
          'outline-none min-h-[var(--editor-min-h)] px-4 py-3 text-sm leading-relaxed text-paper',
          'prose prose-invert prose-sm max-w-none',
          '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-5',
          '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4',
          '[&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-3',
          '[&_p]:my-2',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2',
          '[&_li]:my-0.5',
          '[&_pre]:bg-[#1a1714] [&_pre]:rounded [&_pre]:p-4 [&_pre]:my-3',
          '[&_code]:bg-[#1a1714] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px] [&_code]:font-mono',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-ember/40 [&_blockquote]:pl-4 [&_blockquote]:text-[#aaa] [&_blockquote]:italic [&_blockquote]:my-3',
          '[&_a]:text-ember [&_a]:underline',
          '[&_strong]:font-semibold',
        ].join(' '),
      },
    },
    onUpdate({ editor: ed }) {
      const html = ed.getHTML();
      onChange(htmlToMd(html));
    },
  });

  // Sync external value changes (e.g. when editing an existing article)
  useEffect(() => {
    if (!editor) return;
    const currentMd = htmlToMd(editor.getHTML());
    if (currentMd !== value) {
      editor.commands.setContent(mdToHtml(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const [urlModal, setUrlModal] = useState<{
    isOpen: boolean;
    title: string;
    placeholder?: string;
    initialValue?: string;
    confirmLabel?: string;
    onConfirm: (val: string) => void;
  } | null>(null);

  const addLink = useCallback(() => {
    if (!editor) return;
    const prev = (editor.getAttributes('link').href as string | undefined) || 'https://';
    setUrlModal({
      isOpen: true,
      title: 'Insert Link',
      placeholder: 'https://example.com',
      initialValue: prev,
      confirmLabel: 'INSERT LINK',
      onConfirm: (url) => {
        setUrlModal(null);
        if (!url.trim()) {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
          editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
        }
      },
    });
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    setUrlModal({
      isOpen: true,
      title: 'Insert Image URL',
      placeholder: 'https://.../image.png',
      initialValue: '',
      confirmLabel: 'INSERT IMAGE',
      onConfirm: (url) => {
        setUrlModal(null);
        if (url.trim()) {
          editor.chain().focus().setImage({ src: url.trim(), alt: '' }).run();
        }
      },
    });
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className="rounded-xl border border-white/10 bg-[#181614] overflow-hidden focus-within:border-ember transition-colors"
      style={{ '--editor-min-h': `${minHeight}px` } as React.CSSProperties}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b border-white/10 bg-[#111110]">
        {/* Text style */}
        <ToolbarButton title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarButton>
        <ToolbarButton title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
        <ToolbarButton title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>

        <span className="w-px h-4 bg-white/15 mx-1" />

        <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolbarButton>
        <ToolbarButton title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>{`<>`}</ToolbarButton>

        <span className="w-px h-4 bg-white/15 mx-1" />

        <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolbarButton>
        <ToolbarButton title="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton>
        <ToolbarButton title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{ '```' }</ToolbarButton>
        <ToolbarButton title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>" Quote</ToolbarButton>

        <span className="w-px h-4 bg-white/15 mx-1" />

        <ToolbarButton title="Insert link" active={editor.isActive('link')} onClick={addLink}>🔗 Link</ToolbarButton>
        <ToolbarButton title="Insert image URL" onClick={addImage}>🖼 Img</ToolbarButton>

        <span className="w-px h-4 bg-white/15 mx-1" />

        <ToolbarButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</ToolbarButton>
        <ToolbarButton title="Hard break" onClick={() => editor.chain().focus().setHardBreak().run()}>↵ Br</ToolbarButton>

        <span className="flex-1" />

        <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>↩ Undo</ToolbarButton>
        <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>↪ Redo</ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {/* Custom URL prompt modal */}
      {urlModal && (
        <UrlPromptModal
          isOpen={urlModal.isOpen}
          title={urlModal.title}
          placeholder={urlModal.placeholder}
          initialValue={urlModal.initialValue}
          confirmLabel={urlModal.confirmLabel}
          onConfirm={urlModal.onConfirm}
          onCancel={() => setUrlModal(null)}
        />
      )}
    </div>
  );
}

function UrlPromptModal({
  isOpen,
  title,
  placeholder,
  initialValue = '',
  confirmLabel = 'INSERT',
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setVal(initialValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#141210] border border-white/15 p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-paper tracking-tight">{title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onConfirm(val);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl bg-[#181614] border border-white/15 text-xs text-paper focus:border-ember outline-none font-mono"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg border border-white/15 text-[#888] font-mono text-[9px] hover:text-paper hover:bg-white/5 cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => onConfirm(val)}
            className="px-3 py-1.5 rounded-lg bg-ember hover:bg-ember-soft text-ink font-mono text-[9px] font-bold shadow cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
